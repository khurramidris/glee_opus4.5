// ============================================
// Long-term Memory Service
// Manages persistent character memories for context enhancement
// ============================================

use crate::database::Database;
use crate::entities::{new_id, now_timestamp};
use crate::error::AppResult;
use crate::sidecar::SidecarHandle;
use crate::services::embeddings::EmbeddingService;
use crate::repositories::MessageRepo;
use crate::entities::AuthorType;
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
    
    /// Create memory with embedding (with retry on failure)
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
        
        // Generate and store embedding with retry
        let mut embedding_stored = false;
        for attempt in 1..=2 {
            match EmbeddingService::generate(sidecar, content).await {
                Ok(embedding) => {
                    match EmbeddingService::store(db, "memory", &memory.id, &embedding) {
                        Ok(_) => {
                            embedding_stored = true;
                            break;
                        }
                        Err(e) => {
                            tracing::warn!("Failed to store memory embedding (attempt {}): {}", attempt, e);
                        }
                    }
                }
                Err(e) => {
                    tracing::warn!("Failed to generate memory embedding (attempt {}): {}", attempt, e);
                    if attempt < 2 {
                        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                    }
                }
            }
        }
        
        if !embedding_stored {
            tracing::warn!("Memory {} stored without embedding - semantic search may not find it", memory.id);
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
    
    /// Retrieve memories with recency boost applied to similarity scores
    /// Falls back to recency-based retrieval if no embeddings available
    pub fn retrieve_relevant_sync_with_recency(
        db: &Database,
        character_id: &str,
        query_embedding: Option<&[f32]>,
        limit: usize,
        min_similarity: f32,
    ) -> AppResult<Vec<(MemoryEntry, f32)>> {
        let now = now_timestamp();
        let day_seconds = 86400i64;
        
        let mut results = Self::retrieve_relevant_sync(
            db, character_id, query_embedding, limit * 2, min_similarity
        )?;
        
        // Apply recency boost to scores
        for (memory, score) in &mut results {
            let age_days = (now - memory.created_at) / day_seconds;
            // Decay: reduce score by 5% per day, minimum 0.5x
            let recency_factor = (1.0 - 0.05 * age_days as f32).max(0.5);
            // Blend importance with recency
            let importance_factor = memory.importance;
            // Final score = semantic * 0.5 + importance * 0.3 + recency * 0.2
            *score = *score * 0.5 + importance_factor * 0.3 + recency_factor * 0.2;
        }
        
        // Re-sort by adjusted score
        results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        results.truncate(limit);
        
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
    
    /// Update memory content (for contradiction resolution)
    pub fn update(db: &Database, id: &str, new_content: &str) -> AppResult<()> {
        db.execute(
            "UPDATE memory_entries SET content = ?1 WHERE id = ?2",
            rusqlite::params![new_content, id],
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
}

/// Helper function to detect contradicting facts
/// Returns true if two facts appear to be about the same subject with different values
/// e.g., "User: is 25 years old" vs "User: is 30 years old"
fn is_contradicting_fact(existing: &str, new: &str) -> bool {
    // Extract category prefix (User:, World:, Relationship:, Emotional:)
    let existing_cat = existing.split(':').next().unwrap_or("");
    let new_cat = new.split(':').next().unwrap_or("");
    
    // Both must be in the same category to contradict
    if existing_cat != new_cat {
        return false;
    }
    
    // Get the content after the category prefix
    let existing_content = existing.split(':').skip(1).collect::<Vec<_>>().join(":").to_lowercase();
    let new_content = new.split(':').skip(1).collect::<Vec<_>>().join(":").to_lowercase();
    
    // If no category prefix, check legacy format (starts with "user")
    let existing_lower = existing.to_lowercase();
    let new_lower = new.to_lowercase();
    let (check_existing, check_new) = if !existing_content.is_empty() {
        (existing_content, new_content)
    } else if existing_lower.starts_with("user") && new_lower.starts_with("user") {
        (existing_lower.clone(), new_lower.clone())
    } else {
        return false;
    };
    
    // Check for age contradictions: "is X years old" patterns
    let age_pattern_words = ["years old", "year old", "aged", "is age"];
    let existing_has_age = age_pattern_words.iter().any(|p| check_existing.contains(p));
    let new_has_age = age_pattern_words.iter().any(|p| check_new.contains(p));
    if existing_has_age && new_has_age && check_existing != check_new {
        return true;
    }
    
    // Check for "name is X" contradictions
    if check_existing.contains("name is") && check_new.contains("name is") && check_existing != check_new {
        return true;
    }
    
    // Check for location contradictions
    let location_words = ["is from", "lives in", "located in", "from the"];
    let existing_has_loc = location_words.iter().any(|p| check_existing.contains(p));
    let new_has_loc = location_words.iter().any(|p| check_new.contains(p));
    if existing_has_loc && new_has_loc && check_existing != check_new {
        return true;
    }
    
    // Check for job/profession contradictions
    let job_words = ["works as", "job is", "profession is", "works at", "employed as"];
    let existing_has_job = job_words.iter().any(|p| check_existing.contains(p));
    let new_has_job = job_words.iter().any(|p| check_new.contains(p));
    if existing_has_job && new_has_job && check_existing != check_new {
        return true;
    }
    
    // Check for relationship status contradictions
    let rel_words = ["married", "single", "dating", "in a relationship", "engaged"];
    let existing_has_rel = rel_words.iter().any(|p| check_existing.contains(p));
    let new_has_rel = rel_words.iter().any(|p| check_new.contains(p));
    if existing_has_rel && new_has_rel && check_existing != check_new {
        return true;
    }
    
    false
}

impl MemoryService {
    /// Extract and store important facts from a message with robust parsing and deduplication
    pub async fn process_message(
        db: &Database,
        sidecar: &SidecarHandle,
        content: &str,
        character_id: &str,
        conversation_id: &str,
        source_message_id: &str,
    ) -> AppResult<()> {
        // Skip very short messages
        if content.trim().len() < 15 {
            return Ok(());
        }

        // IMPROVED: Comprehensive extraction prompt that captures ALL fact types
        let prompt = format!(
            r#"Extract important facts from this message that should be remembered long-term.

CATEGORIES TO EXTRACT:
1. USER FACTS: Name, age, job, location, preferences, background, relationships
2. WORLD FACTS: Locations, settings, events, NPCs established in roleplay
3. RELATIONSHIP: How the relationship between participants is evolving
4. EMOTIONAL: Significant emotional moments or mood changes

PREFIX each fact with its category: "User:", "World:", "Relationship:", or "Emotional:"

Return ONLY a JSON array of strings. Each item should be a complete sentence.
If nothing notable, return [].

Examples:
- "My name is Alex and I'm 25" -> ["User: Name is Alex", "User: Is 25 years old"]
- "I love hiking on weekends" -> ["User: Enjoys hiking", "User: Is active on weekends"]
- "*the tavern grows quiet*" -> ["World: The tavern has grown quiet"]
- "You're the only one who understands me" -> ["Relationship: User feels uniquely understood by character"]
- "*sighs with relief*" -> ["Emotional: User expressed relief"]
- "How's the weather?" -> []

Message: "{}"

JSON array:"#,
            content.replace('"', "'")
        );

        let messages = vec![serde_json::json!({
            "role": "user",
            "content": prompt
        })];

        let response = crate::sidecar::generate_text_oneshot(
            sidecar,
            messages,
            0.1, // low temp for extraction
            256, // max tokens
        ).await?;

        // Use robust JSON extraction
        let facts: Vec<String> = extract_json_array(&response);

        if facts.is_empty() {
            return Ok(());
        }

        tracing::info!("Extracted {} facts from message {}", facts.len(), source_message_id);

        // Get existing memories for deduplication and contradiction check
        let existing = Self::get_for_character(db, character_id, 100)?;

        'facts: for fact in facts {
            let fact_trimmed = fact.trim();
            if fact_trimmed.is_empty() || fact_trimmed.len() < 5 {
                continue;
            }
            
            let new_lower = fact_trimmed.to_lowercase();
            
            // Check for duplicates and contradictions
            for existing_mem in &existing {
                let existing_lower = existing_mem.content.to_lowercase();
                
                // Exact or near-duplicate check
                if existing_lower.contains(&new_lower) || new_lower.contains(&existing_lower) {
                    tracing::debug!("Skipping duplicate fact: {}", fact_trimmed);
                    continue 'facts;
                }
                
                // CONTRADICTION DETECTION: Check if both are assertions about the same subject
                // e.g., "User is 25 years old" vs "User is 30 years old"
                // Heuristic: same sentence structure with different value
                if is_contradicting_fact(&existing_lower, &new_lower) {
                    tracing::info!("Updating contradictory memory: '{}' -> '{}'", existing_mem.content, fact_trimmed);
                    // Update existing memory instead of creating duplicate
                    if let Err(e) = Self::update(db, &existing_mem.id, fact_trimmed) {
                        tracing::warn!("Failed to update contradicting memory: {}", e);
                    }
                    continue 'facts;
                }
            }
            
            // Store with embedding
            let _ = Self::create_with_embedding(
                db,
                sidecar,
                character_id,
                fact_trimmed,
                Some(conversation_id),
                0.5,
                vec![source_message_id.to_string()],
            ).await;
        }

        Ok(())
    }
}

/// Helper to extract JSON array from LLM response with fallback parsing
fn extract_json_array(text: &str) -> Vec<String> {
    // Try direct parse first
    if let Ok(arr) = serde_json::from_str::<Vec<String>>(text.trim()) {
        return arr;
    }
    
    // Try to find JSON array in response
    if let Some(start) = text.find('[') {
        if let Some(end) = text.rfind(']') {
            if start < end {
                if let Ok(arr) = serde_json::from_str::<Vec<String>>(&text[start..=end]) {
                    return arr;
                }
            }
        }
    }
    
    // Fallback: extract bullet points
    text.lines()
        .filter(|l| l.trim().starts_with("- ") || l.trim().starts_with("* "))
        .map(|l| l.trim().trim_start_matches(['-', '*']).trim().to_string())
        .filter(|s| !s.is_empty())
        .collect()
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

    /// Check if summarization is needed and create summary if so
    pub async fn maybe_summarize(
        db: &Database,
        sidecar: &SidecarHandle,
        conversation_id: &str,
        message_threshold: i32,
        token_threshold: i32,
    ) -> AppResult<Option<ConversationSummary>> {
        let messages = MessageRepo::find_active_branch(db, conversation_id)?;
        
        // Get last summary to find unsummarized messages
        let existing_summaries = Self::get_for_conversation(db, conversation_id, 10000)?;
        let last_summarized_id = existing_summaries.first()
            .and_then(|s| s.message_range_end.clone());
        
        // Find messages after last summary
        let unsummarized: Vec<_> = if let Some(ref last_id) = last_summarized_id {
            let mut found = false;
            messages.iter().filter(|m| {
                if m.id == *last_id { found = true; return false; }
                found
            }).collect()
        } else {
            messages.iter().collect()
        };
        
        // Calculate token count
        let total_tokens: i32 = unsummarized.iter().map(|m| m.token_count).sum();
        
        // Check thresholds
        if unsummarized.len() < message_threshold as usize && total_tokens < token_threshold {
            return Ok(None);  // Not enough to summarize
        }
        
        // Leave last 5 messages for recent context, summarize the rest
        if unsummarized.len() <= 5 {
            return Ok(None);
        }
        let to_summarize = &unsummarized[..unsummarized.len() - 5];
        
        // Build prompt for summarization
        let messages_text = to_summarize.iter()
            .map(|m| format!("{}: {}", 
                if m.author_type == AuthorType::User { "User" } else { "Character" },
                m.content
            ))
            .collect::<Vec<_>>()
            .join("\n");
        
        let prompt = format!(
            "Summarize this conversation in 2-3 sentences, focusing on key topics and any important facts learned about the user:\n\n{}\n\nSummary:",
            messages_text
        );
        
        let llm_messages = vec![serde_json::json!({
            "role": "user",
            "content": prompt
        })];
        
        let summary_text = crate::sidecar::generate_text_oneshot(
            sidecar, llm_messages, 0.3, 200
        ).await?;
        
        // Store summary
        let first_id = to_summarize.first().map(|m| m.id.as_str());
        let last_id = to_summarize.last().map(|m| m.id.as_str());
        let range = first_id.zip(last_id);
        
        let summary = Self::create(
            db,
            conversation_id,
            &summary_text,
            range,
            to_summarize.len() as i32,
        )?;
        
        tracing::info!("Created summary for {} messages", to_summarize.len());
        Ok(Some(summary))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_extract_json_array_direct() {
        let input = r#"["User likes cats", "User is from NYC"]"#;
        let result = extract_json_array(input);
        assert_eq!(result.len(), 2);
        assert_eq!(result[0], "User likes cats");
    }
    
    #[test]
    fn test_extract_json_array_embedded() {
        let input = r#"Here are the facts: ["User likes cats"] and more text"#;
        let result = extract_json_array(input);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0], "User likes cats");
    }
    
    #[test]
    fn test_extract_json_array_fallback() {
        let input = "- User likes cats\n- User is from NYC";
        let result = extract_json_array(input);
        assert_eq!(result.len(), 2);
    }
    
    #[test]
    fn test_extract_json_array_empty() {
        let input = "No facts found.";
        let result = extract_json_array(input);
        assert_eq!(result.len(), 0);
    }
}
