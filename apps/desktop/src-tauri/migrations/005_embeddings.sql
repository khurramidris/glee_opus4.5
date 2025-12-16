-- Migration 005: Embeddings and Long-term Memory Infrastructure
-- This migration adds tables for vector embeddings and conversation summaries

-- ============================================
-- Embeddings Table
-- Stores vector embeddings for semantic search
-- ============================================
CREATE TABLE IF NOT EXISTS embeddings (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,      -- 'memory', 'lorebook', 'message'
    entity_id TEXT NOT NULL,
    embedding BLOB NOT NULL,        -- Serialized f32 array
    dimensions INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_embeddings_entity 
ON embeddings(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_embeddings_type 
ON embeddings(entity_type);

-- ============================================
-- Conversation Summaries
-- Compressed summaries of older messages
-- ============================================
DROP TABLE IF EXISTS conversation_summaries;
CREATE TABLE IF NOT EXISTS conversation_summaries (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    content TEXT NOT NULL,
    message_range_start TEXT,       -- First message ID covered
    message_range_end TEXT,         -- Last message ID covered
    message_count INTEGER DEFAULT 0,
    token_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_summaries_conversation 
ON conversation_summaries(conversation_id);

-- ============================================
-- Update memory_entries with embedding flag
-- ============================================
-- Add has_embedding column if not exists (SQLite doesn't have IF NOT EXISTS for columns)
-- This is handled by checking PRAGMA table_info in code
