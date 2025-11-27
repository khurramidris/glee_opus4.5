use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use crate::error::{AppError, AppResult};

#[derive(Debug, Clone)]
pub struct AppPaths {
    pub data_dir: PathBuf,
    pub database_path: PathBuf,
    pub avatars_dir: PathBuf,
    pub models_dir: PathBuf,
    pub exports_dir: PathBuf,
    pub logs_dir: PathBuf,
}

impl AppPaths {
    pub fn new(handle: &AppHandle) -> AppResult<Self> {
        let data_dir = handle
            .path()
            .app_data_dir()
            .map_err(|e| AppError::Tauri(e.to_string()))?;
        
        let paths = Self {
            database_path: data_dir.join("glee.db"),
            avatars_dir: data_dir.join("avatars"),
            models_dir: data_dir.join("models"),
            exports_dir: data_dir.join("exports"),
            logs_dir: data_dir.join("logs"),
            data_dir,
        };
        
        // Create directories
        std::fs::create_dir_all(&paths.data_dir)?;
        std::fs::create_dir_all(&paths.avatars_dir)?;
        std::fs::create_dir_all(&paths.models_dir)?;
        std::fs::create_dir_all(&paths.exports_dir)?;
        std::fs::create_dir_all(&paths.logs_dir)?;
        
        Ok(paths)
    }
    
    pub fn model_file_path(&self, filename: &str) -> PathBuf {
        self.models_dir.join(filename)
    }
    
    pub fn avatar_file_path(&self, filename: &str) -> PathBuf {
        self.avatars_dir.join(filename)
    }
    
    pub fn default_model_path(&self) -> PathBuf {
        self.models_dir.join("model.gguf")
    }
}
