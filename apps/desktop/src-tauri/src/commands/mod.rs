pub mod character;
pub mod persona;
pub mod conversation;
pub mod message;
pub mod lorebook;
pub mod settings;
pub mod system;
pub mod download;
pub mod export;
pub mod setup;

// Re-export for lib.rs
pub use system::restart_sidecar;