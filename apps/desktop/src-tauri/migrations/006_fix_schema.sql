-- Migration 006: Fix Schema and Add Memory Entries
-- Fixes mismatched conversation_summaries schema and adds missing memory_entries table

-- ============================================
-- Fix Conversation Summaries
-- ============================================
DROP TABLE IF EXISTS conversation_summaries;
CREATE TABLE IF NOT EXISTS conversation_summaries (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    content TEXT NOT NULL,
    message_range_start TEXT,
    message_range_end TEXT,
    message_count INTEGER DEFAULT 0,
    token_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_summaries_conversation 
ON conversation_summaries(conversation_id);

-- ============================================
-- Memory Entries Table (Missing from previous)
-- ============================================
CREATE TABLE IF NOT EXISTS memory_entries (
    id TEXT PRIMARY KEY,
    conversation_id TEXT,
    character_id TEXT NOT NULL,
    content TEXT NOT NULL,
    importance REAL NOT NULL DEFAULT 1.0,
    source_messages TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_memories_char 
ON memory_entries(character_id);

CREATE INDEX IF NOT EXISTS idx_memories_importance
ON memory_entries(importance DESC);
