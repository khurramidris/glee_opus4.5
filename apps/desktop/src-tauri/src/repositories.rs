use crate::database::{Database, RowExt};
use crate::entities::*;
use crate::error::{AppError, AppResult};
use rusqlite::params;
use std::collections::{HashMap, HashSet};
use std::str::FromStr;

// ============================================
// Character Repository
// ============================================

pub struct CharacterRepo;

impl CharacterRepo {
    fn build_metadata(character: &CreateCharacterInput) -> serde_json::Value {
        serde_json::json!({
            "scenario": character.scenario,
            "backstory": character.backstory,
            "likes": character.likes,
            "dislikes": character.dislikes,
            "physicalTraits": character.physical_traits,
            "speechPatterns": character.speech_patterns,
            "alternateGreetings": character.alternate_greetings,
            "creatorName": character.creator_name,
            "creatorNotes": character.creator_notes,
            "characterVersion": character.character_version,
            "povType": character.pov_type,
            "rating": character.rating,
            "genreTags": character.genre_tags,
        })
    }
    
    pub fn create(db: &Database, character: &CreateCharacterInput) -> AppResult<Character> {
        let id = new_id();
        let now = now_timestamp();
        let tags_json = serde_json::to_string(&character.tags)?;
        let metadata_json = serde_json::to_string(&Self::build_metadata(character))?;
        
        db.execute(
            "INSERT INTO characters (id, name, description, personality, system_prompt, 
             first_message, example_dialogues, avatar_path, tags, metadata, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                id, character.name, character.description, character.personality,
                character.system_prompt, character.first_message, character.example_dialogues,
                character.avatar_path, tags_json, metadata_json, now, now
            ],
        )?;
        
        Self::find_by_id(db, &id)
    }
    
    pub fn create_bundled(db: &Database, character: &CreateCharacterInput, id: &str) -> AppResult<Character> {
        let now = now_timestamp();
        let tags_json = serde_json::to_string(&character.tags)?;
        let metadata_json = serde_json::to_string(&Self::build_metadata(character))?;
        
        db.execute(
            "INSERT INTO characters (id, name, description, personality, system_prompt, 
             first_message, example_dialogues, avatar_path, tags, metadata, is_bundled, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 1, ?11, ?12)",
            params![
                id, character.name, character.description, character.personality,
                character.system_prompt, character.first_message, character.example_dialogues,
                character.avatar_path, tags_json, metadata_json, now, now
            ],
        )?;
        
        Self::find_by_id(db, id)
    }
    
    pub fn find_by_id(db: &Database, id: &str) -> AppResult<Character> {
        db.query_one(
            "SELECT * FROM characters WHERE id = ?1 AND deleted_at IS NULL",
            params![id],
            Self::row_to_character,
        )
    }
    
    pub fn find_all(db: &Database) -> AppResult<Vec<Character>> {
        db.query_all(
            "SELECT * FROM characters WHERE deleted_at IS NULL ORDER BY name ASC",
            [],
            Self::row_to_character,
        )
    }
    
    pub fn update(db: &Database, id: &str, input: &UpdateCharacterInput) -> AppResult<Character> {
        let now = now_timestamp();
        let mut query = "UPDATE characters SET updated_at = ?".to_string();
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(now)];
        
        if let Some(v) = &input.name {
            query.push_str(", name = ?");
            params.push(Box::new(v.clone()));
        }
        if let Some(v) = &input.description {
            query.push_str(", description = ?");
            params.push(Box::new(v.clone()));
        }
        if let Some(v) = &input.personality {
            query.push_str(", personality = ?");
            params.push(Box::new(v.clone()));
        }
        if let Some(v) = &input.system_prompt {
            query.push_str(", system_prompt = ?");
            params.push(Box::new(v.clone()));
        }
        if let Some(v) = &input.first_message {
            query.push_str(", first_message = ?");
            params.push(Box::new(v.clone()));
        }
        if let Some(v) = &input.example_dialogues {
            query.push_str(", example_dialogues = ?");
            params.push(Box::new(v.clone()));
        }
        if let Some(v) = &input.avatar_path {
            query.push_str(", avatar_path = ?");
            params.push(Box::new(v.clone()));
        }
        if let Some(v) = &input.tags {
            let json = serde_json::to_string(v)?;
            query.push_str(", tags = ?");
            params.push(Box::new(json));
        }
        
        // Handle enhanced fields via metadata JSON merge
        let has_metadata_updates = input.scenario.is_some() || input.backstory.is_some() ||
            input.likes.is_some() || input.dislikes.is_some() ||
            input.physical_traits.is_some() || input.speech_patterns.is_some() ||
            input.alternate_greetings.is_some() || input.creator_name.is_some() ||
            input.creator_notes.is_some() || input.character_version.is_some() ||
            input.pov_type.is_some() || input.rating.is_some() || input.genre_tags.is_some();
        
        if has_metadata_updates {
            // Get current character to merge metadata
            let current = Self::find_by_id(db, id)?;
            let mut metadata = current.metadata.clone();
            
            if let Some(v) = &input.scenario { metadata["scenario"] = serde_json::json!(v); }
            if let Some(v) = &input.backstory { metadata["backstory"] = serde_json::json!(v); }
            if let Some(v) = &input.likes { metadata["likes"] = serde_json::json!(v); }
            if let Some(v) = &input.dislikes { metadata["dislikes"] = serde_json::json!(v); }
            if let Some(v) = &input.physical_traits { metadata["physicalTraits"] = serde_json::json!(v); }
            if let Some(v) = &input.speech_patterns { metadata["speechPatterns"] = serde_json::json!(v); }
            if let Some(v) = &input.alternate_greetings { metadata["alternateGreetings"] = serde_json::json!(v); }
            if let Some(v) = &input.creator_name { metadata["creatorName"] = serde_json::json!(v); }
            if let Some(v) = &input.creator_notes { metadata["creatorNotes"] = serde_json::json!(v); }
            if let Some(v) = &input.character_version { metadata["characterVersion"] = serde_json::json!(v); }
            if let Some(v) = &input.pov_type { metadata["povType"] = serde_json::json!(v); }
            if let Some(v) = &input.rating { metadata["rating"] = serde_json::json!(v); }
            if let Some(v) = &input.genre_tags { metadata["genreTags"] = serde_json::json!(v); }
            
            let metadata_json = serde_json::to_string(&metadata)?;
            query.push_str(", metadata = ?");
            params.push(Box::new(metadata_json));
        }
        
        query.push_str(" WHERE id = ?");
        params.push(Box::new(id.to_string()));
        
        let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        db.execute(&query, params_refs.as_slice())?;
        
        Self::find_by_id(db, id)
    }
    
    pub fn delete(db: &Database, id: &str) -> AppResult<()> {
        let now = now_timestamp();
        db.execute(
            "UPDATE characters SET deleted_at = ?1 WHERE id = ?2",
            params![now, id],
        )?;
        Ok(())
    }
    
    pub fn row_to_character(row: &rusqlite::Row<'_>) -> rusqlite::Result<Character> {
        let tags_str: String = row.get("tags")?;
        let metadata_str: String = row.get("metadata")?;
        let metadata: serde_json::Value = serde_json::from_str(&metadata_str).unwrap_or_default();
        
        Ok(Character {
            id: row.get("id")?,
            name: row.get("name")?,
            description: row.get("description")?,
            personality: row.get("personality")?,
            system_prompt: row.get("system_prompt")?,
            first_message: row.get("first_message")?,
            example_dialogues: row.get("example_dialogues")?,
            avatar_path: row.get("avatar_path")?,
            tags: serde_json::from_str(&tags_str).unwrap_or_default(),
            is_bundled: row.get::<_, i32>("is_bundled")? != 0,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
            deleted_at: row.get("deleted_at")?,
            
            // Enhanced fields from metadata
            scenario: metadata.get("scenario").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            backstory: metadata.get("backstory").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            likes: metadata.get("likes").and_then(|v| serde_json::from_value(v.clone()).ok()).unwrap_or_default(),
            dislikes: metadata.get("dislikes").and_then(|v| serde_json::from_value(v.clone()).ok()).unwrap_or_default(),
            physical_traits: metadata.get("physicalTraits").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            speech_patterns: metadata.get("speechPatterns").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            alternate_greetings: metadata.get("alternateGreetings").and_then(|v| serde_json::from_value(v.clone()).ok()).unwrap_or_default(),
            
            // Creator info from metadata
            creator_name: metadata.get("creatorName").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            creator_notes: metadata.get("creatorNotes").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            character_version: metadata.get("characterVersion").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            
            // Category tags from metadata
            pov_type: metadata.get("povType").and_then(|v| v.as_str()).unwrap_or("any").to_string(),
            rating: metadata.get("rating").and_then(|v| v.as_str()).unwrap_or("sfw").to_string(),
            genre_tags: metadata.get("genreTags").and_then(|v| serde_json::from_value(v.clone()).ok()).unwrap_or_default(),
            
            metadata,
        })
    }
}

