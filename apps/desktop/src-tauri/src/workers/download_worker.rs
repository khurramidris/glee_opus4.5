use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::io::AsyncWriteExt;
use tokio::sync::{mpsc, Notify};
use tauri::{AppHandle, Emitter};
use futures::StreamExt;

use crate::entities::*;
use crate::repositories::*;
use crate::state::{AppState, DownloadMessage};
use crate::error::AppError;

/// Heartbeat interval in seconds
const HEARTBEAT_INTERVAL_SECS: u64 = 5;
/// Consider a download stale if no heartbeat for this many seconds
const STALE_THRESHOLD_SECS: i64 = 30;

pub async fn run(
    state: AppState,
    app_handle: AppHandle,
    mut rx: mpsc::Receiver<DownloadMessage>,
    shutdown: Arc<Notify>,
) {
    tracing::info!("Download worker started");
    
    // Check for stale downloads on startup
    check_stale_downloads(&state).await;
    
    // Track active download for cancellation
    let cancel_flag = Arc::new(AtomicBool::new(false));
    
    loop {
        tokio::select! {
            biased;
            
            // Check shutdown signal
            _ = shutdown.notified() => {
                tracing::info!("Download worker received shutdown signal");
                cancel_flag.store(true, Ordering::SeqCst);
                break;
            }
            
            msg = rx.recv() => {
                match msg {
                    Some(DownloadMessage::Start { id }) => {
                        cancel_flag.store(false, Ordering::SeqCst);
                        let s = state.clone();
                        let h = app_handle.clone();
                        let flag = cancel_flag.clone();
                        tokio::spawn(async move {
                            process_download(s, h, id, flag).await;
                        });
                    }
                    Some(DownloadMessage::Resume { id }) => {
                        cancel_flag.store(false, Ordering::SeqCst);
                        let s = state.clone();
                        let h = app_handle.clone();
                        let flag = cancel_flag.clone();
                        tokio::spawn(async move {
                            process_download(s, h, id, flag).await;
                        });
                    }
                    Some(DownloadMessage::Pause { .. }) => {
                        cancel_flag.store(true, Ordering::SeqCst);
                    }
                    Some(DownloadMessage::Cancel { .. }) => {
                        cancel_flag.store(true, Ordering::SeqCst);
                    }
                    Some(DownloadMessage::Stop) | None => {
                        tracing::info!("Download worker stopping");
                        cancel_flag.store(true, Ordering::SeqCst);
                        break;
                    }
                }
            }
        }
    }
    
    tracing::info!("Download worker stopped");
}

async fn check_stale_downloads(state: &AppState) {
    if let Ok(Some(download)) = DownloadRepo::find_active(&state.db) {
        if download.status == DownloadStatus::Downloading {
            let now = now_timestamp();
            let last_update = download.updated_at;
            
            if now - last_update > STALE_THRESHOLD_SECS {
                tracing::warn!("Found stale download {}, resetting to pending", download.id);
                let _ = DownloadRepo::update_status(&state.db, &download.id, DownloadStatus::Pending, None);
            }
        }
    }
}

