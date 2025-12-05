use tauri::State;
use crate::entities::*;
use crate::error::AppError;
use crate::services::MessageService;
use crate::state::AppState;

#[tauri::command]
pub async fn send_message(
    state: State<'_, AppState>,
    input: SendMessageInput,
) -> Result<Message, AppError> {
    // Check if model is loaded
    if !state.is_model_loaded() {
        return Err(AppError::Sidecar("Model not loaded. Please load a model first.".to_string()));
    }
    
    // Check if already generating for this conversation
    if let Some(gen_state) = state.current_generation() {
        if gen_state.conversation_id == input.conversation_id {
            return Err(AppError::Validation("Already generating a response for this conversation".to_string()));
        }
    }
    
    let (message, _task) = MessageService::send_user_message(&state, input)?;
    Ok(message)
}

#[tauri::command]
pub async fn regenerate_message(
    state: State<'_, AppState>,
    message_id: String,
) -> Result<(), AppError> {
    // Check if model is loaded
    if !state.is_model_loaded() {
        return Err(AppError::Sidecar("Model not loaded".to_string()));
    }
    
    MessageService::regenerate_message(&state, &message_id)?;
    Ok(())
}

#[tauri::command]
pub async fn edit_message(
    state: State<'_, AppState>,
    input: EditMessageInput,
) -> Result<Message, AppError> {
    MessageService::edit_message(&state, input)
}

#[tauri::command]
pub async fn delete_message(
    state: State<'_, AppState>,
    message_id: String,
) -> Result<(), AppError> {
    MessageService::delete(&state.db, &message_id)
}

#[tauri::command]
pub async fn get_branch_siblings(
    state: State<'_, AppState>,
    message_id: String,
) -> Result<Vec<Message>, AppError> {
    MessageService::get_siblings(&state.db, &message_id)
}

#[tauri::command]
pub async fn switch_branch(
    state: State<'_, AppState>,
    message_id: String,
) -> Result<Vec<Message>, AppError> {
    // Stop any ongoing generation when switching branches
    if state.is_generating() {
        state.stop_generation();
    }
    
    MessageService::switch_branch(&state.db, &message_id)
}

#[tauri::command]
pub async fn stop_generation(
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    MessageService::stop_generation(&state)
}