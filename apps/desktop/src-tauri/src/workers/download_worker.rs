use std::io::Write;
use tokio::sync::mpsc;
use tauri::{AppHandle, Emitter};
use futures::StreamExt;

use crate::entities::*;
use crate::repositories::*;
use crate::state::{AppState, DownloadMessage};
use crate::error::AppError;

pub async fn run(
    state: AppState,
    app_handle: AppHandle,
    mut rx: mpsc::Receiver<DownloadMessage>,
) {
    tracing::info!("Download worker started");
    
    // Check for existing pending/paused downloads on startup
    if let Ok(Some(download)) = DownloadRepo::find_active(&state.db) {
        if download.status == DownloadStatus::Downloading {
            // Resume interrupted download
            tokio::spawn(process_download(state.clone(), app_handle.clone(), download.id));
        }
    }
    
    loop {
        match rx.recv().await {
            Some(DownloadMessage::Start { id }) => {
                let s = state.clone();
                let h = app_handle.clone();
                tokio::spawn(async move {
                    process_download(s, h, id).await;
                });
            }
            Some(DownloadMessage::Resume { id }) => {
                let s = state.clone();
                let h = app_handle.clone();
                tokio::spawn(async move {
                    process_download(s, h, id).await;
                });
            }
            Some(DownloadMessage::Pause { .. }) => {
                // Pause is handled by checking status in download loop
            }
            Some(DownloadMessage::Cancel { .. }) => {
                // Cancel is handled by checking status in download loop
            }
            Some(DownloadMessage::Stop) | None => {
                tracing::info!("Download worker stopping");
                break;
            }
        }
    }
}

async fn process_download(state: AppState, app_handle: AppHandle, id: String) {
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
    
    let result = do_download(&state, &app_handle, &download).await;
    
    match result {
        Ok(_) => {
            tracing::info!("Download completed: {}", id);
            let _ = DownloadRepo::update_status(&state.db, &id, DownloadStatus::Completed, None);
            
            // Update model path in settings
            let _ = SettingsRepo::set(&state.db, "model.path", &download.destination_path);
            
            // Emit model status event
            let _ = app_handle.emit("model:status", ModelStatusEvent {
                status: "ready".to_string(),
                message: Some("Model downloaded successfully".to_string()),
            });
        }
        Err(e) => {
            tracing::error!("Download failed: {}", e);
            let _ = DownloadRepo::update_status(&state.db, &id, DownloadStatus::Failed, Some(&e.to_string()));
        }
    }
}

async fn do_download(
    state: &AppState,
    app_handle: &AppHandle,
    download: &Download,
) -> Result<(), AppError> {
    let client = reqwest::Client::new();
    
    // Check for partial download
    let start_byte = download.downloaded_bytes;
    
    // Build request
    let mut request = client.get(&download.url);
    
    if start_byte > 0 {
        request = request.header("Range", format!("bytes={}-", start_byte));
    }
    
    let response = request.send().await?;
    
    if !response.status().is_success() && response.status().as_u16() != 206 {
        return Err(AppError::Download(format!(
            "HTTP error: {}",
            response.status()
        )));
    }
    
    // Get total size
    let total_bytes = if start_byte == 0 {
        response
            .content_length()
            .ok_or_else(|| AppError::Download("Unknown content length".to_string()))?
    } else {
        download.total_bytes as u64
    };
    
    // Update total bytes if this is a fresh download
    if start_byte == 0 {
        // We'd update the record, but for simplicity just proceed
    }
    
    // Open file for writing
    let path = std::path::Path::new(&download.destination_path);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    
    let mut file = if start_byte > 0 {
        std::fs::OpenOptions::new()
            .append(true)
            .open(path)?
    } else {
        std::fs::File::create(path)?
    };
    
    // Stream download
    let mut stream = response.bytes_stream();
    let mut downloaded = start_byte;
    let mut last_progress_emit = std::time::Instant::now();
    let mut last_downloaded = downloaded;
    
    while let Some(chunk) = stream.next().await {
        // Check if cancelled or paused
        let current = DownloadRepo::find_by_id(&state.db, &download.id)?;
        if current.status == DownloadStatus::Cancelled || current.status == DownloadStatus::Paused {
            return Ok(());
        }
        
        let chunk = chunk?;
        file.write_all(&chunk)?;
        downloaded += chunk.len() as i64;
        
        // Update progress in DB periodically
        let _ = DownloadRepo::update_progress(&state.db, &download.id, downloaded);
        
        // Emit progress event (throttled)
        let now = std::time::Instant::now();
        if now.duration_since(last_progress_emit).as_millis() >= 200 {
            let speed = ((downloaded - last_downloaded) as f64 / 
                now.duration_since(last_progress_emit).as_secs_f64()) as i64;
            
            let _ = app_handle.emit("download:progress", DownloadProgressEvent {
                id: download.id.clone(),
                downloaded_bytes: downloaded,
                total_bytes: total_bytes as i64,
                speed_bps: speed,
            });
            
            last_progress_emit = now;
            last_downloaded = downloaded;
        }
    }
    
    file.flush()?;
    
    // Verify checksum if provided
    if let Some(ref expected_checksum) = download.checksum {
        tracing::info!("Verifying checksum...");
        
        let data = std::fs::read(path)?;
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update(&data);
        let result = hasher.finalize();
        let actual_checksum = format!("{:x}", result);
        
        if actual_checksum != *expected_checksum {
            std::fs::remove_file(path)?;
            return Err(AppError::Download(format!(
                "Checksum mismatch: expected {}, got {}",
                expected_checksum, actual_checksum
            )));
        }
    }
    
    Ok(())
}
