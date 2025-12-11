use tauri::{State, Manager};
use crate::entities::*;
use crate::error::AppError;
use crate::sidecar;
use crate::state::AppState;
use crate::services::SettingsService;

#[tauri::command]
pub async fn get_app_info(
    state: State<'_, AppState>,
) -> Result<AppInfo, AppError> {
    let settings = SettingsService::get_all(&state.db)?;
    let model_loaded = state.is_model_loaded();
    
    Ok(AppInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        data_dir: state.paths.data_dir.to_string_lossy().to_string(),
        model_loaded,
        model_path: if settings.model.path.is_empty() {
            None
        } else {
            Some(settings.model.path)
        },
    })
}

#[tauri::command]
pub async fn get_model_status(
    state: State<'_, AppState>,
) -> Result<ModelStatus, AppError> {
    let settings = SettingsService::get_all(&state.db)?;
    let model_loaded = state.is_model_loaded();
    
    let status = if model_loaded {
        "ready".to_string()
    } else if settings.model.path.is_empty() {
        // Check if there's a model in the default location
        let default_model = state.paths.default_model_path();
        if default_model.exists() {
            "not_loaded".to_string()
        } else {
            "not_found".to_string()
        }
    } else {
        let model_path = std::path::Path::new(&settings.model.path);
        if model_path.exists() {
            "not_loaded".to_string()
        } else {
            "not_found".to_string()
        }
    };
    
    let model_path = if !settings.model.path.is_empty() {
        Some(settings.model.path)
    } else {
        let default = state.paths.default_model_path();
        if default.exists() {
            Some(default.to_string_lossy().to_string())
        } else {
            None
        }
    };
    
    Ok(ModelStatus {
        status,
        model_path,
        model_loaded,
    })
}

#[tauri::command]
pub async fn start_sidecar(
    app_handle: tauri::AppHandle,  // AppHandle MUST come before State
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    tracing::info!("start_sidecar command called");
    
    // Check if already running
    if state.is_model_loaded() {
        tracing::info!("Sidecar already running");
        return Ok(());
    }
    
    let settings = SettingsService::get_all(&state.db)?;
    tracing::info!("Settings model.path: '{}'", settings.model.path);
    
    // Determine model path
    let model_path = if !settings.model.path.is_empty() {
        std::path::PathBuf::from(&settings.model.path)
    } else {
        state.paths.default_model_path()
    };
    
    tracing::info!("Looking for model at: {:?}", model_path);
    
    // Check if model exists
    if !model_path.exists() {
        tracing::warn!("Model not found at: {:?}, searching for alternatives...", model_path);
        
        // Try to find any .gguf file in user's models directory first
        let models_dir = &state.paths.models_dir;
        let mut found_model = None;
        
        tracing::info!("Searching in models_dir: {:?}", models_dir);
        
        if models_dir.exists() {
            if let Ok(entries) = std::fs::read_dir(models_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    tracing::debug!("Found file: {:?}", path);
                    if path.extension().map(|e| e == "gguf").unwrap_or(false) {
                        tracing::info!("Found .gguf model: {:?}", path);
                        found_model = Some(path);
                        break;
                    }
                }
            }
        } else {
            tracing::warn!("models_dir does not exist: {:?}", models_dir);
        }
        
        // If not found in user directory, check bundled resources
        if found_model.is_none() {
            if let Ok(resource_dir) = app_handle.path().resource_dir() {
                tracing::info!("Checking resource_dir: {:?}", resource_dir);
                // Check for bundled model in resources/models/
                let bundled_model = resource_dir.join("models").join("model.gguf");
                if bundled_model.exists() {
                    tracing::info!("Found bundled model: {:?}", bundled_model);
                    found_model = Some(bundled_model);
                } else {
                    // Also check directly in resources/
                    let alt_path = resource_dir.join("model.gguf");
                    if alt_path.exists() {
                        tracing::info!("Found bundled model at root: {:?}", alt_path);
                        found_model = Some(alt_path);
                    }
                }
            }
        }
        
        if let Some(found) = found_model {
            tracing::info!("Using model file: {:?}", found);
            // Update settings with found model path
            let _ = SettingsService::set(&state.db, "model.path", &found.to_string_lossy());
            
            let handle = sidecar::start_sidecar(
                &app_handle,
                &found,
                settings.model.gpu_layers,
                settings.generation.context_size,
            ).await?;
            
            state.set_sidecar(Some(handle));
            tracing::info!("Sidecar started successfully with found model");
            return Ok(());
        }
        
        tracing::error!("No model file found anywhere");
        return Err(AppError::NotFound(format!(
            "No model file found. Please place a .gguf model in: {}",
            state.paths.models_dir.display()
        )));
    }
    
    tracing::info!("Starting sidecar with model: {:?}", model_path);
    let handle = sidecar::start_sidecar(
        &app_handle,
        &model_path,
        settings.model.gpu_layers,
        settings.generation.context_size,
    ).await?;
    
    state.set_sidecar(Some(handle));
    
    tracing::info!("Sidecar started successfully");
    Ok(())
}

#[tauri::command]
pub async fn stop_sidecar(
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    // Stop any ongoing generation first
    state.stop_generation();
    
    if let Some(handle) = state.get_sidecar() {
        sidecar::stop_sidecar(handle).await?;
        state.set_sidecar(None);
        tracing::info!("Sidecar stopped");
    }
    Ok(())
}

#[tauri::command]
pub async fn health_check(
    state: State<'_, AppState>,
) -> Result<bool, AppError> {
    if let Some(handle) = state.get_sidecar() {
        Ok(sidecar::health_check(&handle).await)
    } else {
        Ok(false)
    }
}

/// Restart the sidecar (useful after changing settings)
#[tauri::command]
pub async fn restart_sidecar(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    // Stop existing
    if let Some(handle) = state.get_sidecar() {
        state.stop_generation();
        sidecar::stop_sidecar(handle).await?;
        state.set_sidecar(None);
    }
    
    // Wait a moment for port to be released
    tokio::time::sleep(std::time::Duration::from_millis(500)).await;
    
    // Start again
    start_sidecar(app_handle, state).await
}