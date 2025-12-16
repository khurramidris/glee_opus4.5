use std::sync::Arc;
use tokio::sync::{mpsc, Notify};
use tauri::{AppHandle, Emitter};

use crate::entities::*;
use crate::repositories::*;
use crate::services::{MemoryService, LongTermMemoryService, SummaryService, estimate_tokens};
use crate::sidecar::{self, GenerationEvent};
use crate::state::{AppState, QueueMessage};

const GENERATION_TIMEOUT_SECS: u64 = 300; // 5 minutes

pub async fn run(
    state: AppState,
    app_handle: AppHandle,
    mut rx: mpsc::Receiver<QueueMessage>,
    shutdown: Arc<Notify>,
) {
    tracing::info!("Queue worker started");
    
    loop {
        tokio::select! {
            biased;
            
            _ = shutdown.notified() => {
                tracing::info!("Queue worker received shutdown signal");
                break;
            }
            
            msg = rx.recv() => {
                match msg {
                    Some(QueueMessage::Process) => {
                        process_queue(&state, &app_handle).await;
                    }
                    Some(QueueMessage::Stop) | None => {
                        tracing::info!("Queue worker stopping");
                        break;
                    }
                }
            }
            
            _ = tokio::time::sleep(std::time::Duration::from_secs(2)) => {
                if state.check_generation_timeout(GENERATION_TIMEOUT_SECS) {
                    tracing::warn!("Generation timed out after {} seconds", GENERATION_TIMEOUT_SECS);
                }
                process_queue(&state, &app_handle).await;
            }
        }
    }
    
    tracing::info!("Queue worker stopped");
}

