use rusqlite::params;
use crate::database::Database;
use crate::entities::*;
use crate::error::{AppError, AppResult};

// ============================================
// Persona Repository
// ============================================

pub struct PersonaRepo;

impl PersonaRepo {
    pub fn create(db: &Database, input: &CreatePersonaInput) -> AppResult<Persona> {
        let id = new_id();
        let now = now_timestamp();
        
        // If this is default, unset other defaults first
        if input.is_default {
            db.execute(
                "UPDATE personas SET is_default = 0 WHERE is_default = 1 AND deleted_at IS NULL",
                [],
            )?;
        }
        
        db.execute(
            "INSERT INTO personas (id, name, description, is_default, created_at, updated_at, metadata)
             VALUES (?1, ?2, ?3, ?4, ?5, ?5, '{}')",
            params![id, input.name, input.description, input.is_default, now],
        )?;
        
        Self::find_by_id(db, &id)
    }
    
    pub fn find_by_id(db: &Database, id: &str) -> AppResult<Persona> {
        db.query_one(
            "SELECT id, name, description, is_default, created_at, updated_at, deleted_at, metadata
             FROM personas WHERE id = ?1 AND deleted_at IS NULL",
            params![id],
            |row| Ok(Persona {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                is_default: row.get::<_, i32>(3)? != 0,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                deleted_at: row.get(6)?,
                metadata: serde_json::from_str(&row.get::<_, String>(7)?).unwrap_or_default(),
            }),
        )
    }
    
    pub fn find_all(db: &Database) -> AppResult<Vec<Persona>> {
        db.query_all(
            "SELECT id, name, description, is_default, created_at, updated_at, deleted_at, metadata
             FROM personas WHERE deleted_at IS NULL ORDER BY is_default DESC, name ASC",
            [],
            |row| Ok(Persona {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                is_default: row.get::<_, i32>(3)? != 0,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                deleted_at: row.get(6)?,
                metadata: serde_json::from_str(&row.get::<_, String>(7)?).unwrap_or_default(),
            }),
        )
    }
    
    pub fn find_default(db: &Database) -> AppResult<Option<Persona>> {
        db.query_optional(
            "SELECT id, name, description, is_default, created_at, updated_at, deleted_at, metadata
             FROM personas WHERE is_default = 1 AND deleted_at IS NULL LIMIT 1",
            [],
            |row| Ok(Persona {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                is_default: row.get::<_, i32>(3)? != 0,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                deleted_at: row.get(6)?,
                metadata: serde_json::from_str(&row.get::<_, String>(7)?).unwrap_or_default(),
            }),
        )
    }
    
    pub fn update(db: &Database, id: &str, input: &UpdatePersonaInput) -> AppResult<Persona> {
        let existing = Self::find_by_id(db, id)?;
        let now = now_timestamp();
        
        let name = input.name.as_ref().unwrap_or(&existing.name);
        let description = input.description.as_ref().unwrap_or(&existing.description);
        let is_default = input.is_default.unwrap_or(existing.is_default);
        
        if is_default && !existing.is_default {
            db.execute(
                "UPDATE personas SET is_default = 0 WHERE is_default = 1 AND deleted_at IS NULL",
                [],
            )?;
        }
        
        db.execute(
            "UPDATE personas SET name = ?1, description = ?2, is_default = ?3, updated_at = ?4 WHERE id = ?5",
            params![name, description, is_default, now, id],
        )?;
        
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
    
    pub fn set_default(db: &Database, id: &str) -> AppResult<Persona> {
        db.execute(
            "UPDATE personas SET is_default = 0 WHERE is_default = 1 AND deleted_at IS NULL",
            [],
        )?;
        db.execute(
            "UPDATE personas SET is_default = 1, updated_at = ?1 WHERE id = ?2",
            params![now_timestamp(), id],
        )?;
        Self::find_by_id(db, id)
    }
}

// ============================================
// Character Repository
// ============================================

pub struct CharacterRepo;

impl CharacterRepo {
    pub fn create(db: &Database, input: &CreateCharacterInput) -> AppResult<Character> {
        let id = new_id();
        let now = now_timestamp();
        let tags_json = serde_json::to_string(&input.tags)?;
        
        db.execute(
            "INSERT INTO characters (id, name, description, personality, system_prompt, first_message, 
             example_dialogues, avatar_path, tags, is_bundled, created_at, updated_at, metadata)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, ?10, ?10, '{}')",
            params![
                id, input.name, input.description, input.personality, input.system_prompt,
                input.first_message, input.example_dialogues, input.avatar_path, tags_json, now
            ],
        )?;
        
