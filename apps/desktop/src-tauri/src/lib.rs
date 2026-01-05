use tauri::Builder;
use tauri::Manager;
use std::sync::Arc;
use tokio::sync::Notify;

// =========================================================
// MODULE DECLARATIONS
// =========================================================
pub mod commands;
pub mod database;
pub mod entities;
pub mod error;
pub mod repositories;
pub mod services;
pub mod setup;
pub mod sidecar;
pub mod state;
pub mod workers;

// =========================================================
// ENTRY POINT
// =========================================================
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("glee=debug".parse().unwrap())
                .add_directive("info".parse().unwrap())
        )
        .init();
    
    let builder = Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            tracing::info!("Starting Glee application...");
            
            let paths = crate::setup::paths::AppPaths::new(app.handle())?;
            let db = crate::database::Database::new(&paths.database_path)?;
            
            crate::setup::migrations::run_migrations(&db)?;
            
            let (queue_tx, queue_rx) = tokio::sync::mpsc::channel(100);
            let (download_tx, download_rx) = tokio::sync::mpsc::channel(100);
            
            let shutdown_notify = Arc::new(Notify::new());
            
            let state = crate::state::AppState::new(
                db, 
                paths, 
                queue_tx, 
                download_tx,
                shutdown_notify.clone()
            );
            app.manage(state.clone());
            
            let state_for_seed = state.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = crate::setup::seed_defaults(&state_for_seed).await {
                    tracing::error!("Failed to seed defaults: {}", e);
                }
            });
            
            let app_handle = app.handle().clone();
            let state_clone = state.clone();
            let shutdown_clone = shutdown_notify.clone();
            tauri::async_runtime::spawn(async move {
                crate::workers::queue_worker::run(state_clone, app_handle, queue_rx, shutdown_clone).await;
            });
            
            let app_handle = app.handle().clone();
            let state_clone = state.clone();
            let shutdown_clone = shutdown_notify.clone();
            tauri::async_runtime::spawn(async move {
                crate::workers::download_worker::run(state_clone, app_handle, download_rx, shutdown_clone).await;
            });
            
            tracing::info!("Glee setup complete");
            
            // Explicitly show the main window after setup is complete
            if let Some(main_window) = app.get_webview_window("main") {
                tracing::info!("Showing main window...");
                let _ = main_window.show();
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Character commands
            crate::commands::character::create_character,
            crate::commands::character::get_character,
            crate::commands::character::list_characters,
            crate::commands::character::update_character,
            crate::commands::character::delete_character,
            crate::commands::character::import_character_card,
            crate::commands::character::generate_character_from_prompt,
            // Persona commands
            crate::commands::persona::create_persona,
            crate::commands::persona::get_persona,
            crate::commands::persona::list_personas,
            crate::commands::persona::update_persona,
            crate::commands::persona::delete_persona,
            crate::commands::persona::set_default_persona,
            // Conversation commands
            crate::commands::conversation::create_conversation,
            crate::commands::conversation::get_conversation,
            crate::commands::conversation::list_conversations,
            crate::commands::conversation::update_conversation,
            crate::commands::conversation::delete_conversation,
            crate::commands::conversation::get_conversation_messages,
            crate::commands::conversation::find_conversation_by_character,
            crate::commands::conversation::clear_conversation_messages,
            // Message commands
            crate::commands::message::send_message,
            crate::commands::message::regenerate_message,
            crate::commands::message::edit_message,
            crate::commands::message::delete_message,
            crate::commands::message::get_branch_siblings,
            crate::commands::message::switch_branch,
            crate::commands::message::stop_generation,
            // Lorebook commands
            crate::commands::lorebook::create_lorebook,
            crate::commands::lorebook::get_lorebook,
            crate::commands::lorebook::list_lorebooks,
            crate::commands::lorebook::update_lorebook,
            crate::commands::lorebook::delete_lorebook,
            crate::commands::lorebook::create_entry,
            crate::commands::lorebook::update_entry,
            crate::commands::lorebook::delete_entry,
            crate::commands::lorebook::attach_to_conversation,
            crate::commands::lorebook::detach_from_conversation,
            // Settings commands
            crate::commands::settings::get_settings,
            crate::commands::settings::get_setting,
            crate::commands::settings::update_setting,
            crate::commands::settings::update_settings_batch,
            // System commands
            crate::commands::system::get_app_info,
            crate::commands::system::get_model_status,
            crate::commands::system::start_sidecar,
            crate::commands::system::stop_sidecar,
            crate::commands::system::restart_sidecar,
            crate::commands::system::health_check,
            // Download commands
            crate::commands::download::start_model_download,
            crate::commands::download::pause_download,
            crate::commands::download::resume_download,
            crate::commands::download::cancel_download,
            crate::commands::download::get_download_status,
            // Export commands
            crate::commands::export::export_character,
            crate::commands::export::export_conversation,
            crate::commands::export::export_all_data,
            crate::commands::export::import_character,
            crate::commands::export::import_data,
            // Setup commands
            crate::commands::setup::check_setup_status,
        ]);

    builder
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            match event {
                tauri::RunEvent::MainEventsCleared => {
                    // This explicitly handles the Tao event to prevent "MainEventsCleared emitted without explicit..." warnings.
                    // It can be empty, but must be present.
                }
                tauri::RunEvent::ExitRequested { .. } => {
                    tracing::info!("Exit requested, initiating cleanup...");
                    
                    let state = app_handle.state::<crate::state::AppState>();
                    
                    // Signal shutdown to all workers
                    state.shutdown();
                    
                    // Take and stop sidecar synchronously
                    if let Some(sidecar_handle) = state.take_sidecar() {
                        tracing::info!("Stopping sidecar process...");
                        sidecar_handle.cancel_generation();
                        
                        // Block until sidecar is stopped
                        std::thread::spawn(move || {
                            let rt = tokio::runtime::Builder::new_current_thread()
                                .enable_all()
                                .build()
                                .unwrap();
                            
                            rt.block_on(async {
                                if let Err(e) = crate::sidecar::stop_sidecar(sidecar_handle).await {
                                    tracing::error!("Failed to stop sidecar: {}", e);
                                } else {
                                    tracing::info!("Sidecar stopped successfully");
                                }
                            });
                        }).join().ok();
                    }
                    
                    tracing::info!("Cleanup complete");
                }
                tauri::RunEvent::Exit => {
                    tracing::info!("Application exited");
                }
                _ => {}
            }
        });
}