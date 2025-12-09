use crate::database::Database;
use crate::entities::*;
use crate::repositories::*;
use crate::error::{AppError, AppResult};
use crate::setup::paths::AppPaths;
use crate::state::AppState;

// ============================================
// Character Service
// ============================================

pub struct CharacterService;

impl CharacterService {
    pub fn create(db: &Database, input: CreateCharacterInput) -> AppResult<Character> {
        let name = input.name.trim();
        if name.is_empty() {
            return Err(AppError::Validation("Name is required".to_string()));
        }
        if name.len() > 100 {
            return Err(AppError::Validation("Name must be 100 characters or less".to_string()));
        }
        if input.description.len() > 50000 {
            return Err(AppError::Validation("Description is too long".to_string()));
        }
        
        let sanitized_input = CreateCharacterInput {
            name: name.to_string(),
            ..input
        };
        
        CharacterRepo::create(db, &sanitized_input)
    }
    
    pub fn get(db: &Database, id: &str) -> AppResult<Character> {
        CharacterRepo::find_by_id(db, id)
    }
    
    pub fn list(db: &Database) -> AppResult<Vec<Character>> {
        CharacterRepo::find_all(db)
    }
    
    pub fn update(db: &Database, id: &str, input: UpdateCharacterInput) -> AppResult<Character> {
        if let Some(ref name) = input.name {
            if name.trim().is_empty() {
                return Err(AppError::Validation("Name cannot be empty".to_string()));
            }
        }
        CharacterRepo::update(db, id, &input)
    }
    
    pub fn delete(db: &Database, id: &str) -> AppResult<()> {
        CharacterRepo::find_by_id(db, id)?;
        CharacterRepo::delete(db, id)
    }
    
    pub fn import_card(db: &Database, json_data: &str, avatar_path: Option<String>) -> AppResult<Character> {
        if json_data.len() > 2_000_000 {
            return Err(AppError::Import("Character card data too large".to_string()));
        }
        
        // Try V2
        if let Ok(card) = serde_json::from_str::<CharacterCardV2>(json_data) {
            let input = CreateCharacterInput {
                name: card.data.name.trim().to_string(),
                description: if card.data.scenario.is_empty() { card.data.description } else { format!("{}\n\nScenario: {}", card.data.description, card.data.scenario) },
                personality: card.data.personality,
                system_prompt: card.data.system_prompt,
                first_message: card.data.first_mes,
                example_dialogues: card.data.mes_example,
                avatar_path,
                tags: card.data.tags.into_iter().take(20).collect(),
            };
            return CharacterRepo::create(db, &input);
        }
        
        // Try V1
        if let Ok(card) = serde_json::from_str::<CharacterCardV1>(json_data) {
            let input = CreateCharacterInput {
                name: card.name.trim().to_string(),
                description: if card.scenario.is_empty() { card.description } else { format!("{}\n\nScenario: {}", card.description, card.scenario) },
                personality: card.personality,
                system_prompt: String::new(),
                first_message: card.first_mes,
                example_dialogues: card.mes_example,
                avatar_path,
                tags: vec![],
            };
            return CharacterRepo::create(db, &input);
        }
        
        Err(AppError::Import("Invalid character card format".to_string()))
    }
}

// ============================================
// Persona Service
// ============================================

pub struct PersonaService;

impl PersonaService {
    pub fn create(db: &Database, input: CreatePersonaInput) -> AppResult<Persona> {
        let name = input.name.trim();
        if name.is_empty() {
            return Err(AppError::Validation("Name is required".to_string()));
        }
        
        let sanitized = CreatePersonaInput {
            name: name.to_string(),
            ..input
        };
        
        PersonaRepo::create(db, &sanitized)
    }
    
    pub fn get(db: &Database, id: &str) -> AppResult<Persona> {
        PersonaRepo::find_by_id(db, id)
    }
    
    pub fn list(db: &Database) -> AppResult<Vec<Persona>> {
        PersonaRepo::find_all(db)
    }
    
    pub fn get_default(db: &Database) -> AppResult<Option<Persona>> {
        PersonaRepo::find_default(db)
    }
    
    pub fn update(db: &Database, id: &str, input: UpdatePersonaInput) -> AppResult<Persona> {
        if let Some(ref name) = input.name {
            if name.trim().is_empty() {
                return Err(AppError::Validation("Name cannot be empty".to_string()));
            }
        }
        PersonaRepo::update(db, id, &input)
    }
    