        Self::find_by_id(db, &id)
    }
    
    pub fn create_bundled(db: &Database, input: &CreateCharacterInput, char_id: &str) -> AppResult<Character> {
        let now = now_timestamp();
        let tags_json = serde_json::to_string(&input.tags)?;
        
        // Check if already exists
        if let Ok(existing) = Self::find_by_id(db, char_id) {
            return Ok(existing);
        }
        
        db.execute(
            "INSERT INTO characters (id, name, description, personality, system_prompt, first_message, 
             example_dialogues, avatar_path, tags, is_bundled, created_at, updated_at, metadata)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 1, ?10, ?10, '{}')",
            params![
                char_id, input.name, input.description, input.personality, input.system_prompt,
                input.first_message, input.example_dialogues, input.avatar_path, tags_json, now
            ],
        )?;
        
        Self::find_by_id(db, char_id)
    }
    
    pub fn find_by_id(db: &Database, id: &str) -> AppResult<Character> {
        db.query_one(
            "SELECT id, name, description, personality, system_prompt, first_message, example_dialogues,
             avatar_path, tags, is_bundled, created_at, updated_at, deleted_at, metadata
             FROM characters WHERE id = ?1 AND deleted_at IS NULL",
            params![id],
            Self::row_to_character,
        )
    }
    
    pub fn find_all(db: &Database) -> AppResult<Vec<Character>> {
        db.query_all(
            "SELECT id, name, description, personality, system_prompt, first_message, example_dialogues,
             avatar_path, tags, is_bundled, created_at, updated_at, deleted_at, metadata
             FROM characters WHERE deleted_at IS NULL ORDER BY created_at DESC",
            [],
            Self::row_to_character,
        )
    }
    
    pub fn update(db: &Database, id: &str, input: &UpdateCharacterInput) -> AppResult<Character> {
        let existing = Self::find_by_id(db, id)?;
        let now = now_timestamp();
        
        let name = input.name.as_ref().unwrap_or(&existing.name);
        let description = input.description.as_ref().unwrap_or(&existing.description);
        let personality = input.personality.as_ref().unwrap_or(&existing.personality);
        let system_prompt = input.system_prompt.as_ref().unwrap_or(&existing.system_prompt);
        let first_message = input.first_message.as_ref().unwrap_or(&existing.first_message);
        let example_dialogues = input.example_dialogues.as_ref().unwrap_or(&existing.example_dialogues);
        let avatar_path = input.avatar_path.as_ref().or(existing.avatar_path.as_ref());
        let tags = input.tags.as_ref().unwrap_or(&existing.tags);
        let tags_json = serde_json::to_string(tags)?;
        
        db.execute(
            "UPDATE characters SET name = ?1, description = ?2, personality = ?3, system_prompt = ?4,
             first_message = ?5, example_dialogues = ?6, avatar_path = ?7, tags = ?8, updated_at = ?9
             WHERE id = ?10",
            params![
                name, description, personality, system_prompt, first_message,
                example_dialogues, avatar_path, tags_json, now, id
            ],
        )?;
        
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
    
    fn row_to_character(row: &rusqlite::Row<'_>) -> rusqlite::Result<Character> {
        Ok(Character {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            personality: row.get(3)?,
            system_prompt: row.get(4)?,
            first_message: row.get(5)?,
            example_dialogues: row.get(6)?,
            avatar_path: row.get(7)?,
            tags: serde_json::from_str(&row.get::<_, String>(8)?).unwrap_or_default(),
            is_bundled: row.get::<_, i32>(9)? != 0,
            created_at: row.get(10)?,
            updated_at: row.get(11)?,
            deleted_at: row.get(12)?,
            metadata: serde_json::from_str(&row.get::<_, String>(13)?).unwrap_or_default(),
        })
    }
}

// ============================================
// Conversation Repository
// ============================================

pub struct ConversationRepo;

