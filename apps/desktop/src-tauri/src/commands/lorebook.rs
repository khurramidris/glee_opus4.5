use tauri::State;
use crate::entities::*;
use crate::error::AppError;
use crate::services::LorebookService;
use crate::state::AppState;

#[tauri::command]
pub async fn create_lorebook(
    state: State<'_, AppState>,
    input: CreateLorebookInput,
) -> Result<Lorebook, AppError> {
    LorebookService::create(&state.db, input)
}

#[tauri::command]
pub async fn get_lorebook(
    state: State<'_, AppState>,
    id: String,
) -> Result<Lorebook, AppError> {
    LorebookService::get(&state.db, &id)
}

#[tauri::command]
pub async fn list_lorebooks(
    state: State<'_, AppState>,
) -> Result<Vec<Lorebook>, AppError> {
    LorebookService::list(&state.db)
}

#[tauri::command]
pub async fn update_lorebook(
    state: State<'_, AppState>,
    id: String,
    input: UpdateLorebookInput,
) -> Result<Lorebook, AppError> {
    LorebookService::update(&state.db, &id, input)
}

#[tauri::command]
pub async fn delete_lorebook(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), AppError> {
    LorebookService::delete(&state.db, &id)
}

#[tauri::command]
pub async fn create_entry(
    state: State<'_, AppState>,
    input: CreateEntryInput,
) -> Result<LorebookEntry, AppError> {
    LorebookService::create_entry(&state.db, input)
}

#[tauri::command]
pub async fn update_entry(
    state: State<'_, AppState>,
    id: String,
    input: UpdateEntryInput,
) -> Result<LorebookEntry, AppError> {
    LorebookService::update_entry(&state.db, &id, input)
}

#[tauri::command]
pub async fn delete_entry(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), AppError> {
    LorebookService::delete_entry(&state.db, &id)
}

#[tauri::command]
pub async fn attach_to_conversation(
    state: State<'_, AppState>,
    conversation_id: String,
    lorebook_id: String,
) -> Result<(), AppError> {
    LorebookService::attach_to_conversation(&state.db, &conversation_id, &lorebook_id)
}

#[tauri::command]
pub async fn detach_from_conversation(
    state: State<'_, AppState>,
    conversation_id: String,
    lorebook_id: String,
) -> Result<(), AppError> {
    LorebookService::detach_from_conversation(&state.db, &conversation_id, &lorebook_id)
}
