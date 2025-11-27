use tauri::State;
use crate::entities::*;
use crate::error::AppError;
use crate::services::ExportService;
use crate::state::AppState;

#[tauri::command]
pub async fn export_character(
    state: State<'_, AppState>,
    id: String,
) -> Result<String, AppError> {
    let exported = ExportService::export_character(&state.db, &state.paths, &id)?;
    serde_json::to_string_pretty(&exported).map_err(AppError::from)
}

#[tauri::command]
pub async fn export_conversation(
    state: State<'_, AppState>,
    id: String,
) -> Result<String, AppError> {
    let exported = ExportService::export_conversation(&state.db, &id)?;
    serde_json::to_string_pretty(&exported).map_err(AppError::from)
}

#[tauri::command]
pub async fn export_all_data(
    state: State<'_, AppState>,
) -> Result<String, AppError> {
    // For V1, export as JSON with all data
    let characters = crate::repositories::CharacterRepo::find_all(&state.db)?;
    let conversations = crate::repositories::ConversationRepo::find_all(&state.db)?;
    let personas = crate::repositories::PersonaRepo::find_all(&state.db)?;
    let lorebooks = crate::repositories::LorebookRepo::find_all(&state.db)?;
    
    let export = serde_json::json!({
        "glee_export_version": "1.0",
        "export_type": "full_backup",
        "exported_at": chrono::Utc::now().to_rfc3339(),
        "characters": characters,
        "conversations": conversations,
        "personas": personas,
        "lorebooks": lorebooks,
    });
    
    serde_json::to_string_pretty(&export).map_err(AppError::from)
}

#[tauri::command]
pub async fn import_character(
    state: State<'_, AppState>,
    data: String,
) -> Result<Character, AppError> {
    ExportService::import_character(&state.db, &state.paths, &data)
}

#[tauri::command]
pub async fn import_data(
    state: State<'_, AppState>,
    data: String,
) -> Result<String, AppError> {
    // Parse and detect type
    let json: serde_json::Value = serde_json::from_str(&data)
        .map_err(|e| AppError::Import(format!("Invalid JSON: {}", e)))?;
    
    let export_type = json.get("export_type")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown");
    
    match export_type {
        "character" => {
            let character = ExportService::import_character(&state.db, &state.paths, &data)?;
            Ok(format!("Imported character: {}", character.name))
        }
        "full_backup" => {
            // Import personas
            if let Some(personas) = json.get("personas").and_then(|v| v.as_array()) {
                for p in personas {
                    if let Ok(input) = serde_json::from_value::<CreatePersonaInput>(p.clone()) {
                        let _ = crate::services::PersonaService::create(&state.db, input);
                    }
                }
            }
            
            // Import characters
            if let Some(characters) = json.get("characters").and_then(|v| v.as_array()) {
                for c in characters {
                    if let Ok(input) = serde_json::from_value::<CreateCharacterInput>(c.clone()) {
                        let _ = crate::services::CharacterService::create(&state.db, input);
                    }
                }
            }
            
            // Import lorebooks
            if let Some(lorebooks) = json.get("lorebooks").and_then(|v| v.as_array()) {
                for lb in lorebooks {
                    if let Ok(input) = serde_json::from_value::<CreateLorebookInput>(lb.clone()) {
                        let _ = crate::services::LorebookService::create(&state.db, input);
                    }
                }
            }
            
            Ok("Backup imported successfully".to_string())
        }
        _ => Err(AppError::Import(format!("Unknown export type: {}", export_type))),
    }
}
