-- Long-term memory storage
CREATE TABLE IF NOT EXISTS memory_entries (
    id TEXT PRIMARY KEY,
    conversation_id TEXT,
    character_id TEXT NOT NULL,
    content TEXT NOT NULL,
    importance REAL DEFAULT 0.5,
    source_messages TEXT,     -- JSON array of message IDs
    created_at INTEGER,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id),
    FOREIGN KEY (character_id) REFERENCES characters(id)
);

-- Index for retrieval by character
CREATE INDEX IF NOT EXISTS idx_memories_character ON memory_entries(character_id);

-- Vector table for embeddings (using sqlite-vec's vec0)
-- 768 dimensions is common (e.g. nomic-embed-text), but llama.cpp defaults often vary.
-- We'll assume 768 for now, or detect model config dynamically?
-- Actually, virtual table schema is rigid. 
-- Best practice: Create it dynamically in code if dimensions vary, 
-- or stick to a standard model (e.g. all-MiniLM-L6-v2 is 384, mxbai-embed-large is 1024).
-- Since we are using the sidecar LLM, dimensions depend on the loaded model.
-- We might need to defer creating this table until model load, OR pick a fixed size if we bundle a specific embedding model.
-- Current plan: Bundle/Use a specific model or generic BLOB storage if supported?
-- sqlite-vec supports float[N]. 
-- Let's check implementation plan: "Embedding Model Strategy... Reuse llama.cpp".
-- Model dimensions can vary (e.g. Llama 3 8B is 4096).
-- If we use the main model for embeddings, dimensions are huge.
-- RECOMMENDATION: Use a small separate embedding model (e.g. all-MiniLM-L6-v2, 384 dim) managed by sidecar or a second instance.
-- However, user approved using the same LLM.
-- If so, dimensions could be large (4096). `vec0` supports up to a limit.
-- For now, let's create the table logic efficiently.
-- Actually, the migration SQL runs once.
-- We'll make the dimension configurable or create it in Rust code (init_tables) rather than static SQL migration for the virtual table.
-- But `memory_entries` is proper SQL.

-- Just creating the metadata table here. The virtual table is created in `VectorStore::init_tables` dynamically.
