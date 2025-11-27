use crate::database::Database;
use crate::error::AppResult;

const MIGRATION_001: &str = include_str!("../../migrations/001_initial_schema.sql");

pub fn run_migrations(db: &Database) -> AppResult<()> {
    // Check if migrations table exists
    let has_migrations: bool = db.query_one(
        "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='table' AND name='_migrations'",
        [],
        |row| row.get(0),
    ).unwrap_or(false);
    
    if !has_migrations {
        db.execute_batch(
            "CREATE TABLE _migrations (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                applied_at INTEGER NOT NULL
            )"
        )?;
    }
    
    // Check which migrations have been applied
    let applied: Vec<i32> = db.query_all(
        "SELECT id FROM _migrations ORDER BY id",
        [],
        |row| row.get(0),
    ).unwrap_or_default();
    
    // Apply migration 1 if not applied
    if !applied.contains(&1) {
        tracing::info!("Applying migration 001_initial_schema");
        db.execute_batch(MIGRATION_001)?;
        db.execute(
            "INSERT INTO _migrations (id, name, applied_at) VALUES (1, '001_initial_schema', strftime('%s', 'now'))",
            [],
        )?;
    }
    
    Ok(())
}