async fn process_queue(state: &AppState, app_handle: &AppHandle) {
    // Check if model is loaded
    let sidecar = match state.get_sidecar() {
        Some(s) => s,
        None => return, // No model loaded, skip
    };
    
    // WATCHDOG: Verify sidecar is still responsive before processing
    if !sidecar::health_check(&sidecar).await {
        tracing::warn!("Sidecar health check failed - marking as unavailable");
        state.set_sidecar(None);
        // Emit event to frontend so user knows model stopped
        let _ = app_handle.emit("model:status", serde_json::json!({
            "status": "error",
            "modelLoaded": false,
            "message": "AI model stopped unexpectedly. Please restart from Settings."
        }));
        return;
    }
    
    // Don't start new generation if one is already running
    if state.is_generating() {
        return;
    }
    
    // Get next pending task
    let task = match QueueRepo::get_next_pending(&state.db) {
        Ok(Some(t)) => t,
        Ok(None) => return, // No pending tasks
        Err(e) => {
            tracing::error!("Failed to get next task: {}", e);
            return;
        }
    };
    
    tracing::info!("Processing task {} for conversation {}", task.id, task.conversation_id);
    
    // Mark as processing
    if let Err(e) = QueueRepo::update_status(&state.db, &task.id, QueueStatus::Processing, None) {
        tracing::error!("Failed to update task status: {}", e);
        return;
    }
    
    // Get target character
    let character = match &task.target_character_id {
        Some(id) => match CharacterRepo::find_by_id(&state.db, id) {
            Ok(c) => c,
            Err(e) => {
                fail_task(state, &task.id, &format!("Character not found: {}", e));
                return;
            }
        },
        None => {
            fail_task(state, &task.id, "No target character specified");
            return;
        }
    };
    
    // Build context
    let settings = match SettingsRepo::get_all(&state.db) {
        Ok(s) => s,
        Err(e) => {
            fail_task(state, &task.id, &format!("Failed to get settings: {}", e));
            return;
        }
    };
    
    let context = match MemoryService::build_context_async(
        &state.db,
        &sidecar,
        &task.conversation_id,
        settings.generation.context_size
    ).await {
        Ok(c) => c,
        Err(e) => {
            fail_task(state, &task.id, &format!("Failed to build context: {}", e));
            return;
        }
    };
    
    // Create placeholder message
    let message_id = new_id();
    let message = Message {
        id: message_id.clone(),
        conversation_id: task.conversation_id.clone(),
        parent_id: task.parent_message_id.clone(),
        author_type: AuthorType::Character,
        author_id: Some(character.id.clone()),
        content: String::new(),
        is_active_branch: true,
        branch_index: MessageRepo::get_next_branch_index(
            &state.db,
            task.parent_message_id.as_deref(),
            &task.conversation_id,
        ).unwrap_or(0),
        token_count: 0,
        generation_params: Some(serde_json::json!({
            "temperature": settings.generation.temperature,
            "max_tokens": settings.generation.max_tokens,
            "top_p": settings.generation.top_p,
        })),
        created_at: now_timestamp(),
        metadata: serde_json::Value::Object(Default::default()),
        author_name: Some(character.name.clone()),
        sibling_count: None,
    };
    
    if let Err(e) = MessageRepo::create(&state.db, &message) {
        fail_task(state, &task.id, &format!("Failed to create message: {}", e));
        return;
    }
    
    // Update conversation active message
    let _ = ConversationRepo::update_active_message(&state.db, &task.conversation_id, &message_id);
    
    // Atomically try to start generation - prevents race condition
    let cancel_token = match state.try_start_generation(message_id.clone(), task.conversation_id.clone()) {
        Some(token) => token,
        None => {
            tracing::warn!("Generation already in progress, skipping task {}", task.id);
            let _ = MessageRepo::delete(&state.db, &message_id);
            if let Some(parent_id) = &task.parent_message_id {
                let _ = ConversationRepo::update_active_message(&state.db, &task.conversation_id, parent_id);
            }
            let _ = QueueRepo::update_status(&state.db, &task.id, QueueStatus::Pending, None);
            return;
        }
    };
    
    // Build prompt for LLM
    let prompt_messages = build_llm_messages(&context, &character.name);
    
    // Generate response
    let generation_result = generate_response(
        &sidecar,
        prompt_messages,
        settings.generation.temperature,
        settings.generation.max_tokens,
        cancel_token,
        app_handle,
        &task.conversation_id,
        &message_id,
        settings.generation.stop_sequences.clone(),
    ).await;
    
    // Finish generation state
    state.finish_generation();
    
    match generation_result {
        Ok(full_content) => {
            // Update message with full content
            let token_count = estimate_tokens(&full_content);
            if let Err(e) = MessageRepo::update_content(&state.db, &message_id, &full_content, token_count) {
                tracing::error!("Failed to update message: {}", e);
            }
            
            // Mark task complete
            let _ = QueueRepo::update_status(&state.db, &task.id, QueueStatus::Completed, None);
            
            // Get final message for event
            if let Ok(final_message) = MessageRepo::find_by_id(&state.db, &message_id) {
                let _ = app_handle.emit("chat:complete", ChatCompleteEvent {
                    conversation_id: task.conversation_id.clone(),
                    message: final_message,
                });
            }
            
            // Trigger summarization if needed (non-blocking)
            let db_for_summary = state.db.clone();
            let sidecar_for_summary = sidecar.clone();
            let conv_id_for_summary = task.conversation_id.clone();
            tokio::spawn(async move {
                if let Err(e) = SummaryService::maybe_summarize(
                    &db_for_summary,
                    &sidecar_for_summary,
                    &conv_id_for_summary,
                    20,   // Summarize every 20 messages
                    4000, // Or every 4000 tokens
                ).await {
                    tracing::warn!("Summarization failed: {}", e);
                }
            });

            // Extract memories from BOTH user (parent) and character (current) messages
            let messages_to_process = vec![
                task.parent_message_id.clone(),
                Some(message_id.clone()),
            ];
            
            for msg_id_opt in messages_to_process {
                if let Some(msg_id) = msg_id_opt {
                     let db_clone = state.db.clone();
                     let sidecar_clone = sidecar.clone();
                     let msg_id_clone = msg_id.clone();
                     let character_id_clone = character.id.clone();
                     let conversation_id_clone = task.conversation_id.clone();
                     
                     tokio::spawn(async move {
                        if let Ok(msg) = MessageRepo::find_by_id(&db_clone, &msg_id_clone) {
                            tracing::info!("Starting memory extraction for message {}", msg.id);
                            if let Err(e) = LongTermMemoryService::process_message(
                                &db_clone,
                                &sidecar_clone,
                                &msg.content,
                                &character_id_clone,
                                &conversation_id_clone,
                                &msg.id
                            ).await {
                                tracing::warn!("Memory extraction failed: {}", e);
                            }
                        }
                     });
                 }
             }
            
            tracing::info!("Task {} completed successfully", task.id);
        }
        Err(GenerationError::Cancelled) => {
            tracing::info!("Generation cancelled for task {}", task.id);
            // Delete the empty placeholder message
            let _ = MessageRepo::delete(&state.db, &message_id);
            // Reset conversation active message to parent
            if let Some(parent_id) = &task.parent_message_id {
                let _ = ConversationRepo::update_active_message(&state.db, &task.conversation_id, parent_id);
            }
            let _ = QueueRepo::update_status(&state.db, &task.id, QueueStatus::Cancelled, None);
        }
        Err(GenerationError::Error(e)) => {
            tracing::error!("Generation failed for task {}: {}", task.id, e);
            // Delete the empty placeholder message
            let _ = MessageRepo::delete(&state.db, &message_id);
            // Reset conversation active message to parent
            if let Some(parent_id) = &task.parent_message_id {
                let _ = ConversationRepo::update_active_message(&state.db, &task.conversation_id, parent_id);
            }
            let _ = QueueRepo::update_status(&state.db, &task.id, QueueStatus::Failed, Some(&e));
            
            // Emit error event
            let _ = app_handle.emit("chat:error", ChatErrorEvent {
                conversation_id: task.conversation_id,
                message_id: Some(message_id),
                error: e,
            });
        }
    }
}

