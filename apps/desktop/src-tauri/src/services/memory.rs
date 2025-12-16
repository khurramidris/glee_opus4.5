// ============================================
// Long-term Memory Service
// Manages persistent character memories for context enhancement
// ============================================

use crate::database::Database;
use crate::entities::{new_id, now_timestamp};
use crate::error::AppResult;
use crate::sidecar::SidecarHandle;
use crate::services::embeddings::EmbeddingService;
use serde::{Deserialize, Serialize};


// ============================================
// Memory Entry (stored in memory_entries table)
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryEntry {
    pub id: String,
    pub conversation_id: Option<String>,
    pub character_id: String,
    pub content: String,
    pub importance: f32,
    pub source_messages: Vec<String>,
    pub created_at: i64,
}

impl MemoryEntry {
    fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Self> {
        let source_json: String = row.get(5)?;
        let source_messages: Vec<String> = serde_json::from_str(&source_json).unwrap_or_default();
        
        Ok(Self {
            id: row.get(0)?,
            conversation_id: row.get(1)?,
            character_id: row.get(2)?,
            content: row.get(3)?,
            importance: row.get(4)?,
            source_messages,
            created_at: row.get(6)?,
        })
    }
}

// ============================================
// Memory Service
// ============================================

pub struct MemoryService;

impl MemoryService {
    /// Create a new memory entry
    pub fn create(
        db: &Database,
        character_id: &str,
        content: &str,
        conversation_id: Option<&str>,
        importance: f32,
        source_messages: Vec<String>,
    ) -> AppResult<MemoryEntry> {
        let id = new_id();
        let now = now_timestamp();
        let source_json = serde_json::to_string(&source_messages).unwrap_or_else(|_| "[]".to_string());
        
        db.execute(
            "INSERT INTO memory_entries (id, conversation_id, character_id, content, importance, source_messages, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![id, conversation_id, character_id, content, importance, source_json, now],
        )?;
        
        Ok(MemoryEntry {
            id,
            conversation_id: conversation_id.map(|s| s.to_string()),
            character_id: character_id.to_string(),
            content: content.to_string(),
            importance,
            source_messages,
            created_at: now,
        })
    }
    
    /// Create memory with embedding
    pub async fn create_with_embedding(
        db: &Database,
        sidecar: &SidecarHandle,
        character_id: &str,
        content: &str,
        conversation_id: Option<&str>,
        importance: f32,
        source_messages: Vec<String>,
    ) -> AppResult<MemoryEntry> {
        let memory = Self::create(db, character_id, content, conversation_id, importance, source_messages)?;
        
        // Generate and store embedding
        match EmbeddingService::generate(sidecar, content).await {
            Ok(embedding) => {
                if let Err(e) = EmbeddingService::store(db, "memory", &memory.id, &embedding) {
                    tracing::warn!("Failed to store memory embedding: {}", e);
                }
            }
            Err(e) => {
                tracing::warn!("Failed to generate memory embedding: {}", e);
            }
        }
        
        Ok(memory)
    }
    
    /// Get memories for a character
    pub fn get_for_character(
        db: &Database,
        character_id: &str,
        limit: usize,
    ) -> AppResult<Vec<MemoryEntry>> {
        db.query_all(
            "SELECT id, conversation_id, character_id, content, importance, source_messages, created_at
             FROM memory_entries
             WHERE character_id = ?1
             ORDER BY importance DESC, created_at DESC
             LIMIT ?2",
            rusqlite::params![character_id, limit as i32],
            MemoryEntry::from_row,
        )
    }
    