impl ConversationRepo {
    pub fn create(db: &Database, input: &CreateConversationInput) -> AppResult<Conversation> {
        let id = new_id();
        let now = now_timestamp();
        let is_group = input.character_ids.len() > 1;
        let title = input.title.clone().unwrap_or_else(|| "New Conversation".to_string());
        
        db.execute(
            "INSERT INTO conversations (id, title, persona_id, is_group, created_at, updated_at, metadata)
             VALUES (?1, ?2, ?3, ?4, ?5, ?5, '{}')",
            params![id, title, input.persona_id, is_group, now],
        )?;
        
        // Add characters to conversation
        for (idx, char_id) in input.character_ids.iter().enumerate() {
            db.execute(
                "INSERT INTO conversation_characters (conversation_id, character_id, join_order, is_active)
                 VALUES (?1, ?2, ?3, 1)",
                params![id, char_id, idx as i32],
            )?;
        }
        
        Self::find_by_id(db, &id)
    }
    
    pub fn find_by_id(db: &Database, id: &str) -> AppResult<Conversation> {
        let conv = db.query_one(
            "SELECT id, title, persona_id, is_group, active_message_id, created_at, updated_at, 
             deleted_at, metadata FROM conversations WHERE id = ?1 AND deleted_at IS NULL",
            params![id],
            |row| Ok(Conversation {
                id: row.get(0)?,
                title: row.get(1)?,
                persona_id: row.get(2)?,
                is_group: row.get::<_, i32>(3)? != 0,
                active_message_id: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                deleted_at: row.get(7)?,
                metadata: serde_json::from_str(&row.get::<_, String>(8)?).unwrap_or_default(),
                characters: vec![],
                lorebook_ids: vec![],
            }),
        )?;
        
        // Load characters
        let characters = Self::get_characters(db, id)?;
        
        // Load lorebook IDs
        let lorebook_ids = Self::get_lorebook_ids(db, id)?;
        
        Ok(Conversation { characters, lorebook_ids, ..conv })
    }
    
    pub fn find_all(db: &Database) -> AppResult<Vec<Conversation>> {
        let convs = db.query_all(
            "SELECT id, title, persona_id, is_group, active_message_id, created_at, updated_at,
             deleted_at, metadata FROM conversations WHERE deleted_at IS NULL ORDER BY updated_at DESC",
            [],
            |row| Ok(Conversation {
                id: row.get(0)?,
                title: row.get(1)?,
                persona_id: row.get(2)?,
                is_group: row.get::<_, i32>(3)? != 0,
                active_message_id: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                deleted_at: row.get(7)?,
                metadata: serde_json::from_str(&row.get::<_, String>(8)?).unwrap_or_default(),
                characters: vec![],
                lorebook_ids: vec![],
            }),
        )?;
        
        // Load characters for each conversation
        let mut result = Vec::with_capacity(convs.len());
        for conv in convs {
            let characters = Self::get_characters(db, &conv.id)?;
            let lorebook_ids = Self::get_lorebook_ids(db, &conv.id)?;
            result.push(Conversation { characters, lorebook_ids, ..conv });
        }
        
        Ok(result)
    }
    
    pub fn update(db: &Database, id: &str, input: &UpdateConversationInput) -> AppResult<Conversation> {
        let existing = Self::find_by_id(db, id)?;
        let now = now_timestamp();
        
        let title = input.title.as_ref().unwrap_or(&existing.title);
        let persona_id = input.persona_id.as_ref().or(existing.persona_id.as_ref());
        
        db.execute(
            "UPDATE conversations SET title = ?1, persona_id = ?2, updated_at = ?3 WHERE id = ?4",
            params![title, persona_id, now, id],
        )?;
        
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
    
    fn get_characters(db: &Database, conversation_id: &str) -> AppResult<Vec<Character>> {
        db.query_all(
            "SELECT c.id, c.name, c.description, c.personality, c.system_prompt, c.first_message,
             c.example_dialogues, c.avatar_path, c.tags, c.is_bundled, c.created_at, c.updated_at,
             c.deleted_at, c.metadata
             FROM characters c
             JOIN conversation_characters cc ON c.id = cc.character_id
             WHERE cc.conversation_id = ?1 AND cc.is_active = 1 AND c.deleted_at IS NULL
             ORDER BY cc.join_order",
            params![conversation_id],
            CharacterRepo::row_to_character,
        )
    }
    
    fn get_lorebook_ids(db: &Database, conversation_id: &str) -> AppResult<Vec<String>> {
        db.query_all(
            "SELECT lorebook_id FROM conversation_lorebooks WHERE conversation_id = ?1",
            params![conversation_id],
            |row| row.get(0),
        )
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
}

// ============================================
// Message Repository
// ============================================

pub struct MessageRepo;

impl MessageRepo {
    pub fn create(db: &Database, message: &Message) -> AppResult<Message> {
        let author_type = message.author_type.as_str();
        let gen_params = message.generation_params.as_ref()
            .map(|p| serde_json::to_string(p).unwrap_or_default());
        
        db.execute(
            "INSERT INTO messages (id, conversation_id, parent_id, author_type, author_id, content,
             is_active_branch, branch_index, token_count, generation_params, created_at, metadata)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, '{}')",
            params![
                message.id, message.conversation_id, message.parent_id, author_type,
                message.author_id, message.content, message.is_active_branch,
                message.branch_index, message.token_count, gen_params, message.created_at
            ],
        )?;
        
        Self::find_by_id(db, &message.id)
    }
    
