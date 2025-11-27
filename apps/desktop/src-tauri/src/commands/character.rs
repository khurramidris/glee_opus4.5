use tauri::State;
use crate::entities::*;
use crate::error::AppError;
use crate::services::CharacterService;
use crate::state::AppState;

#[tauri::command]
pub async fn create_character(
    state: State<'_, AppState>,
    input: CreateCharacterInput,
) -> Result<Character, AppError> {
    CharacterService::create(&state.db, input)
}

#[tauri::command]
pub async fn get_character(
    state: State<'_, AppState>,
    id: String,
) -> Result<Character, AppError> {
    CharacterService::get(&state.db, &id)
}

#[tauri::command]
pub async fn list_characters(
    state: State<'_, AppState>,
) -> Result<Vec<Character>, AppError> {
    CharacterService::list(&state.db)
}

#[tauri::command]
pub async fn update_character(
    state: State<'_, AppState>,
    id: String,
    input: UpdateCharacterInput,
) -> Result<Character, AppError> {
    CharacterService::update(&state.db, &id, input)
}

#[tauri::command]
pub async fn delete_character(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), AppError> {
    CharacterService::delete(&state.db, &id)
}

#[tauri::command]
pub async fn import_character_card(
    state: State<'_, AppState>,
    json_data: String,
    avatar_base64: Option<String>,
) -> Result<Character, AppError> {
    // If avatar provided, save it first
    let avatar_path = if let Some(ref data) = avatar_base64 {
        let avatar_id = crate::entities::new_id();
        let filename = format!("{}.png", avatar_id);
        
        let data = data
            .strip_prefix("data:image/png;base64,")
            .or_else(|| data.strip_prefix("data:image/jpeg;base64,"))
            .unwrap_or(data);
        
        let bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, data)
            .map_err(|e| AppError::Import(format!("Invalid avatar: {}", e)))?;
        
        let path = state.paths.avatar_file_path(&filename);
        std::fs::write(&path, &bytes)?;
        
        Some(filename)
    } else {
        None
    };
    
    CharacterService::import_card(&state.db, &json_data, avatar_path)
}
