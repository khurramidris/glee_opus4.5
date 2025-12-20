use tauri::State;
use crate::entities::*;
use crate::error::AppError;
use crate::services::ConversationService;
use crate::state::AppState;

#[tauri::command]
pub async fn create_conversation(
    state: State<'_, AppState>,
    input: CreateConversationInput,
) -> Result<Conversation, AppError> {
    ConversationService::create(&state.db, input)
}

#[tauri::command]
pub async fn get_conversation(
    state: State<'_, AppState>,
    id: String,
) -> Result<Conversation, AppError> {
    ConversationService::get(&state.db, &id)
}

#[tauri::command]
pub async fn list_conversations(
    state: State<'_, AppState>,
) -> Result<Vec<Conversation>, AppError> {
    ConversationService::list(&state.db)
}

#[tauri::command]
pub async fn update_conversation(
    state: State<'_, AppState>,
    id: String,
    input: UpdateConversationInput,
) -> Result<Conversation, AppError> {
    ConversationService::update(&state.db, &id, input)
}

#[tauri::command]
pub async fn delete_conversation(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), AppError> {
    ConversationService::delete(&state.db, &id)
}

#[tauri::command]
pub async fn get_conversation_messages(
    state: State<'_, AppState>,
    conversation_id: String,
) -> Result<Vec<Message>, AppError> {
    ConversationService::get_messages(&state.db, &conversation_id)
}

/// Find an existing conversation with a single character
#[tauri::command]
pub async fn find_conversation_by_character(
    state: State<'_, AppState>,
    character_id: String,
) -> Result<Option<Conversation>, AppError> {
    ConversationService::find_by_character(&state.db, &character_id)
}

#[tauri::command]
pub async fn clear_conversation_messages(
    state: State<'_, AppState>,
    conversation_id: String,
) -> Result<(), AppError> {
    ConversationService::clear_messages(&state.db, &conversation_id)
}