async fn process_download(
    state: AppState,
    app_handle: AppHandle,
    id: String,
    cancel_flag: Arc<AtomicBool>,
) {
    tracing::info!("Starting download: {}", id);
    
    let download = match DownloadRepo::find_by_id(&state.db, &id) {
        Ok(d) => d,
        Err(e) => {
            tracing::error!("Failed to find download: {}", e);
            return;
        }
    };
    
    // Update status to downloading
    if let Err(e) = DownloadRepo::update_status(&state.db, &id, DownloadStatus::Downloading, None) {
        tracing::error!("Failed to update download status: {}", e);
        return;
    }
    
    // Start heartbeat task
    let heartbeat_state = state.clone();
    let heartbeat_id = id.clone();
    let heartbeat_cancel = cancel_flag.clone();
    let heartbeat_handle = tokio::spawn(async move {
        loop {
            if heartbeat_cancel.load(Ordering::SeqCst) {
                break;
            }
            
            // Update the updated_at timestamp as heartbeat
            let _ = DownloadRepo::update_progress(&heartbeat_state.db, &heartbeat_id, -1);
            
            tokio::time::sleep(std::time::Duration::from_secs(HEARTBEAT_INTERVAL_SECS)).await;
        }
    });
    
    let result = do_download(&state, &app_handle, &download, cancel_flag).await;
    
    // Stop heartbeat
    heartbeat_handle.abort();
    
    match result {
        Ok(DownloadResult::Completed) => {
            tracing::info!("Download completed: {}", id);
            
            // Handle ZIP extraction if needed
            let path = std::path::Path::new(&download.destination_path);
            if let Some(ext) = path.extension() {
                if ext == "zip" {
                    tracing::info!("Detected ZIP file, extracting...");
                    if let Err(e) = extract_zip(path) {
                        tracing::error!("Failed to extract ZIP: {}", e);
                        let _ = DownloadRepo::update_status(&state.db, &id, DownloadStatus::Failed, Some(&format!("Extraction failed: {}", e)));
                         let _ = app_handle.emit("download:error", serde_json::json!({
                            "id": id,
                            "error": format!("Extraction failed: {}", e),
                        }));
                        return;
                    }
                    tracing::info!("Extraction complete");
                    // Optionally delete zip? Let's keep it for now or delete it.
                    // std::fs::remove_file(path).ok(); 
                }
            }
            
            let _ = DownloadRepo::update_status(&state.db, &id, DownloadStatus::Completed, None);
            
            // Update model path in settings ONLY if it's a model
            // Simple heuristic: if it ends in .gguf, it's a model
            if download.destination_path.ends_with(".gguf") {
                let _ = SettingsRepo::set(&state.db, "model.path", &download.destination_path);
            }
            
            // Emit model status event if model
            if download.destination_path.ends_with(".gguf") {
                let _ = app_handle.emit("model:status", ModelStatusEvent {
                    status: "ready".to_string(),
                    message: Some("Model downloaded successfully".to_string()),
                });
            }
            
            // Also emit download complete
            let _ = app_handle.emit("download:complete", serde_json::json!({
                "id": id,
                "path": download.destination_path,
            }));
        }
        Ok(DownloadResult::Paused) => {
            tracing::info!("Download paused: {}", id);
            // Status already updated to paused
        }
        Ok(DownloadResult::Cancelled) => {
            tracing::info!("Download cancelled: {}", id);
            // Status already updated to cancelled
            
            // Delete partial file
            let path = std::path::Path::new(&download.destination_path);
            if path.exists() {
                let _ = tokio::fs::remove_file(path).await;
            }
        }
        Err(e) => {
            tracing::error!("Download failed: {}", e);
            let _ = DownloadRepo::update_status(&state.db, &id, DownloadStatus::Failed, Some(&e.to_string()));
            
            let _ = app_handle.emit("download:error", serde_json::json!({
                "id": id,
                "error": e.to_string(),
            }));
        }
    }
}

enum DownloadResult {
    Completed,
    Paused,
    Cancelled,
}