    pub fn delete(db: &Database, id: &str) -> AppResult<()> {
        let persona = PersonaRepo::find_by_id(db, id)?;
        if persona.is_default {
            return Err(AppError::Validation("Cannot delete the default persona".to_string()));
        }
        PersonaRepo::delete(db, id)
    }
    
    pub fn set_default(db: &Database, id: &str) -> AppResult<Persona> {
        PersonaRepo::set_default(db, id)
    }
}

// ============================================
// Conversation Service
// ============================================

pub struct ConversationService;

impl ConversationService {
    pub fn create(db: &Database, input: CreateConversationInput) -> AppResult<Conversation> {
        if input.character_ids.is_empty() {
            return Err(AppError::Validation("At least one character is required".to_string()));
        }
        
        // Ensure characters exist
        let mut characters = Vec::new();
        for char_id in &input.character_ids {
            characters.push(CharacterRepo::find_by_id(db, char_id)?);
        }
        
        // Resolve persona
        let persona_id = match input.persona_id {
            Some(ref id) => {
                PersonaRepo::find_by_id(db, id)?;
                Some(id.clone())
            }
            None => PersonaRepo::find_default(db)?.map(|p| p.id),
        };
        
        // Determine title
        let title = input.title.clone().unwrap_or_else(|| {
            if characters.len() == 1 {
                format!("Chat with {}", characters[0].name)
            } else {
                "Group Chat".to_string()
            }
        });
        
        // Transaction
        db.transaction(|conn| {
            let id = new_id();
            let now = now_timestamp();
            let is_group = input.character_ids.len() > 1;
            
            // 1. Create Conversation
            conn.execute(
                "INSERT INTO conversations (id, title, persona_id, is_group, created_at, updated_at, metadata)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, '{}')",
                rusqlite::params![id, title, persona_id, is_group, now, now],
            ).map_err(AppError::Database)?;
            
            // 2. Link Characters
            for (idx, char_id) in input.character_ids.iter().enumerate() {
                conn.execute(
                    "INSERT INTO conversation_characters (conversation_id, character_id, join_order)
                     VALUES (?1, ?2, ?3)",
                    rusqlite::params![id, char_id, idx as i32],
                ).map_err(AppError::Database)?;
            }
            
            // 3. Create First Message (if applicable)
            let first_char = &characters[0];
            let mut active_message_id: Option<String> = None;
            
            if !first_char.first_message.is_empty() {
                let msg_id = new_id();
                let token_count = estimate_tokens(&first_char.first_message);
                
                conn.execute(
                    "INSERT INTO messages (id, conversation_id, parent_id, author_type, author_id, content,
                     is_active_branch, branch_index, token_count, created_at, metadata)
                     VALUES (?1, ?2, NULL, 'character', ?3, ?4, 1, 0, ?5, ?6, '{}')",
                    rusqlite::params![msg_id, id, first_char.id, first_char.first_message, token_count, now],
                ).map_err(AppError::Database)?;
                
                active_message_id = Some(msg_id);
            }
            
            // 4. Update Active Message
            if let Some(ref msg_id) = active_message_id {
                conn.execute(
                    "UPDATE conversations SET active_message_id = ?1 WHERE id = ?2",
                    rusqlite::params![msg_id, id],
                ).map_err(AppError::Database)?;
            }
            
            Ok(Conversation {
                id,
                title,
                persona_id,
                is_group,
                active_message_id,
                created_at: now,
                updated_at: now,
                deleted_at: None,
                metadata: serde_json::Value::Object(Default::default()),
                characters,
                lorebook_ids: vec![],
            })
        })
    }
    
    pub fn get(db: &Database, id: &str) -> AppResult<Conversation> {
        ConversationRepo::find_by_id(db, id)
    }
    
    pub fn list(db: &Database) -> AppResult<Vec<Conversation>> {
        ConversationRepo::find_all(db)
    }
    
    pub fn update(db: &Database, id: &str, input: UpdateConversationInput) -> AppResult<Conversation> {
        if let Some(ref title) = input.title {
            if title.trim().is_empty() {
                return Err(AppError::Validation("Title cannot be empty".to_string()));
            }
        }
        ConversationRepo::update(db, id, &input)
    }
    
    pub fn delete(db: &Database, id: &str) -> AppResult<()> {
        ConversationRepo::find_by_id(db, id)?;
        ConversationRepo::delete(db, id)
    }
    
    pub fn get_messages(db: &Database, conversation_id: &str) -> AppResult<Vec<Message>> {
        ConversationRepo::find_by_id(db, conversation_id)?;
        let messages = MessageRepo::find_active_branch(db, conversation_id)?;
        let sibling_counts = MessageRepo::count_all_siblings(db, conversation_id)?;
        
        let result = messages.into_iter().map(|mut msg| {
            msg.sibling_count = sibling_counts.get(&msg.id).copied().or(Some(1));
            msg
        }).collect();
        
        Ok(result)
    }
    
    pub fn find_by_character(db: &Database, character_id: &str) -> AppResult<Option<Conversation>> {
        ConversationRepo::find_by_single_character(db, character_id)
    }
}