// ============================================
// Persona Repository
// ============================================

pub struct PersonaRepo;

impl PersonaRepo {
    pub fn create(db: &Database, input: &CreatePersonaInput) -> AppResult<Persona> {
        let id = new_id();
        let now = now_timestamp();
        
        // If this is default, unset others
        if input.is_default {
            db.execute("UPDATE personas SET is_default = 0", [])?;
        }
        
        db.execute(
            "INSERT INTO personas (id, name, description, is_default, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                id, input.name, input.description, input.is_default, now, now
            ],
        )?;
        
        Self::find_by_id(db, &id)
    }
    
    pub fn find_by_id(db: &Database, id: &str) -> AppResult<Persona> {
        db.query_one(
            "SELECT * FROM personas WHERE id = ?1 AND deleted_at IS NULL",
            params![id],
            Self::row_to_persona,
        )
    }
    
    pub fn find_all(db: &Database) -> AppResult<Vec<Persona>> {
        db.query_all(
            "SELECT * FROM personas WHERE deleted_at IS NULL ORDER BY is_default DESC, name ASC",
            [],
            Self::row_to_persona,
        )
    }
    
    pub fn find_default(db: &Database) -> AppResult<Option<Persona>> {
        db.query_optional(
            "SELECT * FROM personas WHERE is_default = 1 AND deleted_at IS NULL LIMIT 1",
            [],
            Self::row_to_persona,
        )
    }
    
    pub fn update(db: &Database, id: &str, input: &UpdatePersonaInput) -> AppResult<Persona> {
        let now = now_timestamp();
        
        // Handle default switch
        if input.is_default == Some(true) {
            db.execute("UPDATE personas SET is_default = 0", [])?;
        }
        
        let mut query = "UPDATE personas SET updated_at = ?".to_string();
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(now)];
        
        if let Some(v) = &input.name {
            query.push_str(", name = ?");
            params.push(Box::new(v.clone()));
        }
        if let Some(v) = &input.description {
            query.push_str(", description = ?");
            params.push(Box::new(v.clone()));
        }
        if let Some(v) = input.is_default {
            query.push_str(", is_default = ?");
            params.push(Box::new(v));
        }
        
        query.push_str(" WHERE id = ?");
        params.push(Box::new(id.to_string()));
        
        let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        db.execute(&query, params_refs.as_slice())?;
        
        Self::find_by_id(db, id)
    }
    
    pub fn set_default(db: &Database, id: &str) -> AppResult<Persona> {
        db.transaction(|conn| {
            conn.execute("UPDATE personas SET is_default = 0", [])?;
            conn.execute("UPDATE personas SET is_default = 1, updated_at = ? WHERE id = ?", 
                params![now_timestamp(), id])?;
            Ok(())
        })?;
        Self::find_by_id(db, id)
    }
    
    pub fn delete(db: &Database, id: &str) -> AppResult<()> {
        let now = now_timestamp();
        db.execute(
            "UPDATE personas SET deleted_at = ?1 WHERE id = ?2",
            params![now, id],
        )?;
        Ok(())
    }
    
    fn row_to_persona(row: &rusqlite::Row<'_>) -> rusqlite::Result<Persona> {
        let metadata_str: String = row.get("metadata")?;
        
        Ok(Persona {
            id: row.get("id")?,
            name: row.get("name")?,
            description: row.get("description")?,
            is_default: row.get::<_, i32>("is_default")? != 0,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
            deleted_at: row.get("deleted_at")?,
            metadata: serde_json::from_str(&metadata_str).unwrap_or_default(),
        })
    }
}

