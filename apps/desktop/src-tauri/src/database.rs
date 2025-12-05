use rusqlite::{Connection, Transaction};
use std::path::Path;
use std::sync::Arc;
use parking_lot::Mutex;

use crate::error::{AppError, AppResult};

pub struct Database {
    conn: Arc<Mutex<Connection>>,
}

impl Database {
    pub fn new(path: &Path) -> AppResult<Self> {
        // Ensure parent directory exists
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        
        let conn = Connection::open(path)?;
        
        // Enable foreign keys and WAL mode
        conn.execute_batch(
            "PRAGMA foreign_keys = ON;
             PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA busy_timeout = 5000;
             PRAGMA cache_size = -64000;"  // 64MB cache
        )?;
        
        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }
    
    pub fn connection(&self) -> Arc<Mutex<Connection>> {
        self.conn.clone()
    }
    
    /// Execute a function within a transaction
    pub fn transaction<F, T>(&self, f: F) -> AppResult<T>
    where
        F: FnOnce(&Connection) -> AppResult<T>,
    {
        let mut conn = self.conn.lock();
        let tx = conn.transaction().map_err(AppError::Database)?;
        
        match f(&tx) {
            Ok(result) => {
                tx.commit().map_err(AppError::Database)?;
                Ok(result)
            }
            Err(e) => {
                // Transaction automatically rolls back when dropped
                Err(e)
            }
        }
    }
    
    /// Execute a function within a transaction (mutable version)
    pub fn transaction_mut<F, T>(&self, f: F) -> AppResult<T>
    where
        F: FnOnce(&mut Connection) -> AppResult<T>,
    {
        let mut conn = self.conn.lock();
        conn.execute("BEGIN TRANSACTION", [])?;
        
        match f(&mut conn) {
            Ok(result) => {
                conn.execute("COMMIT", [])?;
                Ok(result)
            }
            Err(e) => {
                let _ = conn.execute("ROLLBACK", []);
                Err(e)
            }
        }
    }
    
    pub fn execute<P>(&self, sql: &str, params: P) -> AppResult<usize>
    where
        P: rusqlite::Params,
    {
        let conn = self.conn.lock();
        conn.execute(sql, params).map_err(AppError::from)
    }
    
    pub fn query_one<T, P, F>(&self, sql: &str, params: P, f: F) -> AppResult<T>
    where
        P: rusqlite::Params,
        F: FnOnce(&rusqlite::Row<'_>) -> rusqlite::Result<T>,
    {
        let conn = self.conn.lock();
        conn.query_row(sql, params, f).map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::NotFound("Record not found".to_string()),
            _ => AppError::Database(e),
        })
    }
    
    pub fn query_optional<T, P, F>(&self, sql: &str, params: P, f: F) -> AppResult<Option<T>>
    where
        P: rusqlite::Params,
        F: FnOnce(&rusqlite::Row<'_>) -> rusqlite::Result<T>,
    {
        use rusqlite::OptionalExtension;
        let conn = self.conn.lock();
        conn.query_row(sql, params, f).optional().map_err(AppError::from)
    }
    
    pub fn query_all<T, P, F>(&self, sql: &str, params: P, f: F) -> AppResult<Vec<T>>
    where
        P: rusqlite::Params,
        F: FnMut(&rusqlite::Row<'_>) -> rusqlite::Result<T>,
    {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare_cached(sql)?;  // Use cached statements
        let rows = stmt.query_map(params, f)?;
        
        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }
        Ok(results)
    }
    
    pub fn execute_batch(&self, sql: &str) -> AppResult<()> {
        let conn = self.conn.lock();
        conn.execute_batch(sql).map_err(AppError::from)
    }
    
    pub fn last_insert_rowid(&self) -> i64 {
        let conn = self.conn.lock();
        conn.last_insert_rowid()
    }
}

impl Clone for Database {
    fn clone(&self) -> Self {
        Self {
            conn: self.conn.clone(),
        }
    }
}

// Helper trait for optional row values
pub trait RowExt {
    fn get_optional<T: rusqlite::types::FromSql>(&self, idx: usize) -> rusqlite::Result<Option<T>>;
}

impl RowExt for rusqlite::Row<'_> {
    fn get_optional<T: rusqlite::types::FromSql>(&self, idx: usize) -> rusqlite::Result<Option<T>> {
        match self.get::<_, Option<T>>(idx) {
            Ok(v) => Ok(v),
            Err(rusqlite::Error::InvalidColumnType(..)) => Ok(None),
            Err(e) => Err(e),
        }
    }
}