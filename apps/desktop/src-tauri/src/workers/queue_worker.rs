use tokio::sync::mpsc;
use tauri::{AppHandle, Emitter};

use crate::entities::*;
use crate::repositories::*;
use crate::services::MemoryService;
use crate::sidecar;
use crate::state::{AppState, QueueMessage};

pub async fn run(
    state: AppState,
    app_handle: AppHandle,
    mut rx: mpsc::Receiver<QueueMessage>,
) {
    tracing::info!("Queue worker started");
    
    loop {
        // Wait for signal or check periodically
        tokio::select! {
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
            _ = tokio::time::sleep(std::time::Duration::from_secs(1)) => {
                // Periodic check for pending tasks
                process_queue(&state, &app_handle).await;
            }
        }
    }
}

async fn process_queue(state: &AppState, app_handle: &AppHandle) {
    // Check if model is loaded
    let sidecar = match state.get_sidecar() {
        Some(s) => s,
        None => return, // No model loaded, skip
    };
    
    // Get next pending task
    let task = match QueueRepo::get_next_pending(&state.db) {
        Ok(Some(t)) => t,
        Ok(None) => return, // No pending tasks
        Err(e) => {
            tracing::error!("Failed to get next task: {}", e);
            return;
        }
    };
    
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
                let _ = QueueRepo::update_status(&state.db, &task.id, QueueStatus::Failed, Some(&e.to_string()));
                return;
            }
        },
        None => {
            let _ = QueueRepo::update_status(&state.db, &task.id, QueueStatus::Failed, Some("No target character"));
            return;
        }
    };
    
    // Build context
    let settings = match SettingsRepo::get_all(&state.db) {
        Ok(s) => s,
        Err(e) => {
            let _ = QueueRepo::update_status(&state.db, &task.id, QueueStatus::Failed, Some(&e.to_string()));
            return;
        }
    };
    
    let context = match MemoryService::build_context(&state.db, &task.conversation_id, settings.generation.context_size) {
        Ok(c) => c,
        Err(e) => {
            let _ = QueueRepo::update_status(&state.db, &task.id, QueueStatus::Failed, Some(&e.to_string()));
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
        })),
        created_at: now_timestamp(),
        metadata: serde_json::Value::Object(Default::default()),
        author_name: Some(character.name.clone()),
        sibling_count: None,
    };
    
    if let Err(e) = MessageRepo::create(&state.db, &message) {
        let _ = QueueRepo::update_status(&state.db, &task.id, QueueStatus::Failed, Some(&e.to_string()));
        return;
    }
    
    // Update conversation active message
    let _ = ConversationRepo::update_active_message(&state.db, &task.conversation_id, &message_id);
    
    // Set generating flag
    state.set_generating(Some(message_id.clone()));
    
    // Build prompt for LLM
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
            if let Some(ref name) = msg.author_name {
                format!("{}: {}", name, msg.content)
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
    
    // Generate response
    let mut full_content = String::new();
    
    match sidecar::generate_stream(
        &sidecar,
        prompt_messages,
        settings.generation.temperature,
        settings.generation.max_tokens,
    ).await {
        Ok(mut stream) => {
            while let Some(token) = stream.recv().await {
                // Check if generation was stopped
                if state.current_generating_id().as_ref() != Some(&message_id) {
                    tracing::info!("Generation stopped for message {}", message_id);
                    break;
                }
                
                full_content.push_str(&token);
                
                // Emit token event
                let _ = app_handle.emit("chat:token", ChatTokenEvent {
                    conversation_id: task.conversation_id.clone(),
                    message_id: message_id.clone(),
                    token: token.to_string(),
                });
            }
        }
        Err(e) => {
            tracing::error!("Generation failed: {}", e);
            let _ = QueueRepo::update_status(&state.db, &task.id, QueueStatus::Failed, Some(&e.to_string()));
            
            // Emit error event
            let _ = app_handle.emit("chat:error", ChatErrorEvent {
                conversation_id: task.conversation_id.clone(),
                message_id: Some(message_id.clone()),
                error: e.to_string(),
            });
            
            state.set_generating(None);
            return;
        }
    }
    
    // Update message with full content
    let token_count = crate::services::estimate_tokens(&full_content);
    if let Err(e) = MessageRepo::update_content(&state.db, &message_id, &full_content, token_count) {
        tracing::error!("Failed to update message: {}", e);
    }
    
    // Mark task complete
    let _ = QueueRepo::update_status(&state.db, &task.id, QueueStatus::Completed, None);
    
    // Clear generating flag
    state.set_generating(None);
    
    // Get final message for event
    if let Ok(final_message) = MessageRepo::find_by_id(&state.db, &message_id) {
        let _ = app_handle.emit("chat:complete", ChatCompleteEvent {
            conversation_id: task.conversation_id,
            message: final_message,
        });
    }
}