// ============================================
// Conversation Repository
// ============================================

pub struct ConversationRepo;

struct ConversationRow {
    id: String,
    title: String,
    persona_id: Option<String>,
    is_group: bool,
    active_message_id: Option<String>,
    created_at: i64,
    updated_at: i64,
    deleted_at: Option<i64>,
    metadata: String,
    character_ids: Vec<String>,
    lorebook_ids: Vec<String>,
}

impl ConversationRepo {
    // Transaction-aware methods for service usage
    pub fn create_with_conn(conn: &rusqlite::Connection, input: &CreateConversationInput) -> AppResult<Conversation> {
        let id = new_id();
        let now = now_timestamp();
        let is_group = input.character_ids.len() > 1;
        
        conn.execute(
            "INSERT INTO conversations (id, title, persona_id, is_group, created_at, updated_at, metadata)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, '{}')",
            params![
                id,
                input.title.as_deref().unwrap_or("New Chat"),
                input.persona_id,
                is_group,
                now,
                now
            ],
        ).map_err(AppError::Database)?;
        
        // Build empty conversation object to return (caller will populate children)
        Ok(Conversation {
            id,
            title: input.title.clone().unwrap_or_else(|| "New Chat".to_string()),
            persona_id: input.persona_id.clone(),
            is_group,
            active_message_id: None,
            created_at: now,
            updated_at: now,
            deleted_at: None,
            metadata: serde_json::Value::Object(Default::default()),
            characters: vec![],
            lorebook_ids: vec![],
        })
    }
    
    pub fn add_character_with_conn(conn: &rusqlite::Connection, conversation_id: &str, character_id: &str, order: usize) -> AppResult<()> {
        conn.execute(
            "INSERT INTO conversation_characters (conversation_id, character_id, join_order)
             VALUES (?1, ?2, ?3)",
            params![conversation_id, character_id, order as i32],
        ).map_err(AppError::Database)?;
        Ok(())
    }

    // Standard methods
    pub fn create(db: &Database, input: &CreateConversationInput) -> AppResult<Conversation> {
        let conv_id = db.transaction(|conn| {
            let conv = Self::create_with_conn(conn, input)?;
            for (idx, char_id) in input.character_ids.iter().enumerate() {
                Self::add_character_with_conn(conn, &conv.id, char_id, idx)?;
            }
            Ok(conv.id)
        })?;
        Self::find_by_id(db, &conv_id)
    }
    
    pub fn find_by_id(db: &Database, id: &str) -> AppResult<Conversation> {
        let conversation_row = db.query_one(
            "SELECT 
                c.*,
                (SELECT GROUP_CONCAT(character_id) FROM conversation_characters WHERE conversation_id = c.id) as character_ids,
                (SELECT GROUP_CONCAT(lorebook_id) FROM conversation_lorebooks WHERE conversation_id = c.id) as lorebook_ids
             FROM conversations c
             WHERE c.id = ?1 AND c.deleted_at IS NULL",
            params![id],
            Self::row_to_conversation_row,
        )?;
        
        // Fetch full character objects
        let characters = if !conversation_row.character_ids.is_empty() {
            let placeholders = conversation_row.character_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
            let params = rusqlite::params_from_iter(conversation_row.character_ids.iter());
            
            db.query_all(
                &format!("SELECT * FROM characters WHERE id IN ({})", placeholders),
                params,
                CharacterRepo::row_to_character,
            )?
        } else {
            Vec::new()
        };
        
        Ok(Conversation {
            id: conversation_row.id,
            title: conversation_row.title,
            persona_id: conversation_row.persona_id,
            is_group: conversation_row.is_group,
            active_message_id: conversation_row.active_message_id,
            created_at: conversation_row.created_at,
            updated_at: conversation_row.updated_at,
            deleted_at: conversation_row.deleted_at,
            metadata: serde_json::from_str(&conversation_row.metadata).unwrap_or_default(),
            characters,
            lorebook_ids: conversation_row.lorebook_ids,
        })
    }
    
    /// Optimized find_all with N+1 fix
    pub fn find_all(db: &Database) -> AppResult<Vec<Conversation>> {
        let rows = db.query_all(
            "SELECT 
                c.*,
                GROUP_CONCAT(DISTINCT cc.character_id) as character_ids,
                GROUP_CONCAT(DISTINCT cl.lorebook_id) as lorebook_ids
             FROM conversations c
             LEFT JOIN conversation_characters cc ON c.id = cc.conversation_id
             LEFT JOIN conversation_lorebooks cl ON c.id = cl.conversation_id
             WHERE c.deleted_at IS NULL
             GROUP BY c.id
             ORDER BY c.updated_at DESC",
            [],
            Self::row_to_conversation_row,
        )?;
        
        // Collect all unique character IDs
        let mut all_char_ids = HashSet::new();
        for row in &rows {
            for id in &row.character_ids {
                all_char_ids.insert(id.clone());
            }
        }
        
        // Batch fetch all characters
        let mut characters_map = HashMap::new();
        if !all_char_ids.is_empty() {
            let placeholders = all_char_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
            let params = rusqlite::params_from_iter(all_char_ids.iter());
            
            let characters = db.query_all(
                &format!("SELECT * FROM characters WHERE id IN ({})", placeholders),
                params,
                CharacterRepo::row_to_character,
            )?;
            
            for c in characters {
                characters_map.insert(c.id.clone(), c);
            }
        }
        
        // Assemble final objects
        Ok(rows.into_iter().map(|row| {
            Conversation {
                id: row.id,
                title: row.title,
                persona_id: row.persona_id,
                is_group: row.is_group,
                active_message_id: row.active_message_id,
                created_at: row.created_at,
                updated_at: row.updated_at,
                deleted_at: row.deleted_at,
                metadata: serde_json::from_str(&row.metadata).unwrap_or_default(),
                characters: row.character_ids.iter()
                    .filter_map(|id| characters_map.get(id).cloned())
                    .collect(),
                lorebook_ids: row.lorebook_ids,
            }
        }).collect())
    }
    