    pub fn find_by_id(db: &Database, id: &str) -> AppResult<Message> {
        db.query_one(
            "SELECT m.id, m.conversation_id, m.parent_id, m.author_type, m.author_id, m.content,
             m.is_active_branch, m.branch_index, m.token_count, m.generation_params, m.created_at,
             m.metadata, c.name as author_name
             FROM messages m
             LEFT JOIN characters c ON m.author_id = c.id
             WHERE m.id = ?1",
            params![id],
            Self::row_to_message,
        )
    }
    
    pub fn find_active_branch(db: &Database, conversation_id: &str) -> AppResult<Vec<Message>> {
        db.query_all(
            "SELECT m.id, m.conversation_id, m.parent_id, m.author_type, m.author_id, m.content,
             m.is_active_branch, m.branch_index, m.token_count, m.generation_params, m.created_at,
             m.metadata, c.name as author_name
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
        
        let sql = if message.parent_id.is_some() {
            "SELECT m.id, m.conversation_id, m.parent_id, m.author_type, m.author_id, m.content,
             m.is_active_branch, m.branch_index, m.token_count, m.generation_params, m.created_at,
             m.metadata, c.name as author_name
             FROM messages m
             LEFT JOIN characters c ON m.author_id = c.id
             WHERE m.parent_id = ?1
             ORDER BY m.branch_index ASC"
        } else {
            "SELECT m.id, m.conversation_id, m.parent_id, m.author_type, m.author_id, m.content,
             m.is_active_branch, m.branch_index, m.token_count, m.generation_params, m.created_at,
             m.metadata, c.name as author_name
             FROM messages m
             LEFT JOIN characters c ON m.author_id = c.id
             WHERE m.conversation_id = ?1 AND m.parent_id IS NULL
             ORDER BY m.branch_index ASC"
        };
        
        let param = message.parent_id.as_ref().unwrap_or(&message.conversation_id);
        db.query_all(sql, params![param], Self::row_to_message)
    }
    
    pub fn get_next_branch_index(db: &Database, parent_id: Option<&str>, conversation_id: &str) -> AppResult<i32> {
        let result: Option<i32> = if let Some(pid) = parent_id {
            db.query_optional(
                "SELECT MAX(branch_index) FROM messages WHERE parent_id = ?1",
                params![pid],
                |row| row.get(0),
            )?
        } else {
            db.query_optional(
                "SELECT MAX(branch_index) FROM messages WHERE conversation_id = ?1 AND parent_id IS NULL",
                params![conversation_id],
                |row| row.get(0),
            )?
        };
        
        Ok(result.map(|i| i + 1).unwrap_or(0))
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
        // Recursive CTE to find all descendants
        db.execute(
            "WITH RECURSIVE descendants AS (
                SELECT id FROM messages WHERE id = ?1
                UNION ALL
                SELECT m.id FROM messages m JOIN descendants d ON m.parent_id = d.id
            )
            UPDATE messages SET is_active_branch = 0 WHERE id IN (SELECT id FROM descendants)",
            params![root_id],
        )?;
        Ok(())
    }
    