// ============================================
// Message Service
// ============================================

pub struct MessageService;

impl MessageService {
    pub fn send_user_message(state: &AppState, input: SendMessageInput) -> AppResult<(Message, QueueTask)> {
        let db = &state.db;
        let content = input.content.trim();
        if content.is_empty() { return Err(AppError::Validation("Empty message".to_string())); }
        
        // LOGGING ADDED HERE
        tracing::info!("DEBUG: Attempting to send message. Conversation ID: '{}'", input.conversation_id);

        let conversation = match ConversationRepo::find_by_id(db, &input.conversation_id) {
            Ok(c) => c,
            Err(e) => {
                // LOGGING ERROR
                tracing::error!("DEBUG: FAILED to find conversation in DB. ID: '{}'. Error: {:?}", input.conversation_id, e);
                return Err(e);
            }
        };

        let parent_id = conversation.active_message_id.clone();
        
        let user_message = Message {
            id: new_id(),
            conversation_id: input.conversation_id.clone(),
            parent_id: parent_id.clone(),
            author_type: AuthorType::User,
            author_id: None,
            content: content.to_string(),
            is_active_branch: true,
            branch_index: MessageRepo::get_next_branch_index(db, parent_id.as_deref(), &input.conversation_id)?,
            token_count: estimate_tokens(content),
            generation_params: None,
            created_at: now_timestamp(),
            metadata: serde_json::Value::Object(Default::default()),
            author_name: None,
            sibling_count: None,
        };
        
        tracing::info!("DEBUG: Creating user message with ID: {}", user_message.id);
        let saved_message = MessageRepo::create(db, &user_message)?;
        
        ConversationRepo::update_active_message(db, &input.conversation_id, &saved_message.id)?;
        
        let target_character_id = conversation.characters.first().map(|c| c.id.clone());
        let task = QueueTask {
            id: new_id(),
            conversation_id: input.conversation_id.clone(),
            parent_message_id: Some(saved_message.id.clone()),
            target_character_id,
            status: QueueStatus::Pending,
            priority: 0,
            created_at: now_timestamp(),
            started_at: None,
            completed_at: None,
            error_message: None,
            metadata: serde_json::Value::Object(Default::default()),
        };
        
        tracing::info!("DEBUG: Enqueuing task: {}", task.id);
        let saved_task = QueueRepo::enqueue(db, &task)?;
        let _ = state.queue_tx.try_send(crate::state::QueueMessage::Process);
        
        Ok((saved_message, saved_task))
    }
    
    pub fn regenerate_message(state: &AppState, message_id: &str) -> AppResult<QueueTask> {
        let db = &state.db;
        let message = MessageRepo::find_by_id(db, message_id)?;
        
        if message.author_type != AuthorType::Character {
            return Err(AppError::Validation("Can only regenerate character messages".to_string()));
        }
        
        MessageRepo::deactivate_subtree(db, message_id)?;
        
        let task = QueueTask {
            id: new_id(),
            conversation_id: message.conversation_id.clone(),
            parent_message_id: message.parent_id.clone(),
            target_character_id: message.author_id.clone(),
            status: QueueStatus::Pending,
            priority: 0,
            created_at: now_timestamp(),
            started_at: None,
            completed_at: None,
            error_message: None,
            metadata: serde_json::Value::Object(Default::default()),
        };
        
        let saved_task = QueueRepo::enqueue(db, &task)?;
        if let Some(ref parent_id) = message.parent_id {
            ConversationRepo::update_active_message(db, &message.conversation_id, parent_id)?;
        }
        
        let _ = state.queue_tx.try_send(crate::state::QueueMessage::Process);
        Ok(saved_task)
    }
    
