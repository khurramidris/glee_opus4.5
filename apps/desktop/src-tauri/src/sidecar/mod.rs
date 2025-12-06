use std::path::Path;
use std::process::Stdio;
use std::sync::Arc;
use tokio::process::{Child, Command};
use tokio::sync::{mpsc, Mutex};
use tokio_util::sync::CancellationToken;
use tauri::{AppHandle, Manager};
use futures::StreamExt;

#[cfg(target_os = "windows")]
#[allow(unused_imports)]
use std::os::windows::process::CommandExt;

use crate::error::{AppError, AppResult};

const DEFAULT_SIDECAR_PORT: u16 = 8384;

#[derive(Clone)]
pub struct SidecarHandle {
    pub port: u16,
    pub base_url: String,
    process: Arc<Mutex<Option<Child>>>,
    cancel_token: CancellationToken,
}

impl SidecarHandle {
    pub fn cancellation_token(&self) -> CancellationToken {
        self.cancel_token.clone()
    }
    
    pub fn cancel_generation(&self) {
        self.cancel_token.cancel();
    }
    
    pub fn reset_cancellation(&mut self) -> CancellationToken {
        self.cancel_token = CancellationToken::new();
        self.cancel_token.clone()
    }
}

fn find_available_port(preferred: u16) -> u16 {
    if std::net::TcpListener::bind(format!("127.0.0.1:{}", preferred)).is_ok() {
        return preferred;
    }
    
    std::net::TcpListener::bind("127.0.0.1:0")
        .and_then(|listener| listener.local_addr())
        .map(|addr| addr.port())
        .unwrap_or(preferred)
}

fn find_sidecar_binary(app_handle: &AppHandle) -> AppResult<std::path::PathBuf> {
    let sidecar_name = if cfg!(target_os = "windows") {
        "llama-server.exe"
    } else {
        "llama-server"
    };
    
    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| AppError::Sidecar(format!("Failed to get resource dir: {}", e)))?;
    
    let possible_paths = vec![
        resource_dir.join(sidecar_name),
        resource_dir.join("resources").join(sidecar_name),
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.join(sidecar_name)))
            .unwrap_or_default(),
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.join("resources").join(sidecar_name)))
            .unwrap_or_default(),
        std::path::PathBuf::from("src-tauri/resources").join(sidecar_name),
        std::path::PathBuf::from("resources").join(sidecar_name),
        std::path::PathBuf::from(sidecar_name),
    ];
    
    for path in possible_paths {
        if path.exists() {
            tracing::info!("Found sidecar at: {:?}", path);
            return Ok(path);
        }
    }
    
    Err(AppError::Sidecar(format!(
        "Sidecar binary '{}' not found. Please ensure it's in the resources directory.",
        sidecar_name
    )))
}

