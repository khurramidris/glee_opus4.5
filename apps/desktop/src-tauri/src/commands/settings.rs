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

/// Batch update multiple settings atomically
#[tauri::command]
pub async fn update_settings_batch(
    state: State<'_, AppState>,
    settings: Vec<(String, String)>,
) -> Result<(), AppError> {
    state.db.transaction(|conn| {
        use rusqlite::params;
        let now = crate::entities::now_timestamp();
        
        for (key, value) in &settings {
            // Validate key format
            if !key.contains('.') {
                return Err(AppError::Validation(format!("Invalid setting key format: {}", key)));
            }
            
            conn.execute(
                "INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)
                 ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?3",
                params![key, value, now],
            ).map_err(AppError::Database)?;
        }
        
        Ok(())
    })
}