    /// Retrieve relevant memories using semantic search
    pub async fn retrieve_relevant(
        db: &Database,
        sidecar: &SidecarHandle,
        character_id: &str,
        query: &str,
        limit: usize,
        min_similarity: f32,
    ) -> AppResult<Vec<(MemoryEntry, f32)>> {
        // Generate query embedding
        let query_embedding = EmbeddingService::generate(sidecar, query).await?;
        
        // Find similar embeddings
        let similar = EmbeddingService::find_similar(
            db,
            &query_embedding,
            "memory",
            limit * 2, // Get more for filtering by character
            min_similarity,
        )?;
        
        // Fetch matching memories and filter by character
        let mut results = Vec::new();
        for (memory_id, similarity) in similar {
            if let Ok(memory) = Self::get_by_id(db, &memory_id) {
                if memory.character_id == character_id {
                    results.push((memory, similarity));
                    if results.len() >= limit {
                        break;
                    }
                }
            }
        }
        
        Ok(results)
    }
    
    /// Retrieve relevant memories synchronously (for context building)
    /// Falls back to recency-based retrieval if no embeddings available
    pub fn retrieve_relevant_sync(
        db: &Database,
        character_id: &str,
        query_embedding: Option<&[f32]>,
        limit: usize,
        min_similarity: f32,
    ) -> AppResult<Vec<(MemoryEntry, f32)>> {
        if let Some(embedding) = query_embedding {
            // Semantic search
            let similar = EmbeddingService::find_similar(
                db,
                embedding,
                "memory",
                limit * 2,
                min_similarity,
            )?;
            
            let mut results = Vec::new();
            for (memory_id, similarity) in similar {
                if let Ok(memory) = Self::get_by_id(db, &memory_id) {
                    if memory.character_id == character_id {
                        results.push((memory, similarity));
                        if results.len() >= limit {
                            break;
                        }
                    }
                }
            }
            Ok(results)
        } else {
            // Fallback to importance/recency based
            let memories = Self::get_for_character(db, character_id, limit)?;
            Ok(memories.into_iter().map(|m| (m, 1.0)).collect())
        }
    }
    
    /// Get memory by ID
    pub fn get_by_id(db: &Database, id: &str) -> AppResult<MemoryEntry> {
        db.query_one(
            "SELECT id, conversation_id, character_id, content, importance, source_messages, created_at
             FROM memory_entries
             WHERE id = ?1",
            rusqlite::params![id],
            MemoryEntry::from_row,
        )
    }
    
    /// Delete a memory
    pub fn delete(db: &Database, id: &str) -> AppResult<()> {
        // Also delete embedding
        let _ = EmbeddingService::delete(db, "memory", id);
        
        db.execute(
            "DELETE FROM memory_entries WHERE id = ?1",
            rusqlite::params![id],
        )?;
        Ok(())
    }
    
    /// Update memory importance
    pub fn update_importance(db: &Database, id: &str, importance: f32) -> AppResult<()> {
        db.execute(
            "UPDATE memory_entries SET importance = ?1 WHERE id = ?2",
            rusqlite::params![importance, id],
        )?;
        Ok(())
    }
    
    /// Count memories for a character
    pub fn count_for_character(db: &Database, character_id: &str) -> AppResult<i32> {
        db.query_one(
            "SELECT COUNT(*) FROM memory_entries WHERE character_id = ?1",
            rusqlite::params![character_id],
            |row| row.get(0),
        )
    }

