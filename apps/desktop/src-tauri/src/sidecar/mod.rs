use std::path::Path;
use std::process::Stdio;
use std::sync::Arc;
use tokio::process::{Child, Command};
use tokio::sync::{mpsc, Mutex};
use tokio_util::sync::CancellationToken;
use tauri::{AppHandle, Emitter, Manager};
use futures::StreamExt;

#[cfg(target_os = "windows")]
#[allow(unused_imports)]
use std::os::windows::process::CommandExt;

use crate::error::{AppError, AppResult};
use serde::Deserialize;

const DEFAULT_SIDECAR_PORT: u16 = 8384;
const DEFAULT_STOP_SEQUENCES: &[&str] = &["<|im_end|>", "<|im_start|>", "</s>", "<|end|>", "<|eot_id|>"];

// ============================================
// Model Properties (from /props endpoint)
// ============================================

#[derive(Debug, Clone, Deserialize, Default)]
pub struct ModelProps {
    #[serde(default)]
    pub default_generation_settings: Option<DefaultGenSettings>,
    #[serde(default)]
    pub total_slots: Option<i32>,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct DefaultGenSettings {
    #[serde(default)]
    pub stop: Option<Vec<String>>,
    #[serde(default)]
    pub n_ctx: Option<i32>,
}

#[derive(Clone)]
pub struct SidecarHandle {
    pub port: u16,
    pub base_url: String,
    process: Arc<Mutex<Option<Child>>>,
    cancel_token: CancellationToken,
    /// Stop tokens detected from model metadata
    pub detected_stop_tokens: Arc<Mutex<Option<Vec<String>>>>,
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
    
    /// Get the detected stop tokens (or None if not yet detected)
    pub async fn get_stop_tokens(&self) -> Option<Vec<String>> {
        self.detected_stop_tokens.lock().await.clone()
    }
    
    /// Set detected stop tokens from model props
    pub async fn set_stop_tokens(&self, tokens: Vec<String>) {
        *self.detected_stop_tokens.lock().await = Some(tokens);
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

fn find_sidecar_binary(app_handle: &AppHandle, custom_path: Option<&str>) -> AppResult<std::path::PathBuf> {
    if let Some(custom) = custom_path {
        if !custom.is_empty() {
            let custom_path = std::path::PathBuf::from(custom);
            if custom_path.exists() {
                tracing::info!("Using custom sidecar path: {:?}", custom_path);
                return Ok(custom_path);
            } else {
                tracing::warn!("Custom sidecar path not found: {:?}", custom_path);
            }
        }
    }
    
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
        std::path::PathBuf::from("D:\\Glee-Opus4.5\\glee\\resources").join(sidecar_name),
        std::path::PathBuf::from("resources").join(sidecar_name),
        resource_dir.join(sidecar_name),
        resource_dir.join("resources").join(sidecar_name),
        std::path::PathBuf::from("src-tauri/resources").join(sidecar_name),
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.join(sidecar_name)))
            .unwrap_or_default(),
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.join("resources").join(sidecar_name)))
            .unwrap_or_default(),
        std::path::PathBuf::from(sidecar_name),
    ];
    
    for path in possible_paths {
        if path.exists() {
            tracing::info!("Found sidecar at: {:?}", path);
            return Ok(path);
        }
    }
    
    Err(AppError::Sidecar(format!(
        "Sidecar binary '{}' not found. Configure custom path in Settings or ensure it's in the resources directory.",
        sidecar_name
    )))
}