fn extract_zip(archive_path: &std::path::Path) -> Result<(), String> {
    let file = std::fs::File::open(archive_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
    
    let parent_dir = archive_path.parent().ok_or("Invalid path")?;
    
    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let outpath = match file.enclosed_name() {
            Some(path) => parent_dir.join(path),
            None => continue,
        };

        if file.name().ends_with('/') {
            std::fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
        } else {
            if let Some(p) = outpath.parent() {
                if !p.exists() {
                    std::fs::create_dir_all(&p).map_err(|e| e.to_string())?;
                }
            }
            let mut outfile = std::fs::File::create(&outpath).map_err(|e| e.to_string())?;
            std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

async fn do_download(
    state: &AppState,
    app_handle: &AppHandle,
    download: &Download,
    cancel_flag: Arc<AtomicBool>,
) -> Result<DownloadResult, AppError> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3600)) // 1 hour total timeout
        .connect_timeout(std::time::Duration::from_secs(30))
        .read_timeout(std::time::Duration::from_secs(60)) // 60 second read timeout to prevent hanging
        .build()
        .map_err(|e| AppError::Download(format!("Failed to create HTTP client: {}", e)))?;
    
    // Check for partial download
    let start_byte = download.downloaded_bytes;
    
    // Build request
    let mut request = client.get(&download.url);
    
    if start_byte > 0 {
        tracing::info!("Resuming download from byte {}", start_byte);
        request = request.header("Range", format!("bytes={}-", start_byte));
    }
    
    let response = request.send().await
        .map_err(|e| AppError::Download(format!("Failed to start download: {}", e)))?;
    
    let status = response.status();
    if !status.is_success() && status.as_u16() != 206 {
        return Err(AppError::Download(format!(
            "HTTP error: {} - {}",
            status,
            response.text().await.unwrap_or_default()
        )));
    }
    
    // Get total size
    let content_length = response.content_length();
    let total_bytes = if start_byte == 0 {
        content_length.ok_or_else(|| AppError::Download("Server didn't provide content length".to_string()))?
    } else {
        download.total_bytes as u64
    };
    
    // Update total bytes in database if this is a fresh download
    if start_byte == 0 && download.total_bytes == 0 {
        tracing::info!("Download size: {} bytes", total_bytes);
    }
    
    // Ensure parent directory exists
    let path = std::path::Path::new(&download.destination_path);
    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent).await?;
    }
    
    // Open file for writing (async)
    let mut file = if start_byte > 0 {
        tokio::fs::OpenOptions::new()
            .append(true)
            .open(path)
            .await?
    } else {
        tokio::fs::File::create(path).await?
    };
    
    // Stream download
    let mut stream = response.bytes_stream();
    let mut downloaded = start_byte;
    let mut last_progress_emit = std::time::Instant::now();
    let mut last_downloaded_for_speed = downloaded;
    let mut last_db_update = std::time::Instant::now();
    
    while let Some(chunk) = stream.next().await {
        // Check if cancelled or paused
        if cancel_flag.load(Ordering::SeqCst) {
            // Check what the current status is
            let current = DownloadRepo::find_by_id(&state.db, &download.id)?;
            match current.status {
                DownloadStatus::Paused => {
                    file.flush().await?;
                    DownloadRepo::update_progress(&state.db, &download.id, downloaded)?;
                    return Ok(DownloadResult::Paused);
                }
                DownloadStatus::Cancelled => {
                    return Ok(DownloadResult::Cancelled);
                }
                _ => {}
            }
        }
        
        let chunk = chunk.map_err(|e| AppError::Download(format!("Stream error: {}", e)))?;
        file.write_all(&chunk).await?;
        downloaded += chunk.len() as i64;
        
        let now = std::time::Instant::now();
        
        // Update progress in DB periodically (every 2 seconds)
        if now.duration_since(last_db_update).as_secs() >= 2 {
            let _ = DownloadRepo::update_progress(&state.db, &download.id, downloaded);
            last_db_update = now;
        }
        
        // Emit progress event (throttled to every 200ms)
        if now.duration_since(last_progress_emit).as_millis() >= 200 {
            let elapsed_secs = now.duration_since(last_progress_emit).as_secs_f64();
            let bytes_since_last = downloaded - last_downloaded_for_speed;
            let speed = if elapsed_secs > 0.0 {
                (bytes_since_last as f64 / elapsed_secs) as i64
            } else {
                0
            };
            
            let _ = app_handle.emit("download:progress", DownloadProgressEvent {
                id: download.id.clone(),
                downloaded_bytes: downloaded,
                total_bytes: total_bytes as i64,
                speed_bps: speed,
            });
            
            last_progress_emit = now;
            last_downloaded_for_speed = downloaded;
        }
    }
    
    file.flush().await?;
    
    // Final progress update
    DownloadRepo::update_progress(&state.db, &download.id, downloaded)?;
    
    // Verify checksum if provided (async version)
    if let Some(ref expected_checksum) = download.checksum {
        tracing::info!("Verifying checksum...");
        
        let _ = app_handle.emit("download:verifying", serde_json::json!({
            "id": download.id,
        }));
        
        let actual_checksum = compute_sha256_async(path).await?;
        
        if actual_checksum.to_lowercase() != expected_checksum.to_lowercase() {
            tokio::fs::remove_file(path).await?;
            return Err(AppError::Download(format!(
                "Checksum mismatch: expected {}, got {}",
                expected_checksum, actual_checksum
            )));
        }
        
        tracing::info!("Checksum verified");
    }
    
    Ok(DownloadResult::Completed)
}

/// Compute SHA256 hash of a file asynchronously
async fn compute_sha256_async(path: &std::path::Path) -> Result<String, AppError> {
    use sha2::{Sha256, Digest};
    use tokio::io::AsyncReadExt;
    
    let mut file = tokio::fs::File::open(path).await?;
    let mut hasher = Sha256::new();
    let mut buffer = vec![0u8; 64 * 1024]; // 64KB buffer
    
    loop {
        let bytes_read = file.read(&mut buffer).await?;
        if bytes_read == 0 {
            break;
        }
        hasher.update(&buffer[..bytes_read]);
    }
    
    let result = hasher.finalize();
    Ok(format!("{:x}", result))
}