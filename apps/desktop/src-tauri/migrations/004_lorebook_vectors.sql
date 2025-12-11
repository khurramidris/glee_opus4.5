-- Enable semantic search for Lorebook entries
-- We use the same virtual table approach as memory_embeddings (sqlite-vec)

-- We don't modify the existing lorebook_entries table structure directly 
-- because standard SQLite columns don't hold vectors efficiently/natively without extensions.
-- Storing vectors in a separate virtual table linked by ID is clean.

-- Note: The virtual table creation is handled in code (VectorStore or similar init) 
-- to support dynamic dimensions, but we can register the structure here if we assume fixed dimensions.
-- Since we deferred creation for memory_embeddings, we should stick to that pattern 
-- OR use a generic BLOB column in the main table if we want simple storage without search, 
-- but we WANT search.

-- Plan: Use `VectorStore` to manage a new generic embeddings table or specific one?
-- Better key: `lorebook_embeddings`

-- No schema changes needed for existing tables if we use a parallel virtual table.
-- But user might want to cache the embedding in the main DB for portability?
-- Let's stick to the virtual table for search.

-- We might want to add a flag to lorebook_entries to indicate if it has an embedding.
ALTER TABLE lorebook_entries ADD COLUMN has_embedding BOOLEAN DEFAULT 0;