    pub fn edit_message(state: &AppState, input: EditMessageInput) -> AppResult<Message> {
        let db = &state.db;
        let content = input.content.trim();
        if content.is_empty() { return Err(AppError::Validation("Empty message".to_string())); }
        
        let original = MessageRepo::find_by_id(db, &input.message_id)?;
        MessageRepo::deactivate_subtree(db, &input.message_id)?;
        
        let new_message = Message {
            id: new_id(),
            conversation_id: original.conversation_id.clone(),
            parent_id: original.parent_id.clone(),
            author_type: original.author_type,
            author_id: original.author_id.clone(),
            content: content.to_string(),
            is_active_branch: true,
            branch_index: MessageRepo::get_next_branch_index(db, original.parent_id.as_deref(), &original.conversation_id)?,
            token_count: estimate_tokens(content),
            generation_params: None,
            created_at: now_timestamp(),
            metadata: serde_json::Value::Object(Default::default()),
            author_name: original.author_name.clone(),
            sibling_count: None,
        };
        
        let saved = MessageRepo::create(db, &new_message)?;
        ConversationRepo::update_active_message(db, &original.conversation_id, &saved.id)?;
        
        if original.author_type == AuthorType::User {
            let conversation = ConversationRepo::find_by_id(db, &original.conversation_id)?;
            let target_character_id = conversation.characters.first().map(|c| c.id.clone());
            let task = QueueTask {
                id: new_id(),
                conversation_id: original.conversation_id.clone(),
                parent_message_id: Some(saved.id.clone()),
                target_character_id,
                status: QueueStatus::Pending,
                priority: 0,
                created_at: now_timestamp(),
                started_at: None,
                completed_at: None,
                error_message: None,
                metadata: serde_json::Value::Object(Default::default()),
            };
            QueueRepo::enqueue(db, &task)?;
            let _ = state.queue_tx.try_send(crate::state::QueueMessage::Process);
        }
        
        Ok(saved)
    }
    
    pub fn switch_branch(db: &Database, message_id: &str) -> AppResult<Vec<Message>> {
        MessageRepo::switch_to_branch(db, message_id)
    }
    
    pub fn get_siblings(db: &Database, message_id: &str) -> AppResult<Vec<Message>> {
        MessageRepo::find_siblings(db, message_id)
    }
    
    pub fn delete(db: &Database, message_id: &str) -> AppResult<()> {
        let message = MessageRepo::find_by_id(db, message_id)?;
        
        if message.is_active_branch {
            if let Some(ref parent_id) = message.parent_id {
                let siblings = MessageRepo::find_siblings(db, message_id)?;
                if let Some(alt) = siblings.iter().find(|s| s.id != message_id) {
                    MessageRepo::switch_to_branch(db, &alt.id)?;
                } else {
                    ConversationRepo::update_active_message(db, &message.conversation_id, parent_id)?;
                }
            }
        }
        
        MessageRepo::delete(db, message_id)
    }
    
    pub fn stop_generation(state: &AppState) -> AppResult<()> {
        state.stop_generation();
        if let Some(gen) = state.current_generation() {
            QueueRepo::cancel_for_conversation(&state.db, &gen.conversation_id)?;
        }
        Ok(())
    }
}

// ============================================
// Lorebook Service
// ============================================

pub struct LorebookService;

impl LorebookService {
    pub fn create(db: &Database, input: CreateLorebookInput) -> AppResult<Lorebook> {
        let name = input.name.trim();
        if name.is_empty() { return Err(AppError::Validation("Name required".to_string())); }
        
        let sanitized = CreateLorebookInput { name: name.to_string(), ..input };
        LorebookRepo::create(db, &sanitized)
    }
    
    pub fn get(db: &Database, id: &str) -> AppResult<Lorebook> {
        LorebookRepo::find_by_id(db, id)
    }
    
    pub fn list(db: &Database) -> AppResult<Vec<Lorebook>> {
        LorebookRepo::find_all(db)
    }
    
    pub fn update(db: &Database, id: &str, input: UpdateLorebookInput) -> AppResult<Lorebook> {
        LorebookRepo::update(db, id, &input)
    }
    
