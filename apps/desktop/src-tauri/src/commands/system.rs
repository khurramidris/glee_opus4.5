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
        "not_found".to_string()
    } else {
        "loading".to_string()
    };
    
    Ok(ModelStatus {
        status,
        model_path: if settings.model.path.is_empty() {
            None
        } else {
            Some(settings.model.path)
        },
        model_loaded,
    })
}

#[tauri::command]
pub async fn start_sidecar(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
) -> Result<(), AppError> {
    let settings = SettingsService::get_all(&state.db)?;
    
    let model_path = if !settings.model.path.is_empty() {
        std::path::PathBuf::from(&settings.model.path)
    } else {
        state.paths.default_model_path()
    };
    
    if !model_path.exists() {
        return Err(AppError::NotFound(format!(
            "Model file not found: {}",
            model_path.display()
        )));
    }
    
    let handle = sidecar::start_sidecar(
        &app_handle,
        &model_path,
        settings.model.gpu_layers,
        settings.generation.context_size,
    ).await?;
    
    state.set_sidecar(Some(handle));
    
    Ok(())
}

#[tauri::command]
pub async fn stop_sidecar(
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    if let Some(handle) = state.get_sidecar() {
        sidecar::stop_sidecar(handle).await?;
        state.set_sidecar(None);
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