    pub fn update(db: &Database, id: &str, input: &UpdateConversationInput) -> AppResult<Conversation> {
        let now = now_timestamp();
        let mut query = "UPDATE conversations SET updated_at = ?".to_string();
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(now)];
        
        if let Some(v) = &input.title {
            query.push_str(", title = ?");
            params.push(Box::new(v.clone()));
        }
        if let Some(v) = &input.persona_id {
            query.push_str(", persona_id = ?");
            params.push(Box::new(v.clone()));
        }
        
        query.push_str(" WHERE id = ?");
        params.push(Box::new(id.to_string()));
        
        let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        db.execute(&query, params_refs.as_slice())?;
        
        Self::find_by_id(db, id)
    }
    
    pub fn update_active_message(db: &Database, id: &str, message_id: &str) -> AppResult<()> {
        let now = now_timestamp();
        db.execute(
            "UPDATE conversations SET active_message_id = ?1, updated_at = ?2 WHERE id = ?3",
            params![message_id, now, id],
        )?;
        Ok(())
    }
    
    pub fn delete(db: &Database, id: &str) -> AppResult<()> {
        let now = now_timestamp();
        db.execute(
            "UPDATE conversations SET deleted_at = ?1 WHERE id = ?2",
            params![now, id],
        )?;
        Ok(())
    }
    
    pub fn attach_lorebook(db: &Database, conversation_id: &str, lorebook_id: &str) -> AppResult<()> {
        db.execute(
            "INSERT OR IGNORE INTO conversation_lorebooks (conversation_id, lorebook_id) VALUES (?1, ?2)",
            params![conversation_id, lorebook_id],
        )?;
        Ok(())
    }
    
    pub fn detach_lorebook(db: &Database, conversation_id: &str, lorebook_id: &str) -> AppResult<()> {
        db.execute(
            "DELETE FROM conversation_lorebooks WHERE conversation_id = ?1 AND lorebook_id = ?2",
            params![conversation_id, lorebook_id],
        )?;
        Ok(())
    }
    
    /// Find existing conversation with a specific single character
    pub fn find_by_single_character(db: &Database, character_id: &str) -> AppResult<Option<Conversation>> {
        // Find conversations that have ONLY this character
        let conv_ids = db.query_all(
            "SELECT conversation_id 
             FROM conversation_characters 
             GROUP BY conversation_id 
             HAVING COUNT(*) = 1 AND MAX(character_id) = ?1",
            params![character_id],
            |row| row.get::<_, String>(0),
        )?;
        
        // Check first valid one
        for cid in conv_ids {
            if let Ok(conv) = Self::find_by_id(db, &cid) {
                if conv.deleted_at.is_none() {
                    return Ok(Some(conv));
                }
            }
        }
        
        Ok(None)
    }
    
    fn row_to_conversation_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<ConversationRow> {
        let char_ids_str: Option<String> = row.get("character_ids")?;
        let lb_ids_str: Option<String> = row.get("lorebook_ids")?;
        
        Ok(ConversationRow {
            id: row.get("id")?,
            title: row.get("title")?,
            persona_id: row.get("persona_id")?,
            is_group: row.get::<_, i32>("is_group")? != 0,
            active_message_id: row.get("active_message_id")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
            deleted_at: row.get("deleted_at")?,
            metadata: row.get("metadata")?,
            character_ids: char_ids_str
                .map(|s| s.split(',').map(String::from).collect())
                .unwrap_or_default(),
            lorebook_ids: lb_ids_str
                .map(|s| s.split(',').map(String::from).collect())
                .unwrap_or_default(),
        })
    }
}

// ============================================
// Message Repository
// ============================================

pub struct MessageRepo;