    pub fn delete(db: &Database, id: &str) -> AppResult<()> {
        LorebookRepo::find_by_id(db, id)?;
        LorebookRepo::delete(db, id)
    }
    
    pub fn create_entry(db: &Database, input: CreateEntryInput) -> AppResult<LorebookEntry> {
        if input.keywords.is_empty() { return Err(AppError::Validation("Keyword required".to_string())); }
        if input.content.trim().is_empty() { return Err(AppError::Validation("Content required".to_string())); }
        
        LorebookRepo::find_by_id(db, &input.lorebook_id)?;
        LorebookRepo::create_entry(db, &input)
    }
    
    pub fn update_entry(db: &Database, id: &str, input: UpdateEntryInput) -> AppResult<LorebookEntry> {
        LorebookRepo::update_entry(db, id, &input)
    }
    
    pub fn delete_entry(db: &Database, id: &str) -> AppResult<()> {
        LorebookRepo::delete_entry(db, id)
    }
    
    pub fn attach_to_conversation(db: &Database, conv_id: &str, lb_id: &str) -> AppResult<()> {
        ConversationRepo::find_by_id(db, conv_id)?;
        LorebookRepo::find_by_id(db, lb_id)?;
        ConversationRepo::attach_lorebook(db, conv_id, lb_id)
    }
    
    pub fn detach_from_conversation(db: &Database, conv_id: &str, lb_id: &str) -> AppResult<()> {
        ConversationRepo::detach_lorebook(db, conv_id, lb_id)
    }
    
    pub fn find_matching_entries(db: &Database, conv_id: &str, text: &str) -> AppResult<Vec<LorebookEntry>> {
        let conversation = ConversationRepo::find_by_id(db, conv_id)?;
        let mut all_entries = Vec::new();
        
        let global = LorebookRepo::find_global(db)?;
        for lb in global { all_entries.extend(lb.entries); }
        
        for lb_id in &conversation.lorebook_ids {
            if let Ok(lb) = LorebookRepo::find_by_id(db, lb_id) {
                if lb.is_enabled { all_entries.extend(lb.entries); }
            }
        }
        
        let text_lower = text.to_lowercase();
        let matched: Vec<LorebookEntry> = all_entries.into_iter().filter(|entry| {
            if !entry.is_enabled { return false; }
            entry.keywords.iter().any(|kw| {
                let k = if entry.case_sensitive { kw.clone() } else { kw.to_lowercase() };
                let t = if entry.case_sensitive { text } else { &text_lower };
                t.contains(&k)
            })
        }).collect();
        
        // Deduplicate and sort
        let mut seen = std::collections::HashSet::new();
        let mut unique = Vec::new();
        for m in matched {
            if seen.insert(m.id.clone()) {
                unique.push(m);
            }
        }
        unique.sort_by(|a, b| b.priority.cmp(&a.priority));
        
        Ok(unique)
    }
}

// ============================================
// Settings Service
// ============================================

pub struct SettingsService;

impl SettingsService {
    pub fn get_all(db: &Database) -> AppResult<Settings> {
        SettingsRepo::get_all(db)
    }
    
    pub fn get(db: &Database, key: &str) -> AppResult<Option<String>> {
        SettingsRepo::get(db, key)
    }
    
    pub fn set(db: &Database, key: &str, value: &str) -> AppResult<()> {
        SettingsRepo::set(db, key, value)
    }
}

// ============================================
// Memory Service
// ============================================

pub struct MemoryService;