    pub fn activate_path_to_root(db: &Database, message_id: &str) -> AppResult<()> {
        // Recursive CTE to find path to root
        db.execute(
            "WITH RECURSIVE ancestors AS (
                SELECT id, parent_id FROM messages WHERE id = ?1
                UNION ALL
                SELECT m.id, m.parent_id FROM messages m JOIN ancestors a ON m.id = a.parent_id
            )
            UPDATE messages SET is_active_branch = 1 WHERE id IN (SELECT id FROM ancestors)",
            params![message_id],
        )?;
        Ok(())
    }
    
    pub fn delete(db: &Database, id: &str) -> AppResult<()> {
        // This will cascade delete children due to FK
        db.execute("DELETE FROM messages WHERE id = ?1", params![id])?;
        Ok(())
    }
    
    fn row_to_message(row: &rusqlite::Row<'_>) -> rusqlite::Result<Message> {
        let author_type_str: String = row.get(3)?;
        let author_type = AuthorType::from_str(&author_type_str).unwrap_or(AuthorType::System);
        let gen_params: Option<String> = row.get(9)?;
        
        Ok(Message {
            id: row.get(0)?,
            conversation_id: row.get(1)?,
            parent_id: row.get(2)?,
            author_type,
            author_id: row.get(4)?,
            content: row.get(5)?,
            is_active_branch: row.get::<_, i32>(6)? != 0,
            branch_index: row.get(7)?,
            token_count: row.get(8)?,
            generation_params: gen_params.and_then(|s| serde_json::from_str(&s).ok()),
            created_at: row.get(10)?,
            metadata: serde_json::from_str(&row.get::<_, String>(11)?).unwrap_or_default(),
            author_name: row.get(12).ok(),
            sibling_count: None,
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
             VALUES (?1, ?2, ?3, ?4, 1, ?5, ?5, '{}')",
            params![id, input.name, input.description, input.is_global, now],
        )?;
        
        Self::find_by_id(db, &id)
    }
    
    pub fn find_by_id(db: &Database, id: &str) -> AppResult<Lorebook> {
        let lorebook = db.query_one(
            "SELECT id, name, description, is_global, is_enabled, created_at, updated_at, deleted_at, metadata
             FROM lorebooks WHERE id = ?1 AND deleted_at IS NULL",
            params![id],
            |row| Ok(Lorebook {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                is_global: row.get::<_, i32>(3)? != 0,
                is_enabled: row.get::<_, i32>(4)? != 0,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                deleted_at: row.get(7)?,
                metadata: serde_json::from_str(&row.get::<_, String>(8)?).unwrap_or_default(),
                entries: vec![],
            }),
        )?;
        
        let entries = Self::get_entries(db, id)?;
        Ok(Lorebook { entries, ..lorebook })
    }
    
    pub fn find_all(db: &Database) -> AppResult<Vec<Lorebook>> {
        let lorebooks = db.query_all(
            "SELECT id, name, description, is_global, is_enabled, created_at, updated_at, deleted_at, metadata
             FROM lorebooks WHERE deleted_at IS NULL ORDER BY name ASC",
            [],
            |row| Ok(Lorebook {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                is_global: row.get::<_, i32>(3)? != 0,
                is_enabled: row.get::<_, i32>(4)? != 0,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                deleted_at: row.get(7)?,
                metadata: serde_json::from_str(&row.get::<_, String>(8)?).unwrap_or_default(),
                entries: vec![],
            }),
        )?;
        
        let mut result = Vec::with_capacity(lorebooks.len());
        for lb in lorebooks {
            let entries = Self::get_entries(db, &lb.id)?;
            result.push(Lorebook { entries, ..lb });
        }
        
        Ok(result)
    }
    
    pub fn find_global(db: &Database) -> AppResult<Vec<Lorebook>> {
        let lorebooks = db.query_all(
            "SELECT id, name, description, is_global, is_enabled, created_at, updated_at, deleted_at, metadata
             FROM lorebooks WHERE is_global = 1 AND is_enabled = 1 AND deleted_at IS NULL",
            [],
            |row| Ok(Lorebook {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                is_global: row.get::<_, i32>(3)? != 0,
                is_enabled: row.get::<_, i32>(4)? != 0,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                deleted_at: row.get(7)?,
                metadata: serde_json::from_str(&row.get::<_, String>(8)?).unwrap_or_default(),
                entries: vec![],
            }),
        )?;
        
        let mut result = Vec::with_capacity(lorebooks.len());
        for lb in lorebooks {
            let entries = Self::get_entries(db, &lb.id)?;
            result.push(Lorebook { entries, ..lb });
        }
        
        Ok(result)
    }
    
    pub fn update(db: &Database, id: &str, input: &UpdateLorebookInput) -> AppResult<Lorebook> {
        let existing = Self::find_by_id(db, id)?;
        let now = now_timestamp();
        
        let name = input.name.as_ref().unwrap_or(&existing.name);
        let description = input.description.as_ref().unwrap_or(&existing.description);
        let is_global = input.is_global.unwrap_or(existing.is_global);
        let is_enabled = input.is_enabled.unwrap_or(existing.is_enabled);
        
        db.execute(
            "UPDATE lorebooks SET name = ?1, description = ?2, is_global = ?3, is_enabled = ?4, updated_at = ?5
             WHERE id = ?6",
            params![name, description, is_global, is_enabled, now, id],
        )?;
        
        Self::find_by_id(db, id)
    }
    
    pub fn delete(db: &Database, id: &str) -> AppResult<()> {
        let now = now_timestamp();
        db.execute(
            "UPDATE lorebooks SET deleted_at = ?1 WHERE id = ?2",
            params![now, id],
        )?;
        Ok(())
    }
    
    fn get_entries(db: &Database, lorebook_id: &str) -> AppResult<Vec<LorebookEntry>> {
        db.query_all(
            "SELECT id, lorebook_id, name, keywords, content, priority, is_enabled, case_sensitive,
             match_whole_word, insertion_position, token_budget, created_at, metadata
             FROM lorebook_entries WHERE lorebook_id = ?1 AND is_enabled = 1 ORDER BY priority DESC",
            params![lorebook_id],
            Self::row_to_entry,
        )
    }
    
    pub fn create_entry(db: &Database, input: &CreateEntryInput) -> AppResult<LorebookEntry> {
        let id = new_id();
        let now = now_timestamp();
        let keywords_json = serde_json::to_string(&input.keywords)?;
        
        db.execute(
            "INSERT INTO lorebook_entries (id, lorebook_id, name, keywords, content, priority, is_enabled,
             case_sensitive, match_whole_word, insertion_position, token_budget, created_at, metadata)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?8, ?9, ?10, ?11, '{}')",
            params![
                id, input.lorebook_id, input.name, keywords_json, input.content, input.priority,
                input.case_sensitive, input.match_whole_word, input.insertion_position,
                input.token_budget, now
            ],
        )?;
        
        Self::find_entry_by_id(db, &id)
    }
    
    pub fn find_entry_by_id(db: &Database, id: &str) -> AppResult<LorebookEntry> {
        db.query_one(
            "SELECT id, lorebook_id, name, keywords, content, priority, is_enabled, case_sensitive,
             match_whole_word, insertion_position, token_budget, created_at, metadata
             FROM lorebook_entries WHERE id = ?1",
            params![id],
            Self::row_to_entry,
        )
    }
    
    pub fn update_entry(db: &Database, id: &str, input: &UpdateEntryInput) -> AppResult<LorebookEntry> {
        let existing = Self::find_entry_by_id(db, id)?;
        
        let name = input.name.as_ref().unwrap_or(&existing.name);
        let keywords = input.keywords.as_ref().unwrap_or(&existing.keywords);
        let keywords_json = serde_json::to_string(keywords)?;
        let content = input.content.as_ref().unwrap_or(&existing.content);
        let priority = input.priority.unwrap_or(existing.priority);
        let is_enabled = input.is_enabled.unwrap_or(existing.is_enabled);
        let case_sensitive = input.case_sensitive.unwrap_or(existing.case_sensitive);
        let match_whole_word = input.match_whole_word.unwrap_or(existing.match_whole_word);
        let insertion_position = input.insertion_position.as_ref().unwrap_or(&existing.insertion_position);
        let token_budget = input.token_budget.or(existing.token_budget);
        
        db.execute(
            "UPDATE lorebook_entries SET name = ?1, keywords = ?2, content = ?3, priority = ?4,
             is_enabled = ?5, case_sensitive = ?6, match_whole_word = ?7, insertion_position = ?8,
             token_budget = ?9 WHERE id = ?10",
            params![
                name, keywords_json, content, priority, is_enabled, case_sensitive,
                match_whole_word, insertion_position, token_budget, id
            ],
        )?;
        
        Self::find_entry_by_id(db, id)
    }
    
    pub fn delete_entry(db: &Database, id: &str) -> AppResult<()> {
        db.execute("DELETE FROM lorebook_entries WHERE id = ?1", params![id])?;
        Ok(())
    }
    
    fn row_to_entry(row: &rusqlite::Row<'_>) -> rusqlite::Result<LorebookEntry> {
        Ok(LorebookEntry {
            id: row.get(0)?,
            lorebook_id: row.get(1)?,
            name: row.get(2)?,
            keywords: serde_json::from_str(&row.get::<_, String>(3)?).unwrap_or_default(),
            content: row.get(4)?,
            priority: row.get(5)?,
            is_enabled: row.get::<_, i32>(6)? != 0,
            case_sensitive: row.get::<_, i32>(7)? != 0,
            match_whole_word: row.get::<_, i32>(8)? != 0,
            insertion_position: row.get(9)?,
            token_budget: row.get(10)?,
            created_at: row.get(11)?,
            metadata: serde_json::from_str(&row.get::<_, String>(12)?).unwrap_or_default(),
        })
    }
}