impl MessageRepo {
    pub fn create(db: &Database, message: &Message) -> AppResult<Message> {
        db.execute(
            "INSERT INTO messages (id, conversation_id, parent_id, author_type, author_id, content,
             is_active_branch, branch_index, token_count, generation_params, created_at, metadata)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, '{}')",
            params![
                message.id, message.conversation_id, message.parent_id, message.author_type.as_str(),
                message.author_id, message.content, message.is_active_branch,
                message.branch_index, message.token_count, 
                message.generation_params.as_ref().map(|p| serde_json::to_string(p).unwrap_or_default()),
                message.created_at
            ],
        )?;
        
        Self::find_by_id(db, &message.id)
    }
    
    // For service use inside transaction
    pub fn create_with_conn(conn: &rusqlite::Connection, message: &Message) -> AppResult<()> {
        conn.execute(
            "INSERT INTO messages (id, conversation_id, parent_id, author_type, author_id, content,
             is_active_branch, branch_index, token_count, generation_params, created_at, metadata)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, '{}')",
            params![
                message.id, message.conversation_id, message.parent_id, message.author_type.as_str(),
                message.author_id, message.content, message.is_active_branch,
                message.branch_index, message.token_count, 
                message.generation_params.as_ref().map(|p| serde_json::to_string(p).unwrap_or_default()),
                message.created_at
            ],
        ).map_err(AppError::Database)?;
        Ok(())
    }
    
    pub fn find_by_id(db: &Database, id: &str) -> AppResult<Message> {
        db.query_one(
            "SELECT m.*, c.name as author_name
             FROM messages m
             LEFT JOIN characters c ON m.author_id = c.id
             WHERE m.id = ?1",
            params![id],
            Self::row_to_message,
        )
    }
    
    pub fn find_active_branch(db: &Database, conversation_id: &str) -> AppResult<Vec<Message>> {
        db.query_all(
            "SELECT m.*, c.name as author_name
             FROM messages m
             LEFT JOIN characters c ON m.author_id = c.id
             WHERE m.conversation_id = ?1 AND m.is_active_branch = 1
             ORDER BY m.created_at ASC",
            params![conversation_id],
            Self::row_to_message,
        )
    }
    
    pub fn find_siblings(db: &Database, message_id: &str) -> AppResult<Vec<Message>> {
        let message = Self::find_by_id(db, message_id)?;
        
        if let Some(parent_id) = &message.parent_id {
            db.query_all(
                "SELECT m.*, c.name as author_name
                 FROM messages m
                 LEFT JOIN characters c ON m.author_id = c.id
                 WHERE m.parent_id = ?1
                 ORDER BY m.branch_index ASC",
                params![parent_id],
                Self::row_to_message,
            )
        } else {
            db.query_all(
                "SELECT m.*, c.name as author_name
                 FROM messages m
                 LEFT JOIN characters c ON m.author_id = c.id
                 WHERE m.conversation_id = ?1 AND m.parent_id IS NULL
                 ORDER BY m.branch_index ASC",
                params![message.conversation_id],
                Self::row_to_message,
            )
        }
    }
    
    pub fn find_children(db: &Database, parent_id: &str) -> AppResult<Vec<Message>> {
        db.query_all(
            "SELECT m.*, c.name as author_name
             FROM messages m
             LEFT JOIN characters c ON m.author_id = c.id
             WHERE m.parent_id = ?1
             ORDER BY m.branch_index ASC",
            params![parent_id],
            Self::row_to_message,
        )
    }
    
    pub fn find_active_child(db: &Database, parent_id: &str) -> AppResult<Option<Message>> {
        db.query_optional(
            "SELECT m.*, c.name as author_name
             FROM messages m
             LEFT JOIN characters c ON m.author_id = c.id
             WHERE m.parent_id = ?1 AND m.is_active_branch = 1
             LIMIT 1",
            params![parent_id],
            Self::row_to_message,
        )
    }
    
    pub fn find_deepest_active(db: &Database, start_id: &str) -> AppResult<Message> {
        let mut current = Self::find_by_id(db, start_id)?;
        
        loop {
            match Self::find_active_child(db, &current.id)? {
                Some(child) => current = child,
                None => break,
            }
        }
        
        Ok(current)
    }
    
    /// Get the next branch index for a new message
    /// FIXED: Uses COALESCE to handle NULL when no messages exist
    pub fn get_next_branch_index(db: &Database, parent_id: Option<&str>, conversation_id: &str) -> AppResult<i32> {
        // COALESCE ensures we get -1 when there are no messages (MAX returns NULL)
        // This query always returns exactly one row with an integer value
        let max_index: i32 = if let Some(pid) = parent_id {
            db.query_one(
                "SELECT COALESCE(MAX(branch_index), -1) FROM messages WHERE parent_id = ?1",
                params![pid],
                |row| row.get(0),
            )?
        } else {
            db.query_one(
                "SELECT COALESCE(MAX(branch_index), -1) FROM messages WHERE conversation_id = ?1 AND parent_id IS NULL",
                params![conversation_id],
                |row| row.get(0),
            )?
        };
        
        Ok(max_index + 1)
    }
    
    pub fn update_content(db: &Database, id: &str, content: &str, token_count: i32) -> AppResult<()> {
        db.execute(
            "UPDATE messages SET content = ?1, token_count = ?2 WHERE id = ?3",
            params![content, token_count, id],
        )?;
        Ok(())
    }
    
    pub fn set_branch_active(db: &Database, id: &str, active: bool) -> AppResult<()> {
        db.execute(
            "UPDATE messages SET is_active_branch = ?1 WHERE id = ?2",
            params![active, id],
        )?;
        Ok(())
    }
    
    pub fn deactivate_subtree(db: &Database, root_id: &str) -> AppResult<()> {
        db.execute(
            "WITH RECURSIVE descendants AS (
                SELECT id FROM messages WHERE id = ?1
                UNION ALL
                SELECT m.id FROM messages m 
                INNER JOIN descendants d ON m.parent_id = d.id
            )
            UPDATE messages SET is_active_branch = 0 
            WHERE id IN (SELECT id FROM descendants)",
            params![root_id],
        )?;
        Ok(())
    }
    
    pub fn activate_path_to_root(db: &Database, message_id: &str) -> AppResult<()> {
        db.execute(
            "WITH RECURSIVE ancestors AS (
                SELECT id, parent_id FROM messages WHERE id = ?1
                UNION ALL
                SELECT m.id, m.parent_id FROM messages m 
                INNER JOIN ancestors a ON m.id = a.parent_id
            )
            UPDATE messages SET is_active_branch = 1 
            WHERE id IN (SELECT id FROM ancestors)",
            params![message_id],
        )?;
        Ok(())
    }
    
    pub fn switch_to_branch(db: &Database, message_id: &str) -> AppResult<Vec<Message>> {
        let target_message = Self::find_by_id(db, message_id)?;
        let siblings = Self::find_siblings(db, message_id)?;
        
        for sibling in &siblings {
            if sibling.is_active_branch && sibling.id != message_id {
                Self::deactivate_subtree(db, &sibling.id)?;
            }
        }
        
        Self::set_branch_active(db, message_id, true)?;
        Self::activate_path_to_root(db, message_id)?;
        Self::activate_deepest_path(db, message_id)?;
        
        let deepest = Self::find_deepest_active(db, message_id)?;
        ConversationRepo::update_active_message(db, &target_message.conversation_id, &deepest.id)?;
        
        Self::find_active_branch(db, &target_message.conversation_id)
    }
    
    fn activate_deepest_path(db: &Database, start_id: &str) -> AppResult<()> {
        let mut current_id = start_id.to_string();
        
        loop {
            let children = Self::find_children(db, &current_id)?;
            if children.is_empty() { break; }
            
            let next = children.iter().find(|c| c.is_active_branch).or_else(|| children.first());
            match next {
                Some(child) => {
                    Self::set_branch_active(db, &child.id, true)?;
                    current_id = child.id.clone();
                }
                None => break,
            }
        }
        Ok(())
    }
    
    pub fn delete(db: &Database, id: &str) -> AppResult<()> {
        db.execute("DELETE FROM messages WHERE id = ?1", params![id])?;
        Ok(())
    }
    
    /// Count siblings for all messages in a conversation (Efficiency Boost)
    pub fn count_all_siblings(db: &Database, conversation_id: &str) -> AppResult<HashMap<String, i32>> {
        let rows = db.query_all(
            "SELECT id, parent_id FROM messages WHERE conversation_id = ?1",
            params![conversation_id],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, Option<String>>(1)?))
        )?;
        
        // Build map of parent -> count
        let mut parent_counts = HashMap::new();
        let mut root_count = 0;
        
        for (_, parent_id) in &rows {
            if let Some(pid) = parent_id {
                *parent_counts.entry(pid.clone()).or_insert(0) += 1;
            } else {
                root_count += 1;
            }
        }
        
        // Build map of message_id -> sibling_count
        let mut result = HashMap::new();
        for (id, parent_id) in rows {
            let count = if let Some(pid) = parent_id {
                *parent_counts.get(&pid).unwrap_or(&0)
            } else {
                root_count
            };
            result.insert(id, count);
        }
        
        Ok(result)
    }
    
    fn row_to_message(row: &rusqlite::Row<'_>) -> rusqlite::Result<Message> {
        let author_type_str: String = row.get("author_type")?;
        let author_type = AuthorType::from_str(&author_type_str).unwrap_or(AuthorType::System);
        let gen_params: Option<String> = row.get("generation_params")?;
        let metadata_str: String = row.get("metadata")?;
        
        Ok(Message {
            id: row.get("id")?,
            conversation_id: row.get("conversation_id")?,
            parent_id: row.get("parent_id")?,
            author_type,
            author_id: row.get("author_id")?,
            content: row.get("content")?,
            is_active_branch: row.get::<_, i32>("is_active_branch")? != 0,
            branch_index: row.get("branch_index")?,
            token_count: row.get("token_count")?,
            generation_params: gen_params.and_then(|s| serde_json::from_str(&s).ok()),
            created_at: row.get("created_at")?,
            metadata: serde_json::from_str(&metadata_str).unwrap_or_default(),
            author_name: row.get_optional(12)?, // author_name is joined
            sibling_count: None, // Filled later
        })
    }
}