impl MemoryService {
    pub fn build_context(db: &Database, conv_id: &str, max_tokens: i32) -> AppResult<ContextResult> {
        let settings = SettingsRepo::get_all(db)?;
        let conversation = ConversationRepo::find_by_id(db, conv_id)?;
        let messages = MessageRepo::find_active_branch(db, conv_id)?;
        
        let character = conversation.characters.first().ok_or(AppError::NotFound("No char".into()))?;
        let persona = if let Some(ref pid) = conversation.persona_id {
            PersonaRepo::find_by_id(db, pid).ok()
        } else {
            PersonaRepo::find_default(db)?
        };
        
        let lorebook_budget = settings.generation.lorebook_budget.unwrap_or(500);
        let response_reserve = settings.generation.response_reserve.unwrap_or(512);
        
        // Build System Prompt
        let mut system_parts = Vec::new();
        
        // 1. Char Identity
        if !character.system_prompt.is_empty() {
            system_parts.push(character.system_prompt.clone());
        } else {
            let mut p = format!("You are {}.", character.name);
            if !character.description.is_empty() { p.push_str(&format!("\n{}", character.description)); }
            if !character.personality.is_empty() { p.push_str(&format!("\nPersonality: {}", character.personality)); }
            system_parts.push(p);
        }
        
        // 2. Persona
        if let Some(p) = &persona {
            if !p.description.is_empty() {
                system_parts.push(format!("User persona: {}", p.description));
            }
        }
        
        // 3. Lorebook
        let recent_text = messages.iter().rev().take(10).map(|m| m.content.as_str()).collect::<Vec<_>>().join(" ");
        let lore_entries = LorebookService::find_matching_entries(db, conv_id, &recent_text)?;
        
        let mut used_lore_tokens = 0;
        let mut before_sys = Vec::new();
        let mut after_sys = Vec::new();
        
        for entry in lore_entries {
            let tokens = estimate_tokens(&entry.content);
            if used_lore_tokens + tokens > lorebook_budget { break; }
            
            if entry.insertion_position == "before_system" {
                before_sys.push(entry.content);
            } else {
                after_sys.push(entry.content);
            }
            used_lore_tokens += tokens;
        }
        
        // Assemble final system prompt
        let mut final_parts = Vec::new();
        final_parts.extend(before_sys);
        final_parts.extend(system_parts);
        final_parts.extend(after_sys);
        
        if !character.example_dialogues.is_empty() {
            final_parts.push(format!("Examples:\n{}", character.example_dialogues));
        }
        
        let final_system = final_parts.join("\n\n");
        let sys_tokens = estimate_tokens(&final_system);
        
        // 4. Conversation History
        let available = max_tokens - sys_tokens - response_reserve;
        let mut history = Vec::new();
        let mut history_tokens = 0;
        
        for msg in messages.iter().rev() {
            let t = msg.token_count;
            if history_tokens + t > available { break; }
            history.push(msg.clone());
            history_tokens += t;
        }
        history.reverse();
        
        Ok(ContextResult {
            system_prompt: final_system,
            messages: history,
            character_name: character.name.clone(),
            persona_name: persona.map(|p| p.name).unwrap_or("User".into()),
            total_tokens: sys_tokens + history_tokens,
        })
    }
}

#[derive(Debug)]
pub struct ContextResult {
    pub system_prompt: String,
    pub messages: Vec<Message>,
    pub character_name: String,
    pub persona_name: String,
    pub total_tokens: i32,
}

// ============================================
// Export / Import
// ============================================

pub struct ExportService;
impl ExportService {
    pub fn export_character(db: &Database, paths: &AppPaths, id: &str) -> AppResult<ExportedCharacter> {
        let character = CharacterRepo::find_by_id(db, id)?;
        let avatar_base64 = if let Some(ref path) = character.avatar_path {
            let full = paths.avatar_file_path(path);
            if full.exists() {
                let data = std::fs::read(full)?;
                Some(format!("data:image/png;base64,{}", base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &data)))
            } else { None }
        } else { None };
        
        Ok(ExportedCharacter {
            glee_export_version: "1.0".into(),
            export_type: "character".into(),
            exported_at: chrono::Utc::now().to_rfc3339(),
            character,
            avatar_base64
        })
    }
    
    pub fn export_conversation(db: &Database, id: &str) -> AppResult<ExportedConversation> {
        let conversation = ConversationRepo::find_by_id(db, id)?;
        let messages = MessageRepo::find_active_branch(db, id)?;
        let persona = if let Some(pid) = &conversation.persona_id { PersonaRepo::find_by_id(db, pid).ok() } else { None };
        
        Ok(ExportedConversation {
            glee_export_version: "1.0".into(),
            export_type: "conversation".into(),
            exported_at: chrono::Utc::now().to_rfc3339(),
            conversation,
            messages,
            persona
        })
    }
    
    pub fn import_character(db: &Database, paths: &AppPaths, data: &str) -> AppResult<Character> {
        let exported: ExportedCharacter = serde_json::from_str(data)?;
        let avatar_path = if let Some(b64) = &exported.avatar_base64 {
            let id = new_id();
            let fname = format!("{}.png", id);
            let raw = b64.split(',').last().unwrap_or(b64);
            let bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, raw).map_err(|e| AppError::Import(e.to_string()))?;
            std::fs::write(paths.avatar_file_path(&fname), bytes)?;
            Some(fname)
        } else { None };
        
        let input = CreateCharacterInput {
            name: exported.character.name,
            description: exported.character.description,
            personality: exported.character.personality,
            system_prompt: exported.character.system_prompt,
            first_message: exported.character.first_message,
            example_dialogues: exported.character.example_dialogues,
            avatar_path,
            tags: exported.character.tags,
        };
        CharacterRepo::create(db, &input)
    }
    
    pub fn import_data(db: &Database, paths: &AppPaths, data: &str) -> AppResult<String> {
        // Simple dispatcher
        if data.contains("glee_export_version") && data.contains("\"export_type\":\"character\"") {
            let c = Self::import_character(db, paths, data)?;
            return Ok(format!("Imported character: {}", c.name));
        }
        Err(AppError::Import("Unknown format".into()))
    }
}