pub async fn start_sidecar(
    app_handle: &AppHandle,
    model_path: &Path,
    gpu_layers: i32,
    context_size: i32,
) -> AppResult<SidecarHandle> {
    if !model_path.exists() {
        return Err(AppError::NotFound(format!(
            "Model file not found: {}",
            model_path.display()
        )));
    }
    
    let sidecar_path = find_sidecar_binary(app_handle)?;
    let port = find_available_port(DEFAULT_SIDECAR_PORT);
    
    tracing::info!("Starting sidecar from: {:?}", sidecar_path);
    tracing::info!("Model path: {:?}", model_path);
    tracing::info!("Port: {}", port);
    tracing::info!("GPU layers: {}, Context size: {}", gpu_layers, context_size);
    
    let mut cmd = Command::new(&sidecar_path);
    cmd.arg("--model").arg(model_path)
        .arg("--host").arg("127.0.0.1")
        .arg("--port").arg(port.to_string())
        .arg("--ctx-size").arg(context_size.to_string())
        .arg("--n-gpu-layers").arg(gpu_layers.to_string())
        .arg("--parallel").arg("1")
        .arg("--cont-batching")
        // Performance optimizations
        .arg("--flash-attn")           // Flash Attention: 30-40% faster, lower VRAM
        .arg("-ctk").arg("q8_0")       // Quantize KV cache for speed + memory
        .arg("--mlock")                // Lock model in RAM to prevent swapping
        // Verbose logging for GPU debugging
        .arg("-v")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    
    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000);
    
    let mut child = cmd.spawn()
        .map_err(|e| AppError::Sidecar(format!("Failed to start sidecar: {}", e)))?;
    
    if let Some(stdout) = child.stdout.take() {
        tokio::spawn(async move {
            use tokio::io::{AsyncBufReadExt, BufReader};
            let mut reader = BufReader::new(stdout).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                tracing::debug!("[llama-server stdout] {}", line);
            }
        });
    }
    
    if let Some(stderr) = child.stderr.take() {
        tokio::spawn(async move {
            use tokio::io::{AsyncBufReadExt, BufReader};
            let mut reader = BufReader::new(stderr).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                if line.contains("error") || line.contains("Error") || line.contains("ERROR") {
                    tracing::error!("[llama-server] {}", line);
                } else if line.contains("warn") || line.contains("WARN") {
                    tracing::warn!("[llama-server] {}", line);
                } else {
                    tracing::info!("[llama-server] {}", line);
                }
            }
        });
    }
    
    let handle = SidecarHandle {
        port,
        base_url: format!("http://127.0.0.1:{}", port),
        process: Arc::new(Mutex::new(Some(child))),
        cancel_token: CancellationToken::new(),
    };
    
    let max_attempts = 300;
    for attempt in 1..=max_attempts {
        if attempt % 10 == 0 {
            tracing::info!("Waiting for sidecar to be ready... ({}/{})", attempt, max_attempts);
        }
        
        {
            let mut proc_guard = handle.process.lock().await;
            if let Some(ref mut proc) = *proc_guard {
                match proc.try_wait() {
                    Ok(Some(status)) => {
                        return Err(AppError::Sidecar(format!(
                            "Sidecar process exited unexpectedly with status: {}",
                            status
                        )));
                    }
                    Ok(None) => {}
                    Err(e) => {
                        return Err(AppError::Sidecar(format!(
                            "Failed to check sidecar status: {}",
                            e
                        )));
                    }
                }
            }
        }
        
        if health_check(&handle).await {
            tracing::info!("Sidecar is ready after {} seconds", attempt);
            return Ok(handle);
        }
        
        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    }
    
    stop_sidecar(handle).await?;
    
    Err(AppError::Sidecar(
        "Sidecar failed to become healthy within timeout. Check if the model file is valid.".to_string()
    ))
}

pub async fn stop_sidecar(handle: SidecarHandle) -> AppResult<()> {
    handle.cancel_token.cancel();
    
    let mut proc_guard = handle.process.lock().await;
    if let Some(mut child) = proc_guard.take() {
        tracing::info!("Stopping sidecar process...");
        
        // Try graceful shutdown first
        let client = reqwest::Client::new();
        let _ = client
            .post(format!("{}/quit", handle.base_url))
            .timeout(std::time::Duration::from_secs(2))
            .send()
            .await;
        
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        
        match child.try_wait() {
            Ok(Some(_)) => {
                tracing::info!("Sidecar stopped gracefully");
            }
            Ok(None) => {
                tracing::warn!("Sidecar didn't stop gracefully, forcing kill");
                let _ = child.kill().await;
                let _ = child.wait().await;
                tracing::info!("Sidecar force killed");
            }
            Err(e) => {
                tracing::error!("Failed to check sidecar status: {}", e);
                let _ = child.kill().await;
                let _ = child.wait().await;
            }
        }
    }
    
    Ok(())
}

pub async fn health_check(handle: &SidecarHandle) -> bool {
    let client = reqwest::Client::new();
    let url = format!("{}/health", handle.base_url);
    
    match client
        .get(&url)
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
    {
        Ok(response) => response.status().is_success(),
        Err(_) => false,
    }
}

#[derive(Debug, Clone)]
pub enum GenerationEvent {
    Token(String),
    Done,
    Cancelled,
    Error(String),
}

