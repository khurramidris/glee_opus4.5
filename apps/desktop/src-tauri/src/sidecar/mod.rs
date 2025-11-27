use std::path::Path;
use std::process::Stdio;
use tokio::process::{Child, Command};
use tokio::sync::mpsc;
use tauri::AppHandle;

use crate::error::{AppError, AppResult};

const SIDECAR_PORT: u16 = 8384;

#[derive(Clone)]
pub struct SidecarHandle {
    pub port: u16,
    pub base_url: String,
}

pub async fn start_sidecar(
    _app_handle: &AppHandle,
    model_path: &Path,
    gpu_layers: i32,
    context_size: i32,
) -> AppResult<SidecarHandle> {
    // Find sidecar binary
    let sidecar_name = if cfg!(target_os = "windows") {
        "llama-server.exe"
    } else {
        "llama-server"
    };
    
    // Look in multiple locations
    let exe_dir = std::env::current_exe()?.parent().unwrap().to_path_buf();
    let possible_paths = vec![
        exe_dir.join(sidecar_name),
        exe_dir.join("resources").join(sidecar_name),
        std::path::PathBuf::from(sidecar_name), // In PATH
    ];
    
    let sidecar_path = possible_paths.into_iter()
        .find(|p| p.exists())
        .ok_or_else(|| AppError::Sidecar(format!(
            "Sidecar binary '{}' not found", sidecar_name
        )))?;
    
    tracing::info!("Starting sidecar from: {:?}", sidecar_path);
    tracing::info!("Model path: {:?}", model_path);
    
    // Start the process
    let mut child = Command::new(&sidecar_path)
        .arg("--model")
        .arg(model_path)
        .arg("--host")
        .arg("127.0.0.1")
        .arg("--port")
        .arg(SIDECAR_PORT.to_string())
        .arg("--ctx-size")
        .arg(context_size.to_string())
        .arg("--n-gpu-layers")
        .arg(gpu_layers.to_string())
        .arg("--parallel")
        .arg("1")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| AppError::Sidecar(format!("Failed to start sidecar: {}", e)))?;
    
    // Spawn task to log output
    if let Some(stdout) = child.stdout.take() {
        tokio::spawn(async move {
            use tokio::io::{AsyncBufReadExt, BufReader};
            let mut reader = BufReader::new(stdout).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                tracing::debug!("[llama-server] {}", line);
            }
        });
    }
    
    let handle = SidecarHandle {
        port: SIDECAR_PORT,
        base_url: format!("http://127.0.0.1:{}", SIDECAR_PORT),
    };
    
    // Wait for health check
    let max_attempts = 60; // 60 seconds
    for attempt in 0..max_attempts {
        if health_check(&handle).await {
            tracing::info!("Sidecar is ready after {} seconds", attempt);
            return Ok(handle);
        }
        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    }
    
    Err(AppError::Sidecar("Sidecar failed to become healthy".to_string()))
}

pub async fn stop_sidecar(_handle: SidecarHandle) -> AppResult<()> {
    // The process is killed on drop due to kill_on_drop(true)
    // For explicit shutdown, we could send a signal or HTTP request
    Ok(())
}

pub async fn health_check(handle: &SidecarHandle) -> bool {
    let client = reqwest::Client::new();
    let url = format!("{}/health", handle.base_url);
    
    match client.get(&url).timeout(std::time::Duration::from_secs(5)).send().await {
        Ok(response) => response.status().is_success(),
        Err(_) => false,
    }
}

pub async fn generate_stream(
    handle: &SidecarHandle,
    messages: Vec<serde_json::Value>,
    temperature: f32,
    max_tokens: i32,
) -> AppResult<mpsc::Receiver<String>> {
    let (tx, rx) = mpsc::channel(100);
    
    let url = format!("{}/v1/chat/completions", handle.base_url);
    let client = reqwest::Client::new();
    
    let body = serde_json::json!({
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": true,
    });
    
    let response = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| AppError::Llm(format!("Request failed: {}", e)))?;
    
    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(AppError::Llm(format!("LLM error: {}", error_text)));
    }
    
    // Spawn task to process SSE stream
    tokio::spawn(async move {
        use futures::StreamExt;
        
        let mut stream = response.bytes_stream();
        let mut buffer = String::new();
        
        while let Some(chunk) = stream.next().await {
            let chunk = match chunk {
                Ok(c) => c,
                Err(_) => break,
            };
            
            buffer.push_str(&String::from_utf8_lossy(&chunk));
            
            // Process complete SSE events
            while let Some(pos) = buffer.find("\n\n") {
                let event = buffer[..pos].to_string();
                buffer = buffer[pos + 2..].to_string();
                
                // Parse SSE event
                for line in event.lines() {
                    if let Some(data) = line.strip_prefix("data: ") {
                        if data == "[DONE]" {
                            return;
                        }
                        
                        // Parse JSON
                        if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                            if let Some(content) = json
                                .get("choices")
                                .and_then(|c| c.get(0))
                                .and_then(|c| c.get("delta"))
                                .and_then(|d| d.get("content"))
                                .and_then(|c| c.as_str())
                            {
                                if tx.send(content.to_string()).await.is_err() {
                                    return;
                                }
                            }
                        }
                    }
                }
            }
        }
    });
    
    Ok(rx)
}