// ============================================
// Lorebook Repository
// ============================================

pub struct LorebookRepo;

impl LorebookRepo {
    pub fn create(db: &Database, input: &CreateLorebookInput) -> AppResult<Lorebook> {
        let id = new_id();
        let now = now_timestamp();
        
        db.execute(
            "INSERT INTO lorebooks (id, name, description, is_global, is_enabled, created_at, updated_at, metadata)
             VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6, '{}')",
            params![
                id, input.name, input.description.clone().unwrap_or_default(),
                input.is_global.unwrap_or(false), now, now
            ],
        )?;
        
        Self::find_by_id(db, &id)
    }
    
    pub fn find_by_id(db: &Database, id: &str) -> AppResult<Lorebook> {
        let lorebook = db.query_one(
            "SELECT * FROM lorebooks WHERE id = ?1 AND deleted_at IS NULL",
            params![id],
            Self::row_to_lorebook,
        )?;
        
        let entries = db.query_all(
            "SELECT * FROM lorebook_entries WHERE lorebook_id = ?1 ORDER BY priority DESC",
            params![id],
            Self::row_to_entry,
        )?;
        
        Ok(Lorebook { entries, ..lorebook })
    }
    
    pub fn find_all(db: &Database) -> AppResult<Vec<Lorebook>> {
        // Fetch all lorebooks
        let mut lorebooks = db.query_all(
            "SELECT * FROM lorebooks WHERE deleted_at IS NULL ORDER BY name ASC",
            [],
            Self::row_to_lorebook,
        )?;
        
        // Fetch all entries in one go
        let entries = db.query_all(
            "SELECT * FROM lorebook_entries ORDER BY priority DESC",
            [],
            Self::row_to_entry,
        )?;
        
        // Group entries by lorebook_id
        let mut entries_map: HashMap<String, Vec<LorebookEntry>> = HashMap::new();
        for entry in entries {
            entries_map.entry(entry.lorebook_id.clone()).or_default().push(entry);
        }
        
        // Assign entries
        for lb in &mut lorebooks {
            if let Some(e) = entries_map.remove(&lb.id) {
                lb.entries = e;
            }
        }
        
        Ok(lorebooks)
    }
    
    pub fn find_global(db: &Database) -> AppResult<Vec<Lorebook>> {
        let mut lorebooks = db.query_all(
            "SELECT * FROM lorebooks WHERE is_global = 1 AND is_enabled = 1 AND deleted_at IS NULL",
            [],
            Self::row_to_lorebook,
        )?;
        
        // Populate entries (simplified N+1 fix for now since global lorebooks are few)
        for lb in &mut lorebooks {
            lb.entries = db.query_all(
                "SELECT * FROM lorebook_entries WHERE lorebook_id = ?1 AND is_enabled = 1 ORDER BY priority DESC",
                params![lb.id],
                Self::row_to_entry,
            )?;
        }
        
        Ok(lorebooks)
    }
    
    pub fn update(db: &Database, id: &str, input: &UpdateLorebookInput) -> AppResult<Lorebook> {
        let now = now_timestamp();
        let mut query = "UPDATE lorebooks SET updated_at = ?".to_string();
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(now)];
        
        if let Some(v) = &input.name {
            query.push_str(", name = ?");
            params.push(Box::new(v.clone()));
        }
        if let Some(v) = &input.description {
            query.push_str(", description = ?");
            params.push(Box::new(v.clone()));
        }
        if let Some(v) = input.is_global {
            query.push_str(", is_global = ?");
            params.push(Box::new(v));
        }
        if let Some(v) = input.is_enabled {
            query.push_str(", is_enabled = ?");
            params.push(Box::new(v));
        }
        
        query.push_str(" WHERE id = ?");
        params.push(Box::new(id.to_string()));
        
        let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        db.execute(&query, params_refs.as_slice())?;
        
        Self::find_by_id(db, id)
    }
    
    pub fn delete(db: &Database, id: &str) -> AppResult<()> {
        let now = now_timestamp();
        db.execute("UPDATE lorebooks SET deleted_at = ?1 WHERE id = ?2", params![now, id])?;
        Ok(())
    }
    
    pub fn create_entry(db: &Database, input: &CreateEntryInput) -> AppResult<LorebookEntry> {
        let id = new_id();
        let now = now_timestamp();
        let keywords_json = serde_json::to_string(&input.keywords)?;
        
        db.execute(
            "INSERT INTO lorebook_entries (id, lorebook_id, name, keywords, content, priority, 
             case_sensitive, match_whole_word, insertion_position, token_budget, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                id, input.lorebook_id, input.name, keywords_json, input.content,
                input.priority.unwrap_or(50), input.case_sensitive.unwrap_or(false),
                input.match_whole_word.unwrap_or(true),
                input.insertion_position.as_deref().unwrap_or("after_system"),
                input.token_budget, now
            ],
        )?;
        
        db.query_one(
            "SELECT * FROM lorebook_entries WHERE id = ?1",
            params![id],
            Self::row_to_entry,
        )
    }
    
    pub fn update_entry(db: &Database, id: &str, input: &UpdateEntryInput) -> AppResult<LorebookEntry> {
        let mut query = "UPDATE lorebook_entries SET id = id".to_string(); // Dummy to start
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![];
        
        if let Some(v) = &input.name {
            query.push_str(", name = ?");
            params.push(Box::new(v.clone()));
        }
        if let Some(v) = &input.keywords {
            let json = serde_json::to_string(v)?;
            query.push_str(", keywords = ?");
            params.push(Box::new(json));
        }
        if let Some(v) = &input.content {
            query.push_str(", content = ?");
            params.push(Box::new(v.clone()));
        }
        if let Some(v) = input.priority {
            query.push_str(", priority = ?");
            params.push(Box::new(v));
        }
        if let Some(v) = input.is_enabled {
            query.push_str(", is_enabled = ?");
            params.push(Box::new(v));
        }
        if let Some(v) = input.case_sensitive {
            query.push_str(", case_sensitive = ?");
            params.push(Box::new(v));
        }
        if let Some(v) = input.match_whole_word {
            query.push_str(", match_whole_word = ?");
            params.push(Box::new(v));
        }
        if let Some(v) = &input.insertion_position {
            query.push_str(", insertion_position = ?");
            params.push(Box::new(v.clone()));
        }
        if let Some(v) = input.token_budget {
            query.push_str(", token_budget = ?");
            params.push(Box::new(v));
        }
        
        query.push_str(" WHERE id = ?");
        params.push(Box::new(id.to_string()));
        
        let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        db.execute(&query, params_refs.as_slice())?;
        
        db.query_one(
            "SELECT * FROM lorebook_entries WHERE id = ?1",
            params![id],
            Self::row_to_entry,
        )
    }
    
    pub fn delete_entry(db: &Database, id: &str) -> AppResult<()> {
        db.execute("DELETE FROM lorebook_entries WHERE id = ?1", params![id])?;
        Ok(())
    }
    
    fn row_to_lorebook(row: &rusqlite::Row<'_>) -> rusqlite::Result<Lorebook> {
        let metadata_str: String = row.get("metadata")?;
        Ok(Lorebook {
            id: row.get("id")?,
            name: row.get("name")?,
            description: row.get("description")?,
            is_global: row.get::<_, i32>("is_global")? != 0,
            is_enabled: row.get::<_, i32>("is_enabled")? != 0,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
            deleted_at: row.get("deleted_at")?,
            metadata: serde_json::from_str(&metadata_str).unwrap_or_default(),
            entries: vec![],
        })
    }
    
    fn row_to_entry(row: &rusqlite::Row<'_>) -> rusqlite::Result<LorebookEntry> {
        let keywords_str: String = row.get("keywords")?;
        let metadata_str: String = row.get("metadata")?;
        
        Ok(LorebookEntry {
            id: row.get("id")?,
            lorebook_id: row.get("lorebook_id")?,
            name: row.get("name")?,
            keywords: serde_json::from_str(&keywords_str).unwrap_or_default(),
            content: row.get("content")?,
            priority: row.get("priority")?,
            is_enabled: row.get::<_, i32>("is_enabled")? != 0,
            case_sensitive: row.get::<_, i32>("case_sensitive")? != 0,
            match_whole_word: row.get::<_, i32>("match_whole_word")? != 0,
            insertion_position: row.get("insertion_position")?,
            token_budget: row.get("token_budget")?,
            created_at: row.get("created_at")?,
            metadata: serde_json::from_str(&metadata_str).unwrap_or_default(),
        })
    }
}