    /// Extract and store important facts from a message
    pub async fn process_message(
        db: &Database,
        sidecar: &SidecarHandle,
        content: &str,
        character_id: &str,
        conversation_id: &str,
        source_message_id: &str,
    ) -> AppResult<()> {
        // 1. Check if message is worth analyzing (length > 10 chars)
        if content.trim().len() < 10 {
            return Ok(());
        }

        // 2. Prompt LLM to extract facts
        // tailored for Phi-3 / small models
        let prompt = format!(
            "Extract new facts about the user from this message. Result must be a JSON list of strings. If none, return [].\nMessage: \"{}\"\nFacts:",
            content
        );

        let messages = vec![serde_json::json!({
            "role": "user",
            "content": prompt
        })];

        // Use a short generation config
        let response = crate::sidecar::generate_text_oneshot(
            sidecar,
            messages,
            0.1, // low temp for extraction
            256, // max tokens
        ).await?;

        // 3. Parse JSON result
        let facts: Vec<String> = match serde_json::from_str(&response) {
            Ok(f) => f,
            Err(_) => {
                // Fallback: try to extract lines if JSON fails
                response.lines()
                    .filter(|l| l.trim().starts_with("- ") || l.trim().starts_with("* "))
                    .map(|l| l.trim().trim_start_matches(['-', '*']).trim().to_string())
                    .collect()
            }
        };

        if facts.is_empty() {
            return Ok(());
        }

        tracing::info!("Extracted {} facts from message {}", facts.len(), source_message_id);

        // 4. Store each fact as a memory
        for fact in facts {
            let _ = Self::create_with_embedding(
                db,
                sidecar,
                character_id,
                &fact,
                Some(conversation_id),
                0.5, // default importance
                vec![source_message_id.to_string()],
            ).await;
        }

        Ok(())
    }
}

// ============================================
// Summary Service
// Manages conversation summaries
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversationSummary {
    pub id: String,
    pub conversation_id: String,
    pub content: String,
    pub message_range_start: Option<String>,
    pub message_range_end: Option<String>,
    pub message_count: i32,
    pub token_count: i32,
    pub created_at: i64,
}

pub struct SummaryService;

impl SummaryService {
    /// Create a new summary
    pub fn create(
        db: &Database,
        conversation_id: &str,
        content: &str,
        message_range: Option<(&str, &str)>,
        message_count: i32,
    ) -> AppResult<ConversationSummary> {
        let id = new_id();
        let now = now_timestamp();
        let token_count = crate::services::estimate_tokens(content);
        
        let (range_start, range_end) = match message_range {
            Some((start, end)) => (Some(start), Some(end)),
            None => (None, None),
        };
        
        db.execute(
            "INSERT INTO conversation_summaries (id, conversation_id, content, message_range_start, message_range_end, message_count, token_count, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![id, conversation_id, content, range_start, range_end, message_count, token_count, now],
        )?;
        
        Ok(ConversationSummary {
            id,
            conversation_id: conversation_id.to_string(),
            content: content.to_string(),
            message_range_start: range_start.map(|s| s.to_string()),
            message_range_end: range_end.map(|s| s.to_string()),
            message_count,
            token_count,
            created_at: now,
        })
    }
    
    /// Get summaries for a conversation
    pub fn get_for_conversation(
        db: &Database,
        conversation_id: &str,
        token_budget: i32,
    ) -> AppResult<Vec<ConversationSummary>> {
        let summaries = db.query_all(
            "SELECT id, conversation_id, content, message_range_start, message_range_end, message_count, token_count, created_at
             FROM conversation_summaries
             WHERE conversation_id = ?1
             ORDER BY created_at DESC",
            rusqlite::params![conversation_id],
            |row| Ok(ConversationSummary {
                id: row.get(0)?,
                conversation_id: row.get(1)?,
                content: row.get(2)?,
                message_range_start: row.get(3)?,
                message_range_end: row.get(4)?,
                message_count: row.get(5)?,
                token_count: row.get(6)?,
                created_at: row.get(7)?,
            }),
        )?;
        
        // Select summaries within budget
        let mut result = Vec::new();
        let mut used_tokens = 0;
        
        for summary in summaries {
            if used_tokens + summary.token_count > token_budget {
                break;
            }
            used_tokens += summary.token_count;
            result.push(summary);
        }
        
        // Reverse to get chronological order
        result.reverse();
        Ok(result)
    }
    
    /// Delete summaries for a conversation
    pub fn delete_for_conversation(db: &Database, conversation_id: &str) -> AppResult<()> {
        db.execute(
            "DELETE FROM conversation_summaries WHERE conversation_id = ?1",
            rusqlite::params![conversation_id],
        )?;
        Ok(())
    }
}