pub async fn generate_stream(
    handle: &SidecarHandle,
    messages: Vec<serde_json::Value>,
    temperature: f32,
    max_tokens: i32,
    cancel_token: CancellationToken,
) -> AppResult<mpsc::Receiver<GenerationEvent>> {
    let (tx, rx) = mpsc::channel(256);
    
    let url = format!("{}/v1/chat/completions", handle.base_url);
    let client = reqwest::Client::new();
    
    // Stop sequences for ChatML format (what llama-server uses)
    let stop_sequences = vec![
        "<|im_end|>",
        "<|im_start|>",
        "</s>",
    ];
    
    let body = serde_json::json!({
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": true,
        "stop": stop_sequences,
    });
    
    tracing::info!("Starting generation: {} messages, max_tokens={}", messages.len(), max_tokens);
    
    let response = client
        .post(&url)
        .json(&body)
        .timeout(std::time::Duration::from_secs(300))
        .send()
        .await
        .map_err(|e| AppError::Llm(format!("Request failed: {}", e)))?;
    
    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(AppError::Llm(format!("LLM error ({}): {}", status, error_text)));
    }
    
    // Spawn stream processor
    tokio::spawn(async move {
        let mut stream = response.bytes_stream();
        let mut buffer = String::new();
        let mut token_count = 0u32;
        
        loop {
            tokio::select! {
                biased;
                
                _ = cancel_token.cancelled() => {
                    tracing::info!("Generation cancelled after {} tokens", token_count);
                    let _ = tx.send(GenerationEvent::Cancelled).await;
                    break;
                }
                
                chunk = stream.next() => {
                    match chunk {
                        Some(Ok(bytes)) => {
                            buffer.push_str(&String::from_utf8_lossy(&bytes));
                            
                            // Process SSE events
                            while let Some(pos) = buffer.find("\n\n") {
                                let event_str = buffer[..pos].to_string();
                                buffer = buffer[pos + 2..].to_string();
                                
                                for line in event_str.lines() {
                                    if let Some(data) = line.strip_prefix("data: ") {
                                        let data = data.trim();
                                        
                                        if data == "[DONE]" {
                                            tracing::info!("Generation complete: {} tokens", token_count);
                                            let _ = tx.send(GenerationEvent::Done).await;
                                            return;
                                        }
                                        
                                        if data.is_empty() {
                                            continue;
                                        }
                                        
                                        if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                                            // Check for content
                                            if let Some(content) = json
                                                .get("choices")
                                                .and_then(|c| c.get(0))
                                                .and_then(|c| c.get("delta"))
                                                .and_then(|d| d.get("content"))
                                                .and_then(|c| c.as_str())
                                            {
                                                if !content.is_empty() {
                                                    token_count += 1;
                                                    if tx.send(GenerationEvent::Token(content.to_string())).await.is_err() {
                                                        return;
                                                    }
                                                }
                                            }
                                            
                                            // Check for finish
                                            if let Some(reason) = json
                                                .get("choices")
                                                .and_then(|c| c.get(0))
                                                .and_then(|c| c.get("finish_reason"))
                                                .and_then(|f| f.as_str())
                                            {
                                                if reason == "stop" || reason == "length" {
                                                    tracing::info!("Finished ({}): {} tokens", reason, token_count);
                                                    let _ = tx.send(GenerationEvent::Done).await;
                                                    return;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        Some(Err(e)) => {
                            tracing::error!("Stream error: {}", e);
                            let _ = tx.send(GenerationEvent::Error(e.to_string())).await;
                            break;
                        }
                        None => {
                            tracing::info!("Stream ended: {} tokens", token_count);
                            let _ = tx.send(GenerationEvent::Done).await;
                            break;
                        }
                    }
                }
            }
        }
    });
    
    Ok(rx)
}

pub async fn get_model_info(handle: &SidecarHandle) -> AppResult<serde_json::Value> {
    let client = reqwest::Client::new();
    let url = format!("{}/v1/models", handle.base_url);
    
    let response = client
        .get(&url)
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| AppError::Llm(format!("Failed to get model info: {}", e)))?;
    
    if !response.status().is_success() {
        return Err(AppError::Llm("Failed to get model info".to_string()));
    }
    
    response.json().await.map_err(|e| AppError::Llm(e.to_string()))
}