// ============================================
// Settings Repository
// ============================================

pub struct SettingsRepo;

impl SettingsRepo {
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
    
    pub fn get_all(db: &Database) -> AppResult<Settings> {
        let mut settings = Settings::default();
        
        if let Some(v) = Self::get(db, "generation.temperature")? {
            settings.generation.temperature = v.parse().unwrap_or(0.8);
        }
        if let Some(v) = Self::get(db, "generation.max_tokens")? {
            settings.generation.max_tokens = v.parse().unwrap_or(512);
        }
        if let Some(v) = Self::get(db, "generation.top_p")? {
            settings.generation.top_p = v.parse().unwrap_or(0.9);
        }
        if let Some(v) = Self::get(db, "generation.context_size")? {
            settings.generation.context_size = v.parse().unwrap_or(8192);
        }
        if let Some(v) = Self::get(db, "app.theme")? {
            settings.app.theme = serde_json::from_str(&v).unwrap_or_else(|_| "dark".to_string());
        }
        if let Some(v) = Self::get(db, "app.first_run")? {
            settings.app.first_run = v.parse().unwrap_or(true);
        }
        if let Some(v) = Self::get(db, "model.path")? {
            settings.model.path = serde_json::from_str(&v).unwrap_or_default();
        }
        if let Some(v) = Self::get(db, "model.gpu_layers")? {
            settings.model.gpu_layers = v.parse().unwrap_or(99);
        }
        
        Ok(settings)
    }
}

