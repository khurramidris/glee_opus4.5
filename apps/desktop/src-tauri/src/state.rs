use std::sync::Arc;
use parking_lot::RwLock;
use tokio::sync::mpsc;

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
    pub sidecar: Arc<RwLock<Option<SidecarHandle>>>,
    pub queue_tx: mpsc::Sender<QueueMessage>,
    pub download_tx: mpsc::Sender<DownloadMessage>,
    pub generating: Arc<RwLock<Option<String>>>, // Current generating message ID
}

impl AppState {
    pub fn new(
        db: Database,
        paths: AppPaths,
        queue_tx: mpsc::Sender<QueueMessage>,
        download_tx: mpsc::Sender<DownloadMessage>,
    ) -> Self {
        Self {
            db,
            paths,
            sidecar: Arc::new(RwLock::new(None)),
            queue_tx,
            download_tx,
            generating: Arc::new(RwLock::new(None)),
        }
    }
    
    pub fn is_model_loaded(&self) -> bool {
        self.sidecar.read().is_some()
    }
    
    pub fn get_sidecar(&self) -> Option<SidecarHandle> {
        self.sidecar.read().clone()
    }
    
    pub fn set_sidecar(&self, handle: Option<SidecarHandle>) {
        *self.sidecar.write() = handle;
    }
    
    pub fn is_generating(&self) -> bool {
        self.generating.read().is_some()
    }
    
    pub fn set_generating(&self, message_id: Option<String>) {
        *self.generating.write() = message_id;
    }
    
    pub fn current_generating_id(&self) -> Option<String> {
        self.generating.read().clone()
    }
}
