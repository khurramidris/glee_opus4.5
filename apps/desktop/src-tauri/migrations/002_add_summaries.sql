-- Add conversation summaries table for rolling context
CREATE TABLE IF NOT EXISTS conversation_summaries (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    start_message_id TEXT,
    end_message_id TEXT,
    summary TEXT NOT NULL,
    token_count INTEGER,
    created_at INTEGER,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- Index for faster retrieval by conversation
CREATE INDEX IF NOT EXISTS idx_summaries_conversation ON conversation_summaries(conversation_id);
