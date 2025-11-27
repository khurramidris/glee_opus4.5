-- Glee Database Schema v1
-- Complete schema for all V1 features

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ============================================
-- PERSONAS
-- ============================================
CREATE TABLE IF NOT EXISTS personas (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_personas_default 
    ON personas(is_default) WHERE deleted_at IS NULL;

-- ============================================
-- CHARACTERS
-- ============================================
CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    personality TEXT NOT NULL DEFAULT '',
    system_prompt TEXT NOT NULL DEFAULT '',
    first_message TEXT NOT NULL DEFAULT '',
    example_dialogues TEXT NOT NULL DEFAULT '',
    avatar_path TEXT,
    tags TEXT NOT NULL DEFAULT '[]',
    is_bundled INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_characters_name 
    ON characters(name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_characters_created 
    ON characters(created_at DESC) WHERE deleted_at IS NULL;

-- ============================================
-- CONVERSATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    persona_id TEXT REFERENCES personas(id) ON DELETE SET NULL,
    is_group INTEGER NOT NULL DEFAULT 0,
    active_message_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_conversations_updated 
    ON conversations(updated_at DESC) WHERE deleted_at IS NULL;

-- ============================================
-- CONVERSATION_CHARACTERS (Junction)
-- ============================================
CREATE TABLE IF NOT EXISTS conversation_characters (
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    join_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (conversation_id, character_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_chars_char 
    ON conversation_characters(character_id);

-- ============================================
-- MESSAGES (Tree Structure for Branching)
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY NOT NULL,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    parent_id TEXT REFERENCES messages(id) ON DELETE CASCADE,
    author_type TEXT NOT NULL CHECK (author_type IN ('user', 'character', 'system')),
    author_id TEXT,
    content TEXT NOT NULL,
    is_active_branch INTEGER NOT NULL DEFAULT 1,
    branch_index INTEGER NOT NULL DEFAULT 0,
    token_count INTEGER NOT NULL DEFAULT 0,
    generation_params TEXT,
    created_at INTEGER NOT NULL,
    metadata TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_messages_conv_active 
    ON messages(conversation_id, is_active_branch) WHERE is_active_branch = 1;
CREATE INDEX IF NOT EXISTS idx_messages_parent 
    ON messages(parent_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created 
    ON messages(conversation_id, created_at);

-- ============================================
-- LOREBOOKS
-- ============================================
CREATE TABLE IF NOT EXISTS lorebooks (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_global INTEGER NOT NULL DEFAULT 0,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_lorebooks_global 
    ON lorebooks(is_global) WHERE deleted_at IS NULL AND is_enabled = 1;

-- ============================================
-- LOREBOOK_ENTRIES
-- ============================================
CREATE TABLE IF NOT EXISTS lorebook_entries (
    id TEXT PRIMARY KEY NOT NULL,
    lorebook_id TEXT NOT NULL REFERENCES lorebooks(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT '',
    keywords TEXT NOT NULL DEFAULT '[]',
    content TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 50,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    case_sensitive INTEGER NOT NULL DEFAULT 0,
    match_whole_word INTEGER NOT NULL DEFAULT 1,
    insertion_position TEXT NOT NULL DEFAULT 'after_system',
    token_budget INTEGER,
    created_at INTEGER NOT NULL,
    metadata TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_entries_lorebook 
    ON lorebook_entries(lorebook_id) WHERE is_enabled = 1;
CREATE INDEX IF NOT EXISTS idx_entries_priority 
    ON lorebook_entries(priority DESC);

-- ============================================
-- CONVERSATION_LOREBOOKS (Junction)
-- ============================================
CREATE TABLE IF NOT EXISTS conversation_lorebooks (
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    lorebook_id TEXT NOT NULL REFERENCES lorebooks(id) ON DELETE CASCADE,
    PRIMARY KEY (conversation_id, lorebook_id)
);

-- ============================================
-- SETTINGS (Key-Value Store)
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

-- ============================================
-- MESSAGE_QUEUE (Async Generation)
-- ============================================
CREATE TABLE IF NOT EXISTS message_queue (
    id TEXT PRIMARY KEY NOT NULL,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    parent_message_id TEXT REFERENCES messages(id) ON DELETE CASCADE,
    target_character_id TEXT REFERENCES characters(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    priority INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    started_at INTEGER,
    completed_at INTEGER,
    error_message TEXT,
    metadata TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_queue_pending 
    ON message_queue(status, priority DESC, created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_queue_conv 
    ON message_queue(conversation_id);

-- ============================================
-- DOWNLOADS (Resumable Model Downloads)
-- ============================================
CREATE TABLE IF NOT EXISTS downloads (
    id TEXT PRIMARY KEY NOT NULL,
    url TEXT NOT NULL,
    destination_path TEXT NOT NULL,
    total_bytes INTEGER NOT NULL,
    downloaded_bytes INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'downloading', 'completed', 'failed', 'cancelled', 'paused')),
    checksum TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    error_message TEXT
);

-- ============================================
-- DEFAULT SETTINGS
-- ============================================
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES 
    ('generation.temperature', '0.8', strftime('%s', 'now')),
    ('generation.max_tokens', '512', strftime('%s', 'now')),
    ('generation.top_p', '0.9', strftime('%s', 'now')),
    ('generation.context_size', '8192', strftime('%s', 'now')),
    ('app.theme', '"dark"', strftime('%s', 'now')),
    ('app.first_run', 'true', strftime('%s', 'now')),
    ('model.path', '""', strftime('%s', 'now')),
    ('model.gpu_layers', '99', strftime('%s', 'now'));
