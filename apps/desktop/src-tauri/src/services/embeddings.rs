// ============================================
// Embedding Service
// Generates and stores vector embeddings for semantic search
// ============================================

use crate::database::Database;
use crate::entities::{new_id, now_timestamp};
use crate::error::{AppError, AppResult};
use crate::sidecar::{generate_embedding, SidecarHandle};

/// Compute cosine similarity between two vectors
pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() || a.is_empty() {
        return 0.0;
    }
    
    let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let mag_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let mag_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
    
    if mag_a == 0.0 || mag_b == 0.0 {
        0.0
    } else {
        dot / (mag_a * mag_b)
    }
}

/// Serialize embedding vector to bytes for BLOB storage
fn embedding_to_bytes(embedding: &[f32]) -> Vec<u8> {
    embedding
        .iter()
        .flat_map(|f| f.to_le_bytes())
        .collect()
}

/// Deserialize embedding vector from BLOB bytes
fn bytes_to_embedding(bytes: &[u8]) -> Vec<f32> {
    bytes
        .chunks(4)
        .map(|chunk| {
            let arr: [u8; 4] = chunk.try_into().unwrap_or([0; 4]);
            f32::from_le_bytes(arr)
        })
        .collect()
}

pub struct EmbeddingService;

impl EmbeddingService {
    /// Generate embedding for text using the loaded model
    pub async fn generate(
        sidecar: &SidecarHandle,
        text: &str,
    ) -> AppResult<Vec<f32>> {
        if text.trim().is_empty() {
            return Err(AppError::Validation("Cannot generate embedding for empty text".into()));
        }
        
        // Truncate very long text to avoid memory issues
        let truncated = if text.len() > 8000 {
            &text[..8000]
        } else {
            text
        };
        
        generate_embedding(sidecar, truncated).await
    }
    
    /// Store an embedding in the database
    pub fn store(
        db: &Database,
        entity_type: &str,
        entity_id: &str,
        embedding: &[f32],
    ) -> AppResult<()> {
        let id = new_id();
        let bytes = embedding_to_bytes(embedding);
        let dimensions = embedding.len() as i32;
        let now = now_timestamp();
        
        db.execute(
            "INSERT OR REPLACE INTO embeddings (id, entity_type, entity_id, embedding, dimensions, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![id, entity_type, entity_id, bytes, dimensions, now],
        )?;
        
        Ok(())
    }
    
    /// Get embedding for an entity
    pub fn get(
        db: &Database,
        entity_type: &str,
        entity_id: &str,
    ) -> AppResult<Option<Vec<f32>>> {
        let result = db.query_optional(
            "SELECT embedding FROM embeddings WHERE entity_type = ?1 AND entity_id = ?2",
            rusqlite::params![entity_type, entity_id],
            |row| {
                let bytes: Vec<u8> = row.get(0)?;
                Ok(bytes)
            },
        )?;
        
        match result {
            Some(bytes) => Ok(Some(bytes_to_embedding(&bytes))),
            None => Ok(None),
        }
    }
    
    /// Find similar embeddings using cosine similarity
    /// Returns (entity_id, similarity_score) pairs sorted by similarity
    pub fn find_similar(
        db: &Database,
        query_embedding: &[f32],
        entity_type: &str,
        limit: usize,
        min_similarity: f32,
    ) -> AppResult<Vec<(String, f32)>> {
        // Get all embeddings of the specified type
        let rows = db.query_all(
            "SELECT entity_id, embedding FROM embeddings WHERE entity_type = ?1",
            rusqlite::params![entity_type],
            |row| {
                let entity_id: String = row.get(0)?;
                let bytes: Vec<u8> = row.get(1)?;
                Ok((entity_id, bytes))
            },
        )?;
        
        // Calculate similarities
        let mut results: Vec<(String, f32)> = rows
            .into_iter()
            .map(|(id, bytes)| {
                let embedding = bytes_to_embedding(&bytes);
                let similarity = cosine_similarity(query_embedding, &embedding);
                (id, similarity)
            })
            .filter(|(_, sim)| *sim >= min_similarity)
            .collect();
        
        // Sort by similarity (descending)
        results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        
        // Limit results
        results.truncate(limit);
        
        Ok(results)
    }
    
    /// Delete embedding for an entity
    pub fn delete(
        db: &Database,
        entity_type: &str,
        entity_id: &str,
    ) -> AppResult<()> {
        db.execute(
            "DELETE FROM embeddings WHERE entity_type = ?1 AND entity_id = ?2",
            rusqlite::params![entity_type, entity_id],
        )?;
        Ok(())
    }
    
    /// Check if an entity has an embedding
    pub fn exists(
        db: &Database,
        entity_type: &str,
        entity_id: &str,
    ) -> AppResult<bool> {
        let count: i32 = db.query_one(
            "SELECT COUNT(*) FROM embeddings WHERE entity_type = ?1 AND entity_id = ?2",
            rusqlite::params![entity_type, entity_id],
            |row| row.get(0),
        )?;
        Ok(count > 0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_cosine_similarity_identical() {
        let a = vec![1.0, 2.0, 3.0];
        let b = vec![1.0, 2.0, 3.0];
        let sim = cosine_similarity(&a, &b);
        assert!((sim - 1.0).abs() < 0.0001);
    }
    
    #[test]
    fn test_cosine_similarity_orthogonal() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![0.0, 1.0, 0.0];
        let sim = cosine_similarity(&a, &b);
        assert!(sim.abs() < 0.0001);
    }
    
    #[test]
    fn test_embedding_serialization() {
        let original = vec![0.1, 0.2, 0.3, 0.4, 0.5];
        let bytes = embedding_to_bytes(&original);
        let restored = bytes_to_embedding(&bytes);
        
        for (a, b) in original.iter().zip(restored.iter()) {
            assert!((a - b).abs() < 0.0001);
        }
    }
}