// ============================================
// Queue Repository
// ============================================

pub struct QueueRepo;

impl QueueRepo {
    pub fn enqueue(db: &Database, task: &QueueTask) -> AppResult<QueueTask> {
        let status = task.status.as_str();
        let metadata = serde_json::to_string(&task.metadata)?;
        
        db.execute(
            "INSERT INTO message_queue (id, conversation_id, parent_message_id, target_character_id,
             status, priority, created_at, metadata)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                task.id, task.conversation_id, task.parent_message_id, task.target_character_id,
                status, task.priority, task.created_at, metadata
            ],
        )?;
        
        Self::find_by_id(db, &task.id)
    }
    
    pub fn find_by_id(db: &Database, id: &str) -> AppResult<QueueTask> {
        db.query_one(
            "SELECT id, conversation_id, parent_message_id, target_character_id, status, priority,
             created_at, started_at, completed_at, error_message, metadata
             FROM message_queue WHERE id = ?1",
            params![id],
            Self::row_to_task,
        )
    }
    
    pub fn get_next_pending(db: &Database) -> AppResult<Option<QueueTask>> {
        db.query_optional(
            "SELECT id, conversation_id, parent_message_id, target_character_id, status, priority,
             created_at, started_at, completed_at, error_message, metadata
             FROM message_queue WHERE status = 'pending' ORDER BY priority DESC, created_at ASC LIMIT 1",
            [],
            Self::row_to_task,
        )
    }
    
    pub fn update_status(db: &Database, id: &str, status: QueueStatus, error: Option<&str>) -> AppResult<()> {
        let now = now_timestamp();
        let status_str = status.as_str();
        
        match status {
            QueueStatus::Processing => {
                db.execute(
                    "UPDATE message_queue SET status = ?1, started_at = ?2 WHERE id = ?3",
                    params![status_str, now, id],
                )?;
            }
            QueueStatus::Completed | QueueStatus::Failed => {
                db.execute(
                    "UPDATE message_queue SET status = ?1, completed_at = ?2, error_message = ?3 WHERE id = ?4",
                    params![status_str, now, error, id],
                )?;
            }
            _ => {
                db.execute(
                    "UPDATE message_queue SET status = ?1 WHERE id = ?2",
                    params![status_str, id],
                )?;
            }
        }
        
        Ok(())
    }
    
    pub fn cancel_for_conversation(db: &Database, conversation_id: &str) -> AppResult<()> {
        db.execute(
            "UPDATE message_queue SET status = 'cancelled' WHERE conversation_id = ?1 AND status = 'pending'",
            params![conversation_id],
        )?;
        Ok(())
    }
    
    fn row_to_task(row: &rusqlite::Row<'_>) -> rusqlite::Result<QueueTask> {
        let status_str: String = row.get(4)?;
        let status = QueueStatus::from_str(&status_str).unwrap_or(QueueStatus::Pending);
        
        Ok(QueueTask {
            id: row.get(0)?,
            conversation_id: row.get(1)?,
            parent_message_id: row.get(2)?,
            target_character_id: row.get(3)?,
            status,
            priority: row.get(5)?,
            created_at: row.get(6)?,
            started_at: row.get(7)?,
            completed_at: row.get(8)?,
            error_message: row.get(9)?,
            metadata: serde_json::from_str(&row.get::<_, String>(10)?).unwrap_or_default(),
        })
    }
}

