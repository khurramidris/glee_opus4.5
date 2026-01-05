use tauri::State;
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
        tracing::error!("Model not found at: {:?}", model_path);
        return Err(AppError::NotFound(format!(
            "Model file not found. Please place a .gguf model in the models folder or select one in Settings."
        )));
    }
    
    tracing::info!("Starting sidecar with model: {:?}", model_path);
    let handle = sidecar::start_sidecar(
        &app_handle,
        &model_path,
        settings.model.gpu_layers,
        settings.generation.context_size,
        settings.model.sidecar_path.as_deref(),
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