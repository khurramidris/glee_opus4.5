use tauri::State;
use crate::entities::*;
use crate::error::AppError;
use crate::services::PersonaService;
use crate::state::AppState;

#[tauri::command]
pub async fn create_persona(
    state: State<'_, AppState>,
    input: CreatePersonaInput,
) -> Result<Persona, AppError> {
    PersonaService::create(&state.db, input)
}

#[tauri::command]
pub async fn get_persona(
    state: State<'_, AppState>,
    id: String,
) -> Result<Persona, AppError> {
    PersonaService::get(&state.db, &id)
}

#[tauri::command]
pub async fn list_personas(
    state: State<'_, AppState>,
) -> Result<Vec<Persona>, AppError> {
    PersonaService::list(&state.db)
}

#[tauri::command]
pub async fn update_persona(
    state: State<'_, AppState>,
    id: String,
    input: UpdatePersonaInput,
) -> Result<Persona, AppError> {
    PersonaService::update(&state.db, &id, input)
}

#[tauri::command]
pub async fn delete_persona(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), AppError> {
    PersonaService::delete(&state.db, &id)
}

#[tauri::command]
pub async fn set_default_persona(
    state: State<'_, AppState>,
    id: String,
) -> Result<Persona, AppError> {
    PersonaService::set_default(&state.db, &id)
}