// ============================================
// Download Repository
// ============================================

pub struct DownloadRepo;

impl DownloadRepo {
    pub fn create(db: &Database, download: &Download) -> AppResult<Download> {
        let status = download.status.as_str();
        
        db.execute(
            "INSERT INTO downloads (id, url, destination_path, total_bytes, downloaded_bytes, status,
             checksum, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)",
            params![
                download.id, download.url, download.destination_path, download.total_bytes,
                download.downloaded_bytes, status, download.checksum, download.created_at
            ],
        )?;
        
        Self::find_by_id(db, &download.id)
    }
    
    pub fn find_by_id(db: &Database, id: &str) -> AppResult<Download> {
        db.query_one(
            "SELECT id, url, destination_path, total_bytes, downloaded_bytes, status, checksum,
             created_at, updated_at, error_message
             FROM downloads WHERE id = ?1",
            params![id],
            Self::row_to_download,
        )
    }
    
    pub fn find_active(db: &Database) -> AppResult<Option<Download>> {
        db.query_optional(
            "SELECT id, url, destination_path, total_bytes, downloaded_bytes, status, checksum,
             created_at, updated_at, error_message
             FROM downloads WHERE status IN ('pending', 'downloading', 'paused') LIMIT 1",
            [],
            Self::row_to_download,
        )
    }
    
    pub fn update_progress(db: &Database, id: &str, downloaded_bytes: i64) -> AppResult<()> {
        let now = now_timestamp();
        db.execute(
            "UPDATE downloads SET downloaded_bytes = ?1, updated_at = ?2 WHERE id = ?3",
            params![downloaded_bytes, now, id],
        )?;
        Ok(())
    }
    
    pub fn update_status(db: &Database, id: &str, status: DownloadStatus, error: Option<&str>) -> AppResult<()> {
        let now = now_timestamp();
        let status_str = status.as_str();
        db.execute(
            "UPDATE downloads SET status = ?1, error_message = ?2, updated_at = ?3 WHERE id = ?4",
            params![status_str, error, now, id],
        )?;
        Ok(())
    }
    
    fn row_to_download(row: &rusqlite::Row<'_>) -> rusqlite::Result<Download> {
        let status_str: String = row.get(5)?;
        let status = DownloadStatus::from_str(&status_str).unwrap_or(DownloadStatus::Pending);
        
        Ok(Download {
            id: row.get(0)?,
            url: row.get(1)?,
            destination_path: row.get(2)?,
            total_bytes: row.get(3)?,
            downloaded_bytes: row.get(4)?,
            status,
            checksum: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
            error_message: row.get(9)?,
        })
    }
}
