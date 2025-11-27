use tauri::State;
use crate::entities::*;
use crate::error::AppError;
use crate::services::DownloadService;
use crate::state::AppState;

#[tauri::command]
pub async fn start_model_download(
    state: State<'_, AppState>,
    input: StartDownloadInput,
) -> Result<Download, AppError> {
    DownloadService::start(&state, input)
}

#[tauri::command]
pub async fn pause_download(
    state: State<'_, AppState>,
    id: String,
) -> Result<Download, AppError> {
    DownloadService::pause(&state, &id)
}

#[tauri::command]
pub async fn resume_download(
    state: State<'_, AppState>,
    id: String,
) -> Result<Download, AppError> {
    DownloadService::resume(&state, &id)
}

#[tauri::command]
pub async fn cancel_download(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), AppError> {
    DownloadService::cancel(&state, &id)
}

#[tauri::command]
pub async fn get_download_status(
    state: State<'_, AppState>,
    id: String,
) -> Result<Download, AppError> {
    DownloadService::get_status(&state.db, &id)
}