enum GenerationError {
    Cancelled,
    Error(String),
}

async fn generate_response(
    sidecar: &sidecar::SidecarHandle,
    messages: Vec<serde_json::Value>,
    temperature: f32,
    max_tokens: i32,
    cancel_token: tokio_util::sync::CancellationToken,
    app_handle: &AppHandle,
    conversation_id: &str,
    message_id: &str,
    stop_sequences: Option<Vec<String>>,
) -> Result<String, GenerationError> {
    let mut stream = sidecar::generate_stream(
        sidecar,
        messages,
        temperature,
        max_tokens,
        cancel_token,
        stop_sequences,
    ).await.map_err(|e| GenerationError::Error(e.to_string()))?;
    
    let mut full_content = String::new();
    
    while let Some(event) = stream.recv().await {
        match event {
            GenerationEvent::Token(token) => {
                full_content.push_str(&token);
                
                // Emit token event
                let _ = app_handle.emit("chat:token", ChatTokenEvent {
                    conversation_id: conversation_id.to_string(),
                    message_id: message_id.to_string(),
                    token,
                });
            }
            GenerationEvent::Done => {
                break;
            }
            GenerationEvent::Cancelled => {
                return Err(GenerationError::Cancelled);
            }
            GenerationEvent::Error(e) => {
                return Err(GenerationError::Error(e));
            }
        }
    }
    
    Ok(full_content)
}

fn build_llm_messages(context: &crate::services::ContextResult, character_name: &str) -> Vec<serde_json::Value> {
    let mut prompt_messages = Vec::new();
    
    // System message
    prompt_messages.push(serde_json::json!({
        "role": "system",
        "content": context.system_prompt
    }));
    
    // Conversation history
    for msg in &context.messages {
        let role = match msg.author_type {
            AuthorType::User => "user",
            AuthorType::Character => "assistant",
            AuthorType::System => "system",
        };
        
        let content = if msg.author_type == AuthorType::Character {
            // For multi-character support in the future, prepend character name
            if let Some(ref name) = msg.author_name {
                if name != character_name {
                    format!("[{}]: {}", name, msg.content)
                } else {
                    msg.content.clone()
                }
            } else {
                msg.content.clone()
            }
        } else if msg.author_type == AuthorType::User {
            // Optionally prepend user name
            if !context.persona_name.is_empty() && context.persona_name != "User" {
                format!("[{}]: {}", context.persona_name, msg.content)
            } else {
                msg.content.clone()
            }
        } else {
            msg.content.clone()
        };
        
        prompt_messages.push(serde_json::json!({
            "role": role,
            "content": content
        }));
    }
    
    prompt_messages
}

fn fail_task(state: &AppState, task_id: &str, error: &str) {
    tracing::error!("Task {} failed: {}", task_id, error);
    let _ = QueueRepo::update_status(&state.db, task_id, QueueStatus::Failed, Some(error));
}