// ============================================
// Settings Repository
// ============================================

pub struct SettingsRepo;

impl SettingsRepo {
    pub fn get_all(db: &Database) -> AppResult<Settings> {
        let rows = db.query_all(
            "SELECT key, value FROM settings",
            [],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
        )?;
        
        let mut map = HashMap::new();
        for (k, v) in rows {
            map.insert(k, v);
        }
        
        let mut settings = Settings::default();
        
        // Helper to parse value or return default
        let parse = |key: &str, default: String| -> String {
            map.get(key).cloned().unwrap_or(default)
        };
        
        let parse_f32 = |key: &str, def: f32| -> f32 {
            map.get(key).and_then(|s| s.parse().ok()).unwrap_or(def)
        };
        
        let parse_i32 = |key: &str, def: i32| -> i32 {
            map.get(key).and_then(|s| s.parse().ok()).unwrap_or(def)
        };
        
        let parse_bool = |key: &str, def: bool| -> bool {
            map.get(key).map(|s| s == "true").unwrap_or(def)
        };
        
        settings.generation.temperature = parse_f32("generation.temperature", 0.8);
        settings.generation.max_tokens = parse_i32("generation.max_tokens", 512);
        settings.generation.top_p = parse_f32("generation.top_p", 0.9);
        settings.generation.context_size = parse_i32("generation.context_size", 4096);
        
        settings.app.theme = parse("app.theme", "\"dark\"".to_string()).replace("\"", "");
        settings.app.first_run = parse_bool("app.first_run", true);
        
        settings.model.path = parse("model.path", "".to_string());
        settings.model.gpu_layers = parse_i32("model.gpu_layers", 99);
        
        Ok(settings)
    }
    