// ============================================
// Download Service
// ============================================

pub struct DownloadService;
impl DownloadService {
    pub fn start(state: &AppState, input: StartDownloadInput) -> AppResult<Download> {
        if let Some(curr) = DownloadRepo::find_active(&state.db)? {
            if curr.status == DownloadStatus::Downloading { return Err(AppError::Download("Busy".into())); }
        }
        
        let id = new_id();
        let fname = input.url.split('/').last().unwrap_or("model.gguf");
        
        // If type is binary, we might be downloading a zip. 
        // We trust the URL filename to have the correct extension.
        
        let dest = if input.download_type.as_deref() == Some("binary") {
            let bin_dir = state.paths.data_dir.join("bin");
            if !bin_dir.exists() {
                std::fs::create_dir_all(&bin_dir)?;
            }
            bin_dir.join(fname)
        } else {
            state.paths.model_file_path(fname)
        };
        
        let dl = Download {
            id: id.clone(),
            url: input.url,
            destination_path: dest.to_string_lossy().into(),
            total_bytes: 0,
            downloaded_bytes: 0,
            status: DownloadStatus::Pending,
            checksum: input.checksum,
            created_at: now_timestamp(),
            updated_at: now_timestamp(),
            error_message: None,
        };
        
        DownloadRepo::create(&state.db, &dl)?;
        let _ = state.download_tx.try_send(crate::state::DownloadMessage::Start { id: id.clone() });
        Ok(dl)
    }
    
    pub fn pause(state: &AppState, id: &str) -> AppResult<Download> {
        DownloadRepo::update_status(&state.db, id, DownloadStatus::Paused, None)?;
        let _ = state.download_tx.try_send(crate::state::DownloadMessage::Pause { id: id.to_string() });
        DownloadRepo::find_by_id(&state.db, id)
    }
    
    pub fn resume(state: &AppState, id: &str) -> AppResult<Download> {
        DownloadRepo::update_status(&state.db, id, DownloadStatus::Pending, None)?;
        let _ = state.download_tx.try_send(crate::state::DownloadMessage::Resume { id: id.to_string() });
        DownloadRepo::find_by_id(&state.db, id)
    }
    
    pub fn cancel(state: &AppState, id: &str) -> AppResult<()> {
        DownloadRepo::update_status(&state.db, id, DownloadStatus::Cancelled, None)?;
        let _ = state.download_tx.try_send(crate::state::DownloadMessage::Cancel { id: id.to_string() });
        Ok(())
    }
    
    // RENAMED from get_download_status to get_status
    pub fn get_status(db: &Database, id: &str) -> AppResult<Download> {
        DownloadRepo::find_by_id(db, id)
    }
    
    pub fn get_active(db: &Database) -> AppResult<Option<Download>> {
        DownloadRepo::find_active(db)
    }
}

// ============================================
// Helpers
// ============================================

pub fn estimate_tokens(text: &str) -> i32 {
    if text.is_empty() { return 0; }
    let mut ascii = 0;
    let mut other = 0;
    for c in text.chars() {
        if c.is_ascii() { ascii += 1; } else { other += 1; }
    }
    // Heuristic: Ascii ~ 3.5 chars/token, Unicode ~ 1.5 chars/token
    let est = (ascii as f32 / 3.5) + (other as f32 * 0.7);
    (est.ceil() as i32).max(1)
}