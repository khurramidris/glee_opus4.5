use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    
    #[error("Not found: {0}")]
    NotFound(String),
    
    #[error("Validation error: {0}")]
    Validation(String),
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    
    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),
    
    #[error("Sidecar error: {0}")]
    Sidecar(String),
    
    #[error("LLM error: {0}")]
    Llm(String),
    
    #[error("Queue error: {0}")]
    Queue(String),
    
    #[error("Download error: {0}")]
    Download(String),
    
    #[error("Import error: {0}")]
    Import(String),
    
    #[error("Export error: {0}")]
    Export(String),
    
    #[error("Tauri error: {0}")]
    Tauri(String),
    
    #[error("{0}")]
    Other(String),
}

#[derive(Debug, Clone, Serialize)]
pub struct CommandError {
    pub code: String,
    pub message: String,
}

impl From<AppError> for CommandError {
    fn from(err: AppError) -> Self {
        let code = match &err {
            AppError::Database(_) => "DATABASE_ERROR",
            AppError::NotFound(_) => "NOT_FOUND",
            AppError::Validation(_) => "VALIDATION_ERROR",
            AppError::Io(_) => "IO_ERROR",
            AppError::Json(_) => "JSON_ERROR",
            AppError::Http(_) => "HTTP_ERROR",
            AppError::Sidecar(_) => "SIDECAR_ERROR",
            AppError::Llm(_) => "LLM_ERROR",
            AppError::Queue(_) => "QUEUE_ERROR",
            AppError::Download(_) => "DOWNLOAD_ERROR",
            AppError::Import(_) => "IMPORT_ERROR",
            AppError::Export(_) => "EXPORT_ERROR",
            AppError::Tauri(_) => "TAURI_ERROR",
            AppError::Other(_) => "UNKNOWN_ERROR",
        };
        
        CommandError {
            code: code.to_string(),
            message: err.to_string(),
        }
    }
}

impl From<String> for AppError {
    fn from(s: String) -> Self {
        AppError::Other(s)
    }
}

impl From<&str> for AppError {
    fn from(s: &str) -> Self {
        AppError::Other(s.to_string())
    }
}

// For Tauri command returns
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        CommandError::from(self.clone()).serialize(serializer)
    }
}

impl Clone for AppError {
    fn clone(&self) -> Self {
        match self {
            Self::Database(e) => Self::Other(e.to_string()),
            Self::NotFound(s) => Self::NotFound(s.clone()),
            Self::Validation(s) => Self::Validation(s.clone()),
            Self::Io(e) => Self::Other(e.to_string()),
            Self::Json(e) => Self::Other(e.to_string()),
            Self::Http(e) => Self::Other(e.to_string()),
            Self::Sidecar(s) => Self::Sidecar(s.clone()),
            Self::Llm(s) => Self::Llm(s.clone()),
            Self::Queue(s) => Self::Queue(s.clone()),
            Self::Download(s) => Self::Download(s.clone()),
            Self::Import(s) => Self::Import(s.clone()),
            Self::Export(s) => Self::Export(s.clone()),
            Self::Tauri(s) => Self::Tauri(s.clone()),
            Self::Other(s) => Self::Other(s.clone()),
        }
    }
}

pub type AppResult<T> = Result<T, AppError>;