    pub fn get(db: &Database, key: &str) -> AppResult<Option<String>> {
        db.query_optional(
            "SELECT value FROM settings WHERE key = ?1",
            params![key],
            |row| row.get(0),
        )
    }
    
    pub fn set(db: &Database, key: &str, value: &str) -> AppResult<()> {
        let now = now_timestamp();
        db.execute(
            "INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)
             ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?3",
            params![key, value, now],
        )?;
        Ok(())
    }
}

// ============================================
// Queue Repository
// ============================================

pub struct QueueRepo;

impl QueueRepo {
    pub fn enqueue(db: &Database, task: &QueueTask) -> AppResult<QueueTask> {
        let status = task.status.to_string();
        db.execute(
            "INSERT INTO message_queue (id, conversation_id, parent_message_id, target_character_id, 
             status, priority, created_at, metadata)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                task.id, task.conversation_id, task.parent_message_id, task.target_character_id,
                status, task.priority, task.created_at, "{}"
            ],
        )?;
        Ok(task.clone())
    }
    
    pub fn get_next_pending(db: &Database) -> AppResult<Option<QueueTask>> {
        db.query_optional(
            "SELECT * FROM message_queue WHERE status = 'pending' 
             ORDER BY priority DESC, created_at ASC LIMIT 1",
            [],
            Self::row_to_task,
        )
    }
    
    pub fn update_status(db: &Database, id: &str, status: QueueStatus, error: Option<&str>) -> AppResult<()> {
        let now = now_timestamp();
        let status_str = status.to_string();
        
        if status == QueueStatus::Processing {
            db.execute(
                "UPDATE message_queue SET status = ?1, started_at = ?2 WHERE id = ?3",
                params![status_str, now, id],
            )?;
        } else if status == QueueStatus::Completed || status == QueueStatus::Failed || status == QueueStatus::Cancelled {
            db.execute(
                "UPDATE message_queue SET status = ?1, completed_at = ?2, error_message = ?3 WHERE id = ?4",
                params![status_str, now, error, id],
            )?;
        } else {
            db.execute(
                "UPDATE message_queue SET status = ?1 WHERE id = ?2",
                params![status_str, id],
            )?;
        }
        Ok(())
    }
    
    pub fn cancel_for_conversation(db: &Database, conversation_id: &str) -> AppResult<()> {
        let now = now_timestamp();
        db.execute(
            "UPDATE message_queue SET status = 'cancelled', completed_at = ?1 
             WHERE conversation_id = ?2 AND status IN ('pending', 'processing')",
            params![now, conversation_id],
        )?;
        Ok(())
    }
    
    fn row_to_task(row: &rusqlite::Row<'_>) -> rusqlite::Result<QueueTask> {
        let status_str: String = row.get("status")?;
        let status = QueueStatus::from_str(&status_str).unwrap_or(QueueStatus::Failed);
        let metadata_str: String = row.get("metadata")?;
        
        Ok(QueueTask {
            id: row.get("id")?,
            conversation_id: row.get("conversation_id")?,
            parent_message_id: row.get("parent_message_id")?,
            target_character_id: row.get("target_character_id")?,
            status,
            priority: row.get("priority")?,
            created_at: row.get("created_at")?,
            started_at: row.get("started_at")?,
            completed_at: row.get("completed_at")?,
            error_message: row.get("error_message")?,
            metadata: serde_json::from_str(&metadata_str).unwrap_or_default(),
        })
    }
}

// ============================================
// Download Repository
// ============================================

pub struct DownloadRepo;

impl DownloadRepo {
    pub fn create(db: &Database, download: &Download) -> AppResult<Download> {
        let status = download.status.to_string();
        db.execute(
            "INSERT INTO downloads (id, url, destination_path, total_bytes, downloaded_bytes, 
             status, checksum, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                download.id, download.url, download.destination_path, download.total_bytes,
                download.downloaded_bytes, status, download.checksum, download.created_at, download.updated_at
            ],
        )?;
        Ok(download.clone())
    }
    
    pub fn find_by_id(db: &Database, id: &str) -> AppResult<Download> {
        db.query_one(
            "SELECT * FROM downloads WHERE id = ?1",
            params![id],
            Self::row_to_download,
        )
    }
    
    pub fn find_active(db: &Database) -> AppResult<Option<Download>> {
        db.query_optional(
            "SELECT * FROM downloads WHERE status IN ('pending', 'downloading', 'paused') LIMIT 1",
            [],
            Self::row_to_download,
        )
    }
    
    pub fn update_status(db: &Database, id: &str, status: DownloadStatus, error: Option<&str>) -> AppResult<()> {
        let now = now_timestamp();
        let status_str = status.to_string();
        
        db.execute(
            "UPDATE downloads SET status = ?1, updated_at = ?2, error_message = ?3 WHERE id = ?4",
            params![status_str, now, error, id],
        )?;
        Ok(())
    }
    
    pub fn update_progress(db: &Database, id: &str, bytes: i64) -> AppResult<()> {
        let now = now_timestamp();
        if bytes >= 0 {
            db.execute(
                "UPDATE downloads SET downloaded_bytes = ?1, updated_at = ?2 WHERE id = ?3",
                params![bytes, now, id],
            )?;
        } else {
            // Just touch timestamp
            db.execute(
                "UPDATE downloads SET updated_at = ?1 WHERE id = ?2",
                params![now, id],
            )?;
        }
        Ok(())
    }
    
    fn row_to_download(row: &rusqlite::Row<'_>) -> rusqlite::Result<Download> {
        let status_str: String = row.get("status")?;
        let status = DownloadStatus::from_str(&status_str).unwrap_or(DownloadStatus::Failed);
        
        Ok(Download {
            id: row.get("id")?,
            url: row.get("url")?,
            destination_path: row.get("destination_path")?,
            total_bytes: row.get("total_bytes")?,
            downloaded_bytes: row.get("downloaded_bytes")?,
            status,
            checksum: row.get("checksum")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
            error_message: row.get("error_message")?,
        })
    }
}