pub async fn start_sidecar(
    app_handle: &AppHandle,
    model_path: &Path,
    gpu_layers: i32,
    context_size: i32,
    sidecar_path: Option<&str>,
) -> AppResult<SidecarHandle> {
    if !model_path.exists() {
        return Err(AppError::NotFound(format!(
            "Model file not found: {}",
            model_path.display()
        )));
    }
    
    let sidecar_binary = find_sidecar_binary(app_handle, sidecar_path)?;
    let port = find_available_port(DEFAULT_SIDECAR_PORT);
    
    tracing::info!("Starting sidecar from: {:?}", sidecar_binary);
    tracing::info!("Model path: {:?}", model_path);
    tracing::info!("Port: {}", port);
    tracing::info!("GPU layers: {}, Context size: {}", gpu_layers, context_size);
    
    let mut cmd = Command::new(&sidecar_binary);
    
    if let Some(parent_dir) = sidecar_binary.parent() {
        tracing::info!("Setting working directory to: {:?}", parent_dir);
        cmd.current_dir(parent_dir);
    }
    
    cmd.arg("--model").arg(model_path)
        .arg("--host").arg("127.0.0.1")
        .arg("--port").arg(port.to_string())
        .arg("--ctx-size").arg(context_size.to_string())
        .arg("--n-gpu-layers").arg(gpu_layers.to_string())
        .arg("--parallel").arg("1")
        .arg("--cont-batching")
        .arg("--flash-attn").arg("auto")
        .arg("-ctk").arg("q8_0")
        .arg("--embeddings")
        // .arg("-v") // Reduced verbosity to prevent pipe blocking and log spam
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
                 // Keep stdout at debug/trace level as it's mostly internal server info
                if line.len() > 500 {
                    tracing::trace!("[llama-server stdout] (Truncated) {:.100}...", line);
                    continue;
                }
                tracing::debug!("[llama-server stdout] {}", line);
            }
        });
    }
    
    if let Some(stderr) = child.stderr.take() {
        let app_handle = app_handle.clone();
        tokio::spawn(async move {
            use tokio::io::{AsyncBufReadExt, BufReader};
            let mut reader = BufReader::new(stderr).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                // Filter out massive embedding logs from verbose output to prevent console flooding
                if line.len() > 500 && (line.contains("log_server") || line.contains("embedding") || line.contains("response:")) {
                    tracing::trace!("[llama-server] (Truncated huge log) {:.100}...", line);
                    continue;
                }

                // Detect critical GPU/CPU errors for user feedback
                if line.contains("out of memory") || line.contains("CUDA error") || 
                   line.contains("VRAM") || line.contains("cudaMalloc") {
                    tracing::error!("[llama-server] GPU MEMORY EXHAUSTED: {}. Consider reducing gpu_layers in Settings.", line);
                } else if line.contains("illegal instruction") || line.contains("SIGILL") {
                    tracing::error!("[llama-server] CPU INCOMPATIBLE: {}. This CPU may not support required instructions. Try CPU-only build.", line);
                } else if line.contains("error") || line.contains("Error") || line.contains("ERROR") {
                    // Filter out expected "Loading model" 503 errors which are normal during startup
                    if line.contains("Loading model") && line.contains("503") {
                        tracing::debug!("[llama-server] (Expected during load) {}", line);
                    } else if line.contains("error decoding response body") {
                        // This is a common harmless error at the end of streams
                        tracing::debug!("[llama-server] (Stream end) {}", line);
                    } else {
                        tracing::error!("[llama-server] {}", line);
                    }
                } else if line.contains("warn") || line.contains("WARN") {
                    tracing::warn!("[llama-server] {}", line);
                } else if line.contains("load_tensors") || 
                          line.contains("create_tensor") || 
                          line.contains("llama_kv_cache") || 
                          line.contains("llama_model_loader") ||
                          line.contains("model_loader") ||
                          line.contains("llama_new_context_with_model") {
                    // Deprioritize verbose loading logs
                    tracing::trace!("[llama-server] {}", line);
                } else if line.contains("prompt processing progress") {
                    // Extract progress and emit event
                    if let Some(pos) = line.find("progress = ") {
                        let progress_str = &line[pos + 11..];
                        if let Ok(progress) = progress_str.parse::<f32>() {
                            let percent = (progress * 100.0) as i32;
                            let _ = app_handle.emit("model:processing", serde_json::json!({
                                "progress": percent,
                                "message": "Processing conversation context..."
                            }));
                        }
                    }
                    tracing::trace!("[llama-server] {}", line);
                } else if line.contains("GET /health") || 
                          line.contains("response: {\"status\":\"ok\"}") || 
                          line.contains("all tasks already finished") ||
                          line.contains("slot ") || // Reduce slot update noise
                          line.contains("update_slots") ||
                          line.contains("streamed chunk") { 
                    // Ignore repetitive health check, status, and streaming logs
                    tracing::trace!("[llama-server] {}", line);
                } else {
                    // Default to DEBUG instead of INFO to quiet down the console
                    tracing::debug!("[llama-server] {}", line);
                }
            }
        });
    }
    
    let handle = SidecarHandle {
        port,
        base_url: format!("http://127.0.0.1:{}", port),
        process: Arc::new(Mutex::new(Some(child))),
        cancel_token: CancellationToken::new(),
        detected_stop_tokens: Arc::new(Mutex::new(None)),
    };
    
    let max_attempts = 300;
    for attempt in 1..=max_attempts {
        if attempt % 10 == 0 {
            tracing::info!("Waiting for sidecar to be ready... ({}/{})", attempt, max_attempts);
            // Emit loading progress event for frontend
            let progress = (attempt as f32 / max_attempts as f32 * 100.0) as i32;
            let _ = app_handle.emit("model:loading", serde_json::json!({
                "progress": progress,
                "message": format!("Loading model... ({}s)", attempt),
                "attempt": attempt,
                "maxAttempts": max_attempts,
            }));
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
            
            // Detect stop tokens from model metadata
            match get_model_props(&handle).await {
                Ok(props) => {
                    if let Some(settings) = props.default_generation_settings {
                        if let Some(stops) = settings.stop {
                            if !stops.is_empty() {
                                tracing::info!("Detected model stop tokens: {:?}", stops);
                                handle.set_stop_tokens(stops).await;
                            }
                        }
                    }
                }
                Err(e) => {
                    tracing::warn!("Failed to get model props (using defaults): {}", e);
                }
            }
            
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

/// Get model properties from llama.cpp /props endpoint
/// Returns model metadata including default stop sequences
pub async fn get_model_props(handle: &SidecarHandle) -> AppResult<ModelProps> {
    let client = reqwest::Client::new();
    let url = format!("{}/props", handle.base_url);
    
    let response = client
        .get(&url)
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| AppError::Sidecar(format!("Failed to get model props: {}", e)))?;
    
    if !response.status().is_success() {
        return Err(AppError::Sidecar(format!(
            "Model props request failed with status: {}",
            response.status()
        )));
    }
    
    let props: ModelProps = response
        .json()
        .await
        .map_err(|e| AppError::Sidecar(format!("Failed to parse model props: {}", e)))?;
    
    Ok(props)
}

/// Generate text embeddings using the loaded model
/// This uses llama.cpp's /embedding endpoint
pub async fn generate_embedding(handle: &SidecarHandle, text: &str) -> AppResult<Vec<f32>> {
    let client = reqwest::Client::new();
    let url = format!("{}/embedding", handle.base_url);
    
    let body = serde_json::json!({
        "content": text
    });
    
    let response = client
        .post(&url)
        .json(&body)
        .timeout(std::time::Duration::from_secs(60))
        .send()
        .await
        .map_err(|e| AppError::Llm(format!("Embedding request failed: {}", e)))?;
    
    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(AppError::Llm(format!("Embedding error ({}): {}", status, error_text)));
    }
    
    #[derive(Deserialize)]
    struct EmbeddingResponse {
        embedding: Vec<f32>,
    }
    
    let result: EmbeddingResponse = response
        .json()
        .await
        .map_err(|e| AppError::Llm(format!("Failed to parse embedding response: {}", e)))?;
    
    Ok(result.embedding)
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
    custom_stop_sequences: Option<Vec<String>>,
) -> AppResult<mpsc::Receiver<GenerationEvent>> {
    let (tx, rx) = mpsc::channel(256);
    
    let url = format!("{}/v1/chat/completions", handle.base_url);
    let client = reqwest::Client::new();
    
    // Use custom stop sequences, or detected model tokens, or defaults
    let detected = handle.get_stop_tokens().await;
    let stop_sequences: Vec<String> = match &custom_stop_sequences {
        Some(custom) if !custom.is_empty() => custom.clone(),
        _ => detected.unwrap_or_else(|| DEFAULT_STOP_SEQUENCES.iter().map(|s| s.to_string()).collect()),
    };
    
    let body = serde_json::json!({
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": true,
        "stop": stop_sequences.iter().collect::<Vec<_>>(),
    });
    
    tracing::info!("Starting generation: {} messages, max_tokens={}", messages.len(), max_tokens);
    
    let response = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| AppError::Llm(format!("Request failed: {}", e)))?;
    
    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(AppError::Llm(format!("LLM error ({}): {}", status, error_text)));
    }
    
    tokio::spawn(async move {
        let mut stream = response.bytes_stream();
        let mut buffer = Vec::new();
        let mut token_count = 0u32;
        let mut chunk_count = 0u32;
        
        tracing::debug!("Started reading stream chunks");

        loop {
            tokio::select! {
                biased;
                
                _ = cancel_token.cancelled() => {
                    tracing::info!("Generation cancelled after {} tokens", token_count);
                    let _ = tx.send(GenerationEvent::Cancelled).await;
                    break;
                }
                
                // Add timeout to stall detection (15s)
                result = tokio::time::timeout(std::time::Duration::from_secs(15), stream.next()) => {
                    match result {
                        Ok(chunk) => {
                             match chunk {
                                Some(Ok(bytes)) => {
                            chunk_count += 1;
                            if chunk_count % 100 == 0 { // Reduced debug frequency
                                tracing::debug!("Received chunk #{}, size: {} bytes", chunk_count, bytes.len());
                            }
                            buffer.extend_from_slice(&bytes);
                            
                            // Process buffer for SSE messages (double newline separated)
                            while let Some(pos) = buffer.windows(2).position(|w| w == b"\n\n") {
                                let event_bytes = buffer.drain(..pos + 2).collect::<Vec<u8>>();
                                // SAFETY: Check bounds before slicing to prevent underflow
                                let event_str = if event_bytes.len() >= 2 {
                                    String::from_utf8_lossy(&event_bytes[..event_bytes.len() - 2])
                                } else {
                                    String::from_utf8_lossy(&event_bytes)
                                };
                                
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
                                        
                                        match serde_json::from_str::<serde_json::Value>(data) {
                                            Ok(json) => {
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
                                            Err(e) => {
                                                tracing::warn!("Failed to parse JSON chunk: {}", e);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        Some(Err(e)) => {
                            let err_msg = e.to_string();
                            // Handle "error decoding response body" specifically
                            // This often happens at the very end of the stream with llama-server
                            if err_msg.contains("error decoding response body") {
                                if token_count > 0 {
                                    tracing::debug!("Stream decoding error after {} tokens. Assuming stream complete. Error: {}", token_count, err_msg);
                                    let _ = tx.send(GenerationEvent::Done).await;
                                    break;
                                }
                            }
                            
                            tracing::error!("Stream error: {}", err_msg);
                            let _ = tx.send(GenerationEvent::Error(err_msg)).await;
                            break;
                        }
                        None => {
                            tracing::info!("Stream ended: {} tokens", token_count);
                            let _ = tx.send(GenerationEvent::Done).await;
                            break;
                        }
                    }
                }
                Err(_) => {
                    tracing::error!("Generation stalled (no data for 15s)");
                    let _ = tx.send(GenerationEvent::Error("Generation stalled: No data received from model for 15 seconds".to_string())).await;
                    break;
                }
            }
                }
            }
        }
    });
    
    Ok(rx)
}

pub async fn generate_text_oneshot(
    handle: &SidecarHandle,
    messages: Vec<serde_json::Value>,
    temperature: f32,
    max_tokens: i32,
) -> AppResult<String> {
    let url = format!("{}/v1/chat/completions", handle.base_url);
    let client = reqwest::Client::new();
    
    let detected = handle.get_stop_tokens().await;
    let stop_sequences: Vec<String> = detected.unwrap_or_else(|| DEFAULT_STOP_SEQUENCES.iter().map(|s| s.to_string()).collect());

    let body = serde_json::json!({
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": false,
        "stop": stop_sequences
    });

    let response = client
        .post(&url)
        .json(&body)
        .timeout(std::time::Duration::from_secs(180)) // Increased from 60s for slow operations
        .send()
        .await
        .map_err(|e| AppError::Llm(format!("Request failed: {}", e)))?;

    if !response.status().is_success() {
        return Err(AppError::Llm(format!("LLM error: {}", response.status())));
    }

    let json: serde_json::Value = response.json().await.map_err(|e| AppError::Llm(e.to_string()))?;
    
    let content = json
        .get("choices")
        .and_then(|c| c.get(0))
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(|c| c.as_str())
        .ok_or_else(|| AppError::Llm("Failed to parse response content".to_string()))?;

    Ok(content.to_string())
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
