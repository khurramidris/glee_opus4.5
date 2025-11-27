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
        if input.name.trim().is_empty() {
            return Err(AppError::Validation("Name is required".to_string()));
        }
        CharacterRepo::create(db, &input)
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
        CharacterRepo::delete(db, id)
    }
    
    pub fn import_card(db: &Database, json_data: &str, avatar_path: Option<String>) -> AppResult<Character> {
        // Try V2 format first
        if let Ok(card) = serde_json::from_str::<CharacterCardV2>(json_data) {
            let input = CreateCharacterInput {
                name: card.data.name,
                description: if card.data.scenario.is_empty() {
                    card.data.description
                } else {
                    format!("{}\n\nScenario: {}", card.data.description, card.data.scenario)
                },
                personality: card.data.personality,
                system_prompt: card.data.system_prompt,
                first_message: card.data.first_mes,
                example_dialogues: card.data.mes_example,
                avatar_path,
                tags: card.data.tags,
            };
            return CharacterRepo::create(db, &input);
        }
        
        // Try V1 format
        if let Ok(card) = serde_json::from_str::<CharacterCardV1>(json_data) {
            let input = CreateCharacterInput {
                name: card.name,
                description: if card.scenario.is_empty() {
                    card.description
                } else {
                    format!("{}\n\nScenario: {}", card.description, card.scenario)
                },
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
        if input.name.trim().is_empty() {
            return Err(AppError::Validation("Name is required".to_string()));
        }
        PersonaRepo::create(db, &input)
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
        PersonaRepo::update(db, id, &input)
    }
    
    pub fn delete(db: &Database, id: &str) -> AppResult<()> {
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
        
        // Verify all characters exist
        for char_id in &input.character_ids {
            CharacterRepo::find_by_id(db, char_id)?;
        }
        
        // Get default persona if not specified
        let persona_id = match input.persona_id {
            Some(ref id) => Some(id.clone()),
            None => PersonaRepo::find_default(db)?.map(|p| p.id),
        };
        
        let input = CreateConversationInput {
            persona_id,
            ..input
        };
        
        let conversation = ConversationRepo::create(db, &input)?;
        
        // Create first message from the first character
        if let Some(character) = conversation.characters.first() {
            if !character.first_message.is_empty() {
                let message = Message {
                    id: new_id(),
                    conversation_id: conversation.id.clone(),
                    parent_id: None,
                    author_type: AuthorType::Character,
                    author_id: Some(character.id.clone()),
                    content: character.first_message.clone(),
                    is_active_branch: true,
                    branch_index: 0,
                    token_count: estimate_tokens(&character.first_message),
                    generation_params: None,
                    created_at: now_timestamp(),
                    metadata: serde_json::Value::Object(Default::default()),
                    author_name: Some(character.name.clone()),
                    sibling_count: None,
                };
                
                let saved = MessageRepo::create(db, &message)?;
                ConversationRepo::update_active_message(db, &conversation.id, &saved.id)?;
            }
        }
        
        ConversationRepo::find_by_id(db, &conversation.id)
    }
    
    pub fn get(db: &Database, id: &str) -> AppResult<Conversation> {
        ConversationRepo::find_by_id(db, id)
    }
    
    pub fn list(db: &Database) -> AppResult<Vec<Conversation>> {
        ConversationRepo::find_all(db)
    }
    
    pub fn update(db: &Database, id: &str, input: UpdateConversationInput) -> AppResult<Conversation> {
        ConversationRepo::update(db, id, &input)
    }
    
    pub fn delete(db: &Database, id: &str) -> AppResult<()> {
        ConversationRepo::delete(db, id)
    }
    
    pub fn get_messages(db: &Database, conversation_id: &str) -> AppResult<Vec<Message>> {
        // Verify conversation exists
        ConversationRepo::find_by_id(db, conversation_id)?;
        
        let messages = MessageRepo::find_active_branch(db, conversation_id)?;
        
        // Add sibling count to each message
        let mut result = Vec::with_capacity(messages.len());
        for mut msg in messages {
            let siblings = MessageRepo::find_siblings(db, &msg.id)?;
            msg.sibling_count = Some(siblings.len() as i32);
            result.push(msg);
        }
        
        Ok(result)
    }
}

// ============================================
// Message Service
// ============================================

pub struct MessageService;

impl MessageService {
    pub fn send_user_message(
        state: &AppState,
        input: SendMessageInput,
    ) -> AppResult<(Message, QueueTask)> {
        let db = &state.db;
        let conversation = ConversationRepo::find_by_id(db, &input.conversation_id)?;
        
        // Get parent message ID (current active message)
        let parent_id = conversation.active_message_id.clone();
        
        // Create user message
        let user_message = Message {
            id: new_id(),
            conversation_id: input.conversation_id.clone(),
            parent_id: parent_id.clone(),
            author_type: AuthorType::User,
            author_id: None,
            content: input.content.clone(),
            is_active_branch: true,
            branch_index: MessageRepo::get_next_branch_index(db, parent_id.as_deref(), &input.conversation_id)?,
            token_count: estimate_tokens(&input.content),
            generation_params: None,
            created_at: now_timestamp(),
            metadata: serde_json::Value::Object(Default::default()),
            author_name: None,
            sibling_count: None,
        };
        
        let saved_message = MessageRepo::create(db, &user_message)?;
        ConversationRepo::update_active_message(db, &input.conversation_id, &saved_message.id)?;
        
        // Create queue task for response generation
        // For group chat, we'd create multiple tasks, but for simplicity in V1, one at a time
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
        
        let saved_task = QueueRepo::enqueue(db, &task)?;
        
        // Notify queue worker
        let _ = state.queue_tx.try_send(crate::state::QueueMessage::Process);
        
        Ok((saved_message, saved_task))
    }
    
    pub fn regenerate_message(state: &AppState, message_id: &str) -> AppResult<QueueTask> {
        let db = &state.db;
        let message = MessageRepo::find_by_id(db, message_id)?;
        
        // Can only regenerate character messages
        if message.author_type != AuthorType::Character {
            return Err(AppError::Validation("Can only regenerate character messages".to_string()));
        }
        
        // Deactivate this message and its subtree
        MessageRepo::deactivate_subtree(db, message_id)?;
        
        // Create new task to generate a new sibling
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
        
        // Update conversation active message to parent
        if let Some(ref parent_id) = message.parent_id {
            ConversationRepo::update_active_message(db, &message.conversation_id, parent_id)?;
        }
        
        let _ = state.queue_tx.try_send(crate::state::QueueMessage::Process);
        
        Ok(saved_task)
    }
    
    pub fn edit_message(state: &AppState, input: EditMessageInput) -> AppResult<Message> {
        let db = &state.db;
        let original = MessageRepo::find_by_id(db, &input.message_id)?;
        
        // Deactivate original and its subtree
        MessageRepo::deactivate_subtree(db, &input.message_id)?;
        
        // Create new message as sibling
        let new_message = Message {
            id: new_id(),
            conversation_id: original.conversation_id.clone(),
            parent_id: original.parent_id.clone(),
            author_type: original.author_type,
            author_id: original.author_id.clone(),
            content: input.content.clone(),
            is_active_branch: true,
            branch_index: MessageRepo::get_next_branch_index(
                db,
                original.parent_id.as_deref(),
                &original.conversation_id,
            )?,
            token_count: estimate_tokens(&input.content),
            generation_params: None,
            created_at: now_timestamp(),
            metadata: serde_json::Value::Object(Default::default()),
            author_name: original.author_name.clone(),
            sibling_count: None,
        };
        
        let saved = MessageRepo::create(db, &new_message)?;
        ConversationRepo::update_active_message(db, &original.conversation_id, &saved.id)?;
        
        // If it was a user message, queue response
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
        let message = MessageRepo::find_by_id(db, message_id)?;
        
        // Find current active sibling
        let siblings = MessageRepo::find_siblings(db, message_id)?;
        let current_active = siblings.iter().find(|m| m.is_active_branch);
        
        if let Some(active) = current_active {
            // Deactivate current branch
            MessageRepo::deactivate_subtree(db, &active.id)?;
        }
        
        // Activate target branch
        MessageRepo::activate_path_to_root(db, message_id)?;
        
        // Find deepest active message in this branch
        let mut current_id = message_id.to_string();
        loop {
            let children: Vec<Message> = MessageRepo::find_siblings(db, &current_id)?
                .into_iter()
                .filter(|m| m.parent_id.as_deref() == Some(&current_id) && m.is_active_branch)
                .collect();
            
            if let Some(child) = children.first() {
                current_id = child.id.clone();
            } else {
                break;
            }
        }
        
        ConversationRepo::update_active_message(db, &message.conversation_id, &current_id)?;
        
        // Return updated active branch
        MessageRepo::find_active_branch(db, &message.conversation_id)
    }
    
    pub fn get_siblings(db: &Database, message_id: &str) -> AppResult<Vec<Message>> {
        MessageRepo::find_siblings(db, message_id)
    }
    
    pub fn delete(db: &Database, message_id: &str) -> AppResult<()> {
        MessageRepo::delete(db, message_id)
    }
    
    pub fn stop_generation(state: &AppState) -> AppResult<()> {
        // Cancel current generation by clearing the generating flag
        // The queue worker checks this flag
        state.set_generating(None);
        Ok(())
    }
}

// ============================================
// Lorebook Service
// ============================================

pub struct LorebookService;

impl LorebookService {
    pub fn create(db: &Database, input: CreateLorebookInput) -> AppResult<Lorebook> {
        if input.name.trim().is_empty() {
            return Err(AppError::Validation("Name is required".to_string()));
        }
        LorebookRepo::create(db, &input)
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
        LorebookRepo::delete(db, id)
    }
    
    pub fn create_entry(db: &Database, input: CreateEntryInput) -> AppResult<LorebookEntry> {
        LorebookRepo::create_entry(db, &input)
    }
    
    pub fn update_entry(db: &Database, id: &str, input: UpdateEntryInput) -> AppResult<LorebookEntry> {
        LorebookRepo::update_entry(db, id, &input)
    }
    
    pub fn delete_entry(db: &Database, id: &str) -> AppResult<()> {
        LorebookRepo::delete_entry(db, id)
    }
    
    pub fn attach_to_conversation(db: &Database, conversation_id: &str, lorebook_id: &str) -> AppResult<()> {
        ConversationRepo::attach_lorebook(db, conversation_id, lorebook_id)
    }
    
    pub fn detach_from_conversation(db: &Database, conversation_id: &str, lorebook_id: &str) -> AppResult<()> {
        ConversationRepo::detach_lorebook(db, conversation_id, lorebook_id)
    }
    
    /// Find entries that match the given text
    pub fn find_matching_entries(db: &Database, conversation_id: &str, text: &str) -> AppResult<Vec<LorebookEntry>> {
        let conversation = ConversationRepo::find_by_id(db, conversation_id)?;
        
        // Get global lorebooks + conversation-attached lorebooks
        let mut all_entries = Vec::new();
        
        let global_lorebooks = LorebookRepo::find_global(db)?;
        for lb in global_lorebooks {
            all_entries.extend(lb.entries);
        }
        
        for lb_id in &conversation.lorebook_ids {
            if let Ok(lb) = LorebookRepo::find_by_id(db, lb_id) {
                all_entries.extend(lb.entries);
            }
        }
        
        // Filter by keyword match
        let text_lower = text.to_lowercase();
        let matched: Vec<LorebookEntry> = all_entries
            .into_iter()
            .filter(|entry| {
                entry.keywords.iter().any(|keyword| {
                    let kw = if entry.case_sensitive {
                        keyword.clone()
                    } else {
                        keyword.to_lowercase()
                    };
                    
                    let search_text = if entry.case_sensitive {
                        text.to_string()
                    } else {
                        text_lower.clone()
                    };
                    
                    if entry.match_whole_word {
                        search_text.split_whitespace().any(|word| word == kw)
                    } else {
                        search_text.contains(&kw)
                    }
                })
            })
            .collect();
        
        // Sort by priority (highest first)
        let mut sorted = matched;
        sorted.sort_by(|a, b| b.priority.cmp(&a.priority));
        
        Ok(sorted)
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
// Memory Service (Context Building)
// ============================================

pub struct MemoryService;

impl MemoryService {
    pub fn build_context(
        db: &Database,
        conversation_id: &str,
        max_tokens: i32,
    ) -> AppResult<ContextResult> {
        let conversation = ConversationRepo::find_by_id(db, conversation_id)?;
        let messages = MessageRepo::find_active_branch(db, conversation_id)?;
        
        // Get character
        let character = conversation.characters.first()
            .ok_or_else(|| AppError::NotFound("No character in conversation".to_string()))?;
        
        // Get persona
        let persona = if let Some(ref persona_id) = conversation.persona_id {
            PersonaRepo::find_by_id(db, persona_id).ok()
        } else {
            None
        };
        
        // Build system prompt
        let mut system_parts = Vec::new();
        
        // Character identity
        let char_prompt = if !character.system_prompt.is_empty() {
            character.system_prompt.clone()
        } else {
            format!(
                "You are {}.\n\n{}\n\n{}",
                character.name,
                character.description,
                character.personality
            )
        };
        system_parts.push(char_prompt);
        
        // Persona
        if let Some(ref p) = persona {
            if !p.description.is_empty() {
                system_parts.push(format!(
                    "You are talking to {}. About them: {}",
                    p.name, p.description
                ));
            }
        }
        
        // Find matching lorebook entries
        let recent_text: String = messages.iter()
            .rev()
            .take(5)
            .map(|m| m.content.as_str())
            .collect::<Vec<_>>()
            .join(" ");
        
        let lorebook_entries = LorebookService::find_matching_entries(db, conversation_id, &recent_text)?;
        
        // Add lorebook entries (respecting token budget)
        let mut lorebook_tokens = 0;
        let lorebook_budget = 500; // tokens reserved for lorebook
        
        for entry in &lorebook_entries {
            let entry_tokens = estimate_tokens(&entry.content);
            if lorebook_tokens + entry_tokens > lorebook_budget {
                break;
            }
            system_parts.push(entry.content.clone());
            lorebook_tokens += entry_tokens;
        }
        
        // Example dialogues
        if !character.example_dialogues.is_empty() {
            system_parts.push(format!("Example conversation:\n{}", character.example_dialogues));
        }
        
        let system_prompt = system_parts.join("\n\n");
        let system_tokens = estimate_tokens(&system_prompt);
        
        // Calculate available tokens for history
        let reserved_for_response = 512;
        let available_for_history = max_tokens - system_tokens - reserved_for_response;
        
        // Select messages (sliding window from most recent)
        let mut selected_messages = Vec::new();
        let mut history_tokens = 0;
        
        for msg in messages.iter().rev() {
            let msg_tokens = msg.token_count;
            if history_tokens + msg_tokens > available_for_history {
                break;
            }
            selected_messages.push(msg.clone());
            history_tokens += msg_tokens;
        }
        
        // Reverse to get chronological order
        selected_messages.reverse();
        
        Ok(ContextResult {
            system_prompt,
            messages: selected_messages,
            character_name: character.name.clone(),
            persona_name: persona.map(|p| p.name).unwrap_or_else(|| "User".to_string()),
        })
    }
}

#[derive(Debug)]
pub struct ContextResult {
    pub system_prompt: String,
    pub messages: Vec<Message>,
    pub character_name: String,
    pub persona_name: String,
}

// ============================================
// Export Service
// ============================================

pub struct ExportService;

impl ExportService {
    pub fn export_character(db: &Database, paths: &AppPaths, id: &str) -> AppResult<ExportedCharacter> {
        let character = CharacterRepo::find_by_id(db, id)?;
        
        // Load avatar if exists
        let avatar_base64 = if let Some(ref avatar_path) = character.avatar_path {
            let full_path = paths.avatar_file_path(avatar_path);
            if full_path.exists() {
                let data = std::fs::read(&full_path)?;
                Some(format!("data:image/png;base64,{}", base64::Engine::encode(
                    &base64::engine::general_purpose::STANDARD,
                    &data
                )))
            } else {
                None
            }
        } else {
            None
        };
        
        Ok(ExportedCharacter {
            glee_export_version: "1.0".to_string(),
            export_type: "character".to_string(),
            exported_at: chrono::Utc::now().to_rfc3339(),
            character,
            avatar_base64,
        })
    }
    
    pub fn export_conversation(db: &Database, id: &str) -> AppResult<ExportedConversation> {
        let conversation = ConversationRepo::find_by_id(db, id)?;
        let messages = MessageRepo::find_active_branch(db, id)?;
        
        let persona = if let Some(ref persona_id) = conversation.persona_id {
            PersonaRepo::find_by_id(db, persona_id).ok()
        } else {
            None
        };
        
        Ok(ExportedConversation {
            glee_export_version: "1.0".to_string(),
            export_type: "conversation".to_string(),
            exported_at: chrono::Utc::now().to_rfc3339(),
            conversation,
            messages,
            persona,
        })
    }
    
    pub fn import_character(db: &Database, paths: &AppPaths, data: &str) -> AppResult<Character> {
        let exported: ExportedCharacter = serde_json::from_str(data)
            .map_err(|e| AppError::Import(format!("Invalid character data: {}", e)))?;
        
        // Save avatar if present
        let avatar_path = if let Some(ref base64_data) = exported.avatar_base64 {
            let avatar_id = new_id();
            let filename = format!("{}.png", avatar_id);
            
            // Parse data URL
            let data = base64_data
                .strip_prefix("data:image/png;base64,")
                .or_else(|| base64_data.strip_prefix("data:image/jpeg;base64,"))
                .unwrap_or(base64_data);
            
            let bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, data)
                .map_err(|e| AppError::Import(format!("Invalid avatar data: {}", e)))?;
            
            let path = paths.avatar_file_path(&filename);
            std::fs::write(&path, &bytes)?;
            
            Some(filename)
        } else {
            None
        };
        
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
}

// ============================================
// Download Service
// ============================================

pub struct DownloadService;

impl DownloadService {
    pub fn start(state: &AppState, input: StartDownloadInput) -> AppResult<Download> {
        let id = new_id();
        let filename = input.url
            .split('/')
            .last()
            .unwrap_or("model.gguf")
            .to_string();
        
        let destination_path = state.paths.model_file_path(&filename);
        
        let download = Download {
            id: id.clone(),
            url: input.url,
            destination_path: destination_path.to_string_lossy().to_string(),
            total_bytes: 0,
            downloaded_bytes: 0,
            status: DownloadStatus::Pending,
            checksum: input.checksum,
            created_at: now_timestamp(),
            updated_at: now_timestamp(),
            error_message: None,
        };
        
        let saved = DownloadRepo::create(&state.db, &download)?;
        
        // Notify download worker
        let _ = state.download_tx.try_send(crate::state::DownloadMessage::Start { id });
        
        Ok(saved)
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
    // Rough estimation: ~4 characters per token
    (text.len() as f32 / 4.0).ceil() as i32
}
