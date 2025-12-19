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
        None => {
            // tracing::trace!("process_queue: No sidecar loaded");
            return; 
        },
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
        tracing::debug!("process_queue: Generation already in progress");
        return;
    }
    
    // Get next pending task
    let task = match QueueRepo::get_next_pending(&state.db) {
        Ok(Some(t)) => t,
        Ok(None) => {
            // tracing::trace!("process_queue: No pending tasks");
            return;
        },
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
                tracing::error!("Character not found for task {}: {}", task.id, e);
                fail_task(state, &task.id, &format!("Character not found: {}", e));
                return;
            }
        },
        None => {
            tracing::error!("No target character specified for task {}", task.id);
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
        &character.name,
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
            
            // Check for sidecar stall and force restart
            if e.contains("stalled") || e.contains("timeout") {
                tracing::warn!("Stall detected! Force stopping sidecar to clear zombie state.");
                if let Some(handle) = state.take_sidecar() {
                     // Spawn cleanup in background to not block
                     tokio::spawn(async move {
                         let _ = crate::sidecar::stop_sidecar(handle).await;
                     });
                }
            }

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

struct TokenFilter {
    buffer: String,
    in_thinking_block: bool,
    in_response_block: bool,
    character_name: String,
}

impl TokenFilter {
    fn new(character_name: &str) -> Self {
        Self {
            buffer: String::new(),
            in_thinking_block: false, 
            in_response_block: false,
            character_name: character_name.to_string(),
        }
    }

    fn process(&mut self, token: &str) -> Vec<String> {
        self.buffer.push_str(token);
        let mut output = Vec::new();

        // Safety break for loop
        let mut loop_count = 0;
        loop {
            loop_count += 1;
            if loop_count > 1000 {
                tracing::error!("TokenFilter loop limit exceeded. Flushing.");
                output.push(self.buffer.clone());
                self.buffer.clear();
                break;
            }

            if self.buffer.is_empty() {
                break;
            }

            // --- STRICT MODE & PREAMBLE CLEANING ---
            // If we haven't started responding yet, look for leakage/preamble
            if !self.in_thinking_block && !self.in_response_block {
                let leakage_markers = [
                    "Scenario:".to_string(),
                    "System:".to_string(),
                    format!("You are {}", self.character_name),
                    format!("{}:", self.character_name),
                ];

                let mut found_leakage = false;
                for marker in &leakage_markers {
                    if self.buffer.trim_start().starts_with(marker) {
                        found_leakage = true;
                        break;
                    }
                }

                if found_leakage {
                    // We found leakage. We need to find the REAL start of the current response.
                    // Important: The model might repeat the WHOLE history. We want the LAST occurrence 
                    // of "[CharName]: " because that usually marks the start of the NEW message.
                    let char_dialogue = format!("{}: ", self.character_name);
                    let char_action = format!("{}: *", self.character_name);

                    // Find the LAST occurrence to avoid latching onto echoed history
                    let pos_dialogue = self.buffer.rfind(&char_dialogue);
                    let pos_action = self.buffer.rfind(&char_action);

                    match (pos_dialogue, pos_action) {
                        (Some(d_pos), Some(a_pos)) => {
                            let pos = d_pos.max(a_pos);
                            let marker_len = if d_pos >= a_pos { char_dialogue.len() } else { char_action.len() };
                            
                            // Only strip if we have enough buffer after the marker to be sure it's the start
                            // or if the buffer is getting too large.
                            if self.buffer.len() > pos + marker_len + 5 || self.buffer.len() > 500 {
                                tracing::warn!("Detected system prompt leakage. Stripping up to last '{}' marker.", self.character_name);
                                self.buffer = self.buffer[pos + marker_len..].to_string();
                                self.in_response_block = true;
                                continue;
                            }
                        }
                        (Some(pos), None) | (None, Some(pos)) => {
                            let marker_len = if pos_dialogue.is_some() { char_dialogue.len() } else { char_action.len() };
                            if self.buffer.len() > pos + marker_len + 5 || self.buffer.len() > 500 {
                                tracing::warn!("Detected system prompt leakage. Stripping up to '{}' marker.", self.character_name);
                                self.buffer = self.buffer[pos + marker_len..].to_string();
                                self.in_response_block = true;
                                continue;
                            }
                        }
                        (None, None) => {
                            // Leakage detected but start marker not found yet.
                            // If buffer is huge, just clear it to prevent memory issues.
                            if self.buffer.len() > 1000 {
                                tracing::warn!("Leakage buffer exceeded 1000 chars without start marker. Clearing.");
                                self.buffer.clear();
                            }
                        }
                    }
                    
                    if found_leakage && !self.in_response_block {
                        // Wait for more tokens to find the start marker
                        break;
                    }
                }
            }

            // Standard tag processing
            let think_idx = self.buffer.find("<thinking>");
            let response_idx = self.buffer.find("<RESPONSE>");

            if self.in_thinking_block {
                if let Some(end_idx) = self.buffer.find("</thinking>") {
                    self.buffer = self.buffer[end_idx + 11..].to_string();
                    self.in_thinking_block = false;
                    continue;
                } else {
                    let potential_tag = "</thinking>";
                    let keep_len = self.get_partial_tag_len(potential_tag);
                    if self.buffer.len() > keep_len {
                        self.buffer = self.buffer[self.buffer.len() - keep_len..].to_string();
                    }
                    break;
                }
            } else if self.in_response_block {
                if let Some(end_idx) = self.buffer.find("</RESPONSE>") {
                    let content = self.buffer[..end_idx].to_string();
                    if !content.is_empty() { output.push(content); }
                    self.buffer = self.buffer[end_idx + 11..].to_string();
                    self.in_response_block = false;
                    continue;
                } else {
                    let potential_tag = "</RESPONSE>";
                    let keep_len = self.get_partial_tag_len(potential_tag);
                    let emit_len = self.buffer.len().saturating_sub(keep_len);
                    if emit_len > 0 {
                        let content = self.buffer[..emit_len].to_string();
                        output.push(content);
                        self.buffer = self.buffer[emit_len..].to_string();
                    }
                    break;
                }
            } else {
                match (think_idx, response_idx) {
                    (Some(t_idx), Some(r_idx)) => {
                        if t_idx < r_idx { self.handle_thinking_start(t_idx); }
                        else { self.handle_response_start(r_idx); }
                        continue;
                    }
                    (Some(t_idx), None) => {
                        self.handle_thinking_start(t_idx);
                        continue;
                    }
                    (None, Some(r_idx)) => {
                        self.handle_response_start(r_idx);
                        continue;
                    }
                    (None, None) => {
                        if self.has_partial_tag() {
                            break;
                        } else {
                            // If we have a significant amount of text and NO leakage and NO tags,
                            // it might be a model that doesn't use tags.
                            // BUT wait, we should only do this if we haven't seen leakage.
                            if self.buffer.len() > 100 {
                                // Implicit response start
                                self.in_response_block = true;
                                continue;
                            }
                            break;
                        }
                    }
                }
            }
        }
        output
    }

    fn get_partial_tag_len(&self, tag: &str) -> usize {
        for i in (1..tag.len()).rev() {
            if self.buffer.ends_with(&tag[..i]) {
                return i;
            }
        }
        0
    }
    
    fn handle_thinking_start(&mut self, start_idx: usize) {
        // Discard everything before <thinking>
        if start_idx > 0 {
             tracing::trace!("Discarding pre-thought content: {:?}", &self.buffer[..start_idx]);
        }
        self.buffer = self.buffer[start_idx + 10..].to_string();
        self.in_thinking_block = true;
    }
    
    fn handle_response_start(&mut self, start_idx: usize) {
        // Discard everything before <RESPONSE>
        if start_idx > 0 {
             tracing::trace!("Discarding pre-response content: {:?}", &self.buffer[..start_idx]);
        }
        self.buffer = self.buffer[start_idx + 10..].to_string();
        self.in_response_block = true;
    }

    fn has_partial_tag(&self) -> bool {
        let tags = ["<thinking>", "<RESPONSE>"];
        for tag in tags {
            for i in (1..tag.len()).rev() {
                if self.buffer.ends_with(&tag[..i]) {
                    return true;
                }
            }
        }
        false
    }
    
    fn flush(&mut self) -> Option<String> {
        // If we are left with content in the buffer...
        
        if self.in_thinking_block {
             tracing::warn!("Stream ended inside thinking block.");
             return None;
        }
        
        if self.in_response_block {
            // responding ended without closing tag?
            tracing::warn!("Stream ended inside response block (missing </RESPONSE>). Emitting rest.");
            let content = self.buffer.clone();
            self.buffer.clear();
            return if content.is_empty() { None } else { Some(content) };
        }
        
        // If we are in neutral mode and have buffer...
        if !self.buffer.is_empty() {
            // We never found a tag. This is the "Fallback" scenario where model forgot tags entirely.
            // We should assume the whole buffer was the response.
            tracing::warn!("Stream ended without ANY tags. Emitting full buffer as fallback.");
            let content = self.buffer.clone();
            self.buffer.clear();
            return Some(content);
        }
        
        None
    }
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
    character_name: &str,
) -> Result<String, GenerationError> {
    tracing::info!("Starting generation for msg {}, max_tokens: {}", message_id, max_tokens);
    
    let mut stream = sidecar::generate_stream(
        sidecar,
        messages,
        temperature,
        max_tokens,
        cancel_token,
        stop_sequences,
    ).await.map_err(|e| {
        tracing::error!("Failed to start generation stream: {}", e);
        GenerationError::Error(e.to_string())
    })?;
    
    let mut full_content = String::new();
    let mut internal_full_content = String::new();
    let mut filter = TokenFilter::new(character_name);
    
    while let Some(event) = stream.recv().await {
        match event {
            GenerationEvent::Token(token) => {
                internal_full_content.push_str(&token);
                
                let visible_tokens = filter.process(&token);
                for visible in visible_tokens {
                    if !visible.is_empty() {
                        full_content.push_str(&visible);
                        // Emit token event
                        let _ = app_handle.emit("chat:token", ChatTokenEvent {
                            conversation_id: conversation_id.to_string(),
                            message_id: message_id.to_string(),
                            token: visible,
                        });
                    }
                }
            }
            GenerationEvent::Done => {
                tracing::info!("Generation Done event received.");
                if let Some(final_chunk) = filter.flush() {
                    if !final_chunk.is_empty() {
                         tracing::debug!("Flushing final chunk: {}", final_chunk);
                         full_content.push_str(&final_chunk);
                         let _ = app_handle.emit("chat:token", ChatTokenEvent {
                            conversation_id: conversation_id.to_string(),
                            message_id: message_id.to_string(),
                            token: final_chunk,
                        });
                    }
                }
                break;
            }
            GenerationEvent::Cancelled => {
                tracing::info!("Generation Cancelled event received.");
                return Err(GenerationError::Cancelled);
            }
            GenerationEvent::Error(e) => {
                tracing::error!("Generation Error event: {}", e);
                return Err(GenerationError::Error(e));
            }
        }
    }
    
    if full_content.is_empty() {
        if !internal_full_content.is_empty() {
            tracing::warn!("Generated content was filtered out entirely! Raw length: {}, Raw start: {:.50}", 
                internal_full_content.len(), internal_full_content);
        } else {
             tracing::warn!("Generated content was completely empty (no tokens received).");
        }
    } else {
        tracing::info!("Generation complete. Final length: {}", full_content.len());
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
            // Standardize character message formatting
            if let Some(ref name) = msg.author_name {
                format!("{}: {}", name, msg.content)
            } else {
                format!("{}: {}", character_name, msg.content)
            }
        } else if msg.author_type == AuthorType::User {
            // Standardize user message formatting
            let user_name = if !context.persona_name.is_empty() {
                &context.persona_name
            } else {
                "User"
            };
            format!("{}: {}", user_name, msg.content)
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