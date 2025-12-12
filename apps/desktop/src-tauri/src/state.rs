use std::sync::Arc;
use parking_lot::RwLock;
use tokio::sync::{mpsc, Notify};
use tokio_util::sync::CancellationToken;

use crate::database::Database;
use crate::setup::paths::AppPaths;
use crate::sidecar::SidecarHandle;

pub enum QueueMessage {
    Process,
    Stop,
}

pub enum DownloadMessage {
    Start { id: String },
    Pause { id: String },
    Resume { id: String },
    Cancel { id: String },
    Stop,
}

#[derive(Clone)]
pub struct AppState {
    pub db: Database,
    pub paths: AppPaths,
    sidecar: Arc<RwLock<Option<SidecarHandle>>>,
    pub queue_tx: mpsc::Sender<QueueMessage>,
    pub download_tx: mpsc::Sender<DownloadMessage>,
    generating: Arc<RwLock<Option<GenerationState>>>,
    shutdown_notify: Arc<Notify>,
}

#[derive(Clone)]
pub struct GenerationState {
    pub message_id: String,
    pub conversation_id: String,
    pub cancel_token: CancellationToken,
    pub started_at: std::time::Instant,
}

impl AppState {
    pub fn new(
        db: Database,
        paths: AppPaths,
        queue_tx: mpsc::Sender<QueueMessage>,
        download_tx: mpsc::Sender<DownloadMessage>,
        shutdown_notify: Arc<Notify>,
    ) -> Self {
        Self {
            db,
            paths,
            sidecar: Arc::new(RwLock::new(None)),
            queue_tx,
            download_tx,
            generating: Arc::new(RwLock::new(None)),
            shutdown_notify,
        }
    }
    
    // ==================== Shutdown ====================
    
    pub fn shutdown(&self) {
        tracing::info!("AppState shutdown initiated");
        
        // Cancel any ongoing generation
        self.stop_generation();
        
        // Notify workers to stop
        self.shutdown_notify.notify_waiters();
        
        // Send stop messages to workers
        let _ = self.queue_tx.try_send(QueueMessage::Stop);
        let _ = self.download_tx.try_send(DownloadMessage::Stop);
    }
    
    pub fn shutdown_signal(&self) -> Arc<Notify> {
        self.shutdown_notify.clone()
    }
    
    // ==================== Sidecar Management ====================
    
    pub fn is_model_loaded(&self) -> bool {
        self.sidecar.read().is_some()
    }
    
    pub fn get_sidecar(&self) -> Option<SidecarHandle> {
        self.sidecar.read().clone()
    }
    
    pub fn set_sidecar(&self, handle: Option<SidecarHandle>) {
        *self.sidecar.write() = handle;
    }
    
    /// Take ownership of the sidecar handle (removes it from state)
    /// Used during cleanup to ensure proper shutdown
    pub fn take_sidecar(&self) -> Option<SidecarHandle> {
        self.sidecar.write().take()
    }
    
    // ==================== Generation State ====================
    
    pub fn is_generating(&self) -> bool {
        self.generating.read().is_some()
    }
    
    /// Atomically try to start generation. Returns None if generation is already in progress.
    /// This prevents race conditions where multiple tasks try to start generation simultaneously.
    pub fn try_start_generation(&self, message_id: String, conversation_id: String) -> Option<CancellationToken> {
        let mut guard = self.generating.write();
        if guard.is_some() {
            return None;
        }
        let cancel_token = CancellationToken::new();
        *guard = Some(GenerationState {
            message_id,
            conversation_id,
            cancel_token: cancel_token.clone(),
            started_at: std::time::Instant::now(),
        });
        Some(cancel_token)
    }
    
    /// Legacy method - prefer try_start_generation for race-safe operation
    pub fn start_generation(&self, message_id: String, conversation_id: String) -> CancellationToken {
        self.try_start_generation(message_id.clone(), conversation_id.clone())
            .unwrap_or_else(|| {
                tracing::warn!("start_generation called while generation already in progress");
                self.generating.read().as_ref().unwrap().cancel_token.clone()
            })
    }
    
    pub fn stop_generation(&self) {
        let mut guard = self.generating.write();
        if let Some(state) = guard.take() {
            tracing::info!("Stopping generation for message: {}", state.message_id);
            state.cancel_token.cancel();
        }
    }
    
    pub fn finish_generation(&self) {
        *self.generating.write() = None;
    }
    
    pub fn current_generation(&self) -> Option<GenerationState> {
        self.generating.read().clone()
    }
    
    pub fn current_generating_id(&self) -> Option<String> {
        self.generating.read().as_ref().map(|s| s.message_id.clone())
    }
    
    pub fn is_generating_message(&self, message_id: &str) -> bool {
        self.generating
            .read()
            .as_ref()
            .map(|s| s.message_id == message_id)
            .unwrap_or(false)
    }
    
    pub fn cancel_conversation_generation(&self, conversation_id: &str) -> bool {
        let guard = self.generating.read();
        if let Some(state) = guard.as_ref() {
            if state.conversation_id == conversation_id {
                state.cancel_token.cancel();
                return true;
            }
        }
        false
    }
    
    /// Check if current generation has exceeded the timeout and cancel if so.
    /// Returns true if generation was timed out.
    pub fn check_generation_timeout(&self, timeout_secs: u64) -> bool {
        let guard = self.generating.read();
        if let Some(state) = guard.as_ref() {
            if state.started_at.elapsed().as_secs() > timeout_secs {
                state.cancel_token.cancel();
                drop(guard);
                self.finish_generation();
                return true;
            }
        }
        false
    }
}