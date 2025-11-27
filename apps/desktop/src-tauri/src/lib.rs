mod error;
mod entities;
mod database;
mod repositories;
mod setup;
mod services;
mod commands;
mod workers;
mod sidecar;
mod state;

use tauri::Manager;
use tokio::sync::mpsc;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

pub use error::{AppError, CommandError};
pub use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logging
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| "glee=debug,info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Starting Glee...");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let handle = app.handle().clone();
            
            // Initialize paths
            let paths = setup::paths::AppPaths::new(&handle)?;
            tracing::info!("App data dir: {:?}", paths.data_dir);
            
            // Initialize database
            let db = database::Database::new(&paths.database_path)?;
            
            // Run migrations
            setup::migrations::run_migrations(&db)?;
            tracing::info!("Database initialized");
            
            // Create channels for workers
            let (queue_tx, queue_rx) = mpsc::channel(100);
            let (download_tx, download_rx) = mpsc::channel(100);
            
            // Create app state
            let state = AppState::new(
                db,
                paths,
                queue_tx,
                download_tx,
            );
            
            // Store state
            app.manage(state.clone());
            
            // Spawn workers
            let worker_state = state.clone();
            let worker_handle = handle.clone();
            tauri::async_runtime::spawn(async move {
                workers::queue_worker::run(worker_state, worker_handle, queue_rx).await;
            });
            
            let download_state = state.clone();
            let download_handle = handle.clone();
            tauri::async_runtime::spawn(async move {
                workers::download_worker::run(download_state, download_handle, download_rx).await;
            });
            
            // Seed default data
            tauri::async_runtime::block_on(async {
                if let Err(e) = setup::seed_defaults(&state).await {
                    tracing::error!("Failed to seed defaults: {}", e);
                }
            });
            
            tracing::info!("Glee started successfully");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Character commands
            commands::character::create_character,
            commands::character::get_character,
            commands::character::list_characters,
            commands::character::update_character,
            commands::character::delete_character,
            commands::character::import_character_card,
            // Persona commands
            commands::persona::create_persona,
            commands::persona::get_persona,
            commands::persona::list_personas,
            commands::persona::update_persona,
            commands::persona::delete_persona,
            commands::persona::set_default_persona,
            // Conversation commands
            commands::conversation::create_conversation,
            commands::conversation::get_conversation,
            commands::conversation::list_conversations,
            commands::conversation::delete_conversation,
            commands::conversation::get_conversation_messages,
            commands::conversation::update_conversation,
            // Message commands
            commands::message::send_message,
            commands::message::regenerate_message,
            commands::message::edit_message,
            commands::message::delete_message,
            commands::message::get_branch_siblings,
            commands::message::switch_branch,
            commands::message::stop_generation,
            // Lorebook commands
            commands::lorebook::create_lorebook,
            commands::lorebook::get_lorebook,
            commands::lorebook::list_lorebooks,
            commands::lorebook::update_lorebook,
            commands::lorebook::delete_lorebook,
            commands::lorebook::create_entry,
            commands::lorebook::update_entry,
            commands::lorebook::delete_entry,
            commands::lorebook::attach_to_conversation,
            commands::lorebook::detach_from_conversation,
            // Settings commands
            commands::settings::get_settings,
            commands::settings::update_setting,
            commands::settings::get_setting,
            // System commands
            commands::system::get_app_info,
            commands::system::get_model_status,
            commands::system::start_sidecar,
            commands::system::stop_sidecar,
            commands::system::health_check,
            // Download commands
            commands::download::start_model_download,
            commands::download::pause_download,
            commands::download::resume_download,
            commands::download::cancel_download,
            commands::download::get_download_status,
            // Export commands
            commands::export::export_character,
            commands::export::export_conversation,
            commands::export::export_all_data,
            commands::export::import_character,
            commands::export::import_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
