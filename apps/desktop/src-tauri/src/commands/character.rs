use tauri::State;
use serde::{Deserialize, Serialize};
use crate::entities::*;
use crate::error::AppError;
use crate::services::CharacterService;
use crate::state::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedCharacterInput {
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub personality: String,
    #[serde(default)]
    pub first_message: String,
    #[serde(default)]
    pub example_dialogues: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub scenario: String,
    #[serde(default)]
    pub backstory: String,
    #[serde(default)]
    pub likes: Vec<String>,
    #[serde(default)]
    pub dislikes: Vec<String>,
    #[serde(default)]
    pub physical_traits: String,
    #[serde(default)]
    pub speech_patterns: String,
    #[serde(default)]
    pub alternate_greetings: Vec<String>,
    #[serde(default)]
    pub pov_type: Option<String>,
    #[serde(default)]
    pub rating: Option<String>,
    #[serde(default)]
    pub genre_tags: Vec<String>,
}

#[tauri::command]
pub async fn generate_character_from_prompt(
    state: State<'_, AppState>,
    concept: String,
) -> Result<GeneratedCharacterInput, AppError> {
    if !state.is_model_loaded() {
        return Err(AppError::Sidecar("Model not loaded. Please load a model first.".to_string()));
    }
    
    let sidecar = state.get_sidecar()
        .ok_or_else(|| AppError::Sidecar("Sidecar not available".to_string()))?;
    
    let prompt = format!(
        r#"You are a character creation assistant. Based on the following concept, generate a detailed character profile.

Concept: {}

Generate a JSON object with the following fields (all string fields should be detailed and creative):
- name: A fitting name for the character
- description: A brief description (2-3 sentences)
- personality: Detailed personality traits, behaviors, and mannerisms (3-4 sentences)
- firstMessage: An in-character greeting message the character would say when meeting someone (should be immersive and set the scene)
- exampleDialogues: 2-3 example dialogue exchanges showing how the character speaks (use {{{{user}}}} and {{{{char}}}} format)
- tags: Array of 3-5 relevant tags
- scenario: The setting or context where interactions take place
- backstory: Character's history and background (2-3 sentences)
- likes: Array of 3-5 things the character enjoys
- dislikes: Array of 3-5 things the character dislikes
- physicalTraits: Physical appearance and mannerisms
- speechPatterns: How the character talks (accent, vocabulary, quirks)
- genreTags: Array of relevant genres (e.g., Romance, Comedy, Fantasy)
- povType: One of "any", "first", "second", or "third"
- rating: One of "sfw", "nsfw", or "limitless"

IMPORTANT: Return ONLY valid JSON, no additional text or markdown. The response must be parseable JSON."#,
        concept
    );
    
    let messages = vec![
        serde_json::json!({
            "role": "user",
            "content": prompt
        })
    ];
    
    let client = reqwest::Client::new();
    let url = format!("{}/v1/chat/completions", sidecar.base_url);
    
    let body = serde_json::json!({
        "messages": messages,
        "temperature": 0.8,
        "max_tokens": 2048,
        "stream": false
    });
    
    let response = client
        .post(&url)
        .json(&body)
        .timeout(std::time::Duration::from_secs(120))
        .send()
        .await
        .map_err(|e| AppError::Llm(format!("Request failed: {}", e)))?;
    
    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(AppError::Llm(format!("LLM error ({}): {}", status, error_text)));
    }
    
    let response_json: serde_json::Value = response.json().await
        .map_err(|e| AppError::Llm(format!("Failed to parse response: {}", e)))?;
    
    let content = response_json
        .get("choices")
        .and_then(|c| c.get(0))
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(|c| c.as_str())
        .ok_or_else(|| AppError::Llm("Invalid response format".to_string()))?;
    
    let content = content.trim();
    let content = if content.starts_with("```json") {
        content.trim_start_matches("```json").trim_end_matches("```").trim()
    } else if content.starts_with("```") {
        content.trim_start_matches("```").trim_end_matches("```").trim()
    } else {
        content
    };
    
    let generated: GeneratedCharacterInput = serde_json::from_str(content)
        .map_err(|e| AppError::Llm(format!("Failed to parse generated character: {}. Raw response: {}", e, content)))?;
    
    Ok(generated)
}

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