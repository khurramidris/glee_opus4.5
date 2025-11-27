pub mod paths;
pub mod migrations;

use crate::entities::{CreateCharacterInput, CreatePersonaInput};
use crate::repositories::{CharacterRepo, PersonaRepo};
use crate::state::AppState;
use crate::error::AppResult;

const STARTER_CHARACTER_ID: &str = "starter-character-aria";

pub async fn seed_defaults(state: &AppState) -> AppResult<()> {
    // Create default persona if none exists
    let personas = PersonaRepo::find_all(&state.db)?;
    if personas.is_empty() {
        tracing::info!("Creating default persona");
        PersonaRepo::create(&state.db, &CreatePersonaInput {
            name: "User".to_string(),
            description: String::new(),
            is_default: true,
        })?;
    }
    
    // Create starter character if not exists
    if CharacterRepo::find_by_id(&state.db, STARTER_CHARACTER_ID).is_err() {
        tracing::info!("Creating starter character");
        CharacterRepo::create_bundled(&state.db, &CreateCharacterInput {
            name: "Aria".to_string(),
            description: "A friendly and curious AI assistant who loves learning about humans and helping them explore ideas.".to_string(),
            personality: "Warm, intellectually curious, slightly playful. Speaks naturally and conversationally. Asks thoughtful follow-up questions. Genuinely interested in the person she's talking to.".to_string(),
            system_prompt: String::new(),
            first_message: "Hey there! I'm Aria. I've been looking forward to meeting you. What's on your mind today?".to_string(),
            example_dialogues: String::new(),
            avatar_path: None,
            tags: vec!["assistant".to_string(), "friendly".to_string()],
        }, STARTER_CHARACTER_ID)?;
    }
    
    Ok(())
}
