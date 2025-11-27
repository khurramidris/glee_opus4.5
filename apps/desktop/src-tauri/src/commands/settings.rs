use tauri::State;
use crate::entities::*;
use crate::error::AppError;
use crate::services::SettingsService;
use crate::state::AppState;

#[tauri::command]
pub async fn get_settings(
    state: State<'_, AppState>,
) -> Result<Settings, AppError> {
    SettingsService::get_all(&state.db)
}

#[tauri::command]
pub async fn get_setting(
    state: State<'_, AppState>,
    key: String,
) -> Result<Option<String>, AppError> {
    SettingsService::get(&state.db, &key)
}

#[tauri::command]
pub async fn update_setting(
    state: State<'_, AppState>,
    key: String,
    value: String,
) -> Result<(), AppError> {
    SettingsService::set(&state.db, &key, &value)
}
