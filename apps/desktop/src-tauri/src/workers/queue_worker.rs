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
    // Skip health check if we're currently generating (embedding/summary tasks may be using sidecar)
    if !state.is_generating() {
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
    
    // Extract previous character messages for repetition detection
    let previous_character_messages: Vec<String> = context.messages.iter()
        .filter(|m| m.author_type == AuthorType::Character)
        .map(|m| m.content.clone())
        .collect();
    
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
        previous_character_messages,
    ).await;
    
    // Finish generation state
    state.finish_generation();
    
    match generation_result {
        Ok(full_content) => {
            // Replace placeholders in response with actual names
            let processed_content = full_content
                .replace("{{user}}", &context.persona_name)
                .replace("{{User}}", &context.persona_name)
                .replace("{{char}}", &context.character_name)
                .replace("{{Char}}", &context.character_name)
                .replace("<user>", &context.persona_name)
                .replace("<char>", &context.character_name);
            
            // Update message with full content
            let token_count = estimate_tokens(&processed_content);
            if let Err(e) = MessageRepo::update_content(&state.db, &message_id, &processed_content, token_count) {
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
    // Track previous messages to detect repetition
    previous_messages: Vec<String>,
    // Track if we've seen any tags at all
    seen_any_tag: bool,
}

impl TokenFilter {
    fn with_history(_character_name: &str, history: Vec<String>) -> Self {
        Self {
            buffer: String::new(),
            in_thinking_block: false, 
            in_response_block: false,
            previous_messages: history,
            seen_any_tag: false,
        }
    }
    
    /// Check if the output contains significant repetition from previous messages
    fn strip_repeated_content(&self, content: &str) -> String {
        let mut result = content.to_string();
        
        // Check against each previous message
        for prev_msg in &self.previous_messages {
            // Skip very short messages
            if prev_msg.len() < 30 {
                continue;
            }
            
            // Extract a significant chunk from the previous message (first 100 chars normalized)
            let prev_normalized = prev_msg.chars().take(150).collect::<String>().to_lowercase();
            let curr_normalized = result.to_lowercase();
            
            // If the current output contains a substantial portion of a previous message, strip it
            if let Some(pos) = curr_normalized.find(&prev_normalized) {
                if pos < 50 {  // Only strip if repetition is near the start
                    tracing::warn!("Detected repetition of previous message! Stripping repeated content.");
                    // Find where the repetition ends and keep only new content
                    let end_pos = pos + prev_msg.len().min(result.len() - pos);
                    result = result[end_pos..].trim_start().to_string();
                }
            }
        }
        
        result
    }
    
    /// Clean any leftover tags from content (safety net)
    fn clean_tags(content: &str) -> String {
        let mut result = content.to_string();
        
        // Remove thinking blocks entirely (in case they slipped through)
        while let Some(start) = result.find("<thinking>") {
            if let Some(end) = result.find("</thinking>") {
                let end_pos = end + 11;
                result = format!("{}{}", &result[..start], &result[end_pos..]);
            } else {
                // No closing tag, remove from <thinking> to end
                result = result[..start].to_string();
                break;
            }
        }
        
        // Remove standalone tags
        result = result.replace("<RESPONSE>", "");
        result = result.replace("</RESPONSE>", "");
        result = result.replace("<thinking>", "");
        result = result.replace("</thinking>", "");
        
        result.trim().to_string()
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
                let cleaned = Self::clean_tags(&self.buffer);
                if !cleaned.is_empty() {
                    output.push(cleaned);
                }
                self.buffer.clear();
                break;
            }

            if self.buffer.is_empty() {
                break;
            }

            // Check for thinking block start
            if let Some(think_start) = self.buffer.find("<thinking>") {
                // Found thinking start - discard everything before and enter thinking mode
                self.seen_any_tag = true;
                if think_start > 0 {
                    // There's content before <thinking> - if we're in response mode, emit it
                    if self.in_response_block {
                        let before = self.buffer[..think_start].to_string();
                        if !before.trim().is_empty() {
                            output.push(before);
                        }
                    }
                }
                self.buffer = self.buffer[think_start + 10..].to_string();
                self.in_thinking_block = true;
                self.in_response_block = false;
                continue;
            }

            // If in thinking block, look for end
            if self.in_thinking_block {
                if let Some(think_end) = self.buffer.find("</thinking>") {
                    // Found end of thinking - discard thinking content
                    tracing::debug!("Discarding thinking block content");
                    self.buffer = self.buffer[think_end + 11..].to_string();
                    self.in_thinking_block = false;
                    continue;
                } else {
                    // Still in thinking block, wait for more tokens
                    // But avoid unbounded growth
                    if self.buffer.len() > 5000 {
                        tracing::warn!("Thinking block exceeded 5000 chars, discarding");
                        self.buffer.clear();
                    }
                    break;
                }
            }

            // Check for response block start
            if let Some(resp_start) = self.buffer.find("<RESPONSE>") {
                self.seen_any_tag = true;
                // Discard everything before <RESPONSE>
                if resp_start > 0 {
                    tracing::debug!("Discarding {} chars before <RESPONSE>", resp_start);
                }
                self.buffer = self.buffer[resp_start + 10..].to_string();
                self.in_response_block = true;
                continue;
            }

            // Check for response block end
            if self.in_response_block {
                if let Some(resp_end) = self.buffer.find("</RESPONSE>") {
                    // Emit content before </RESPONSE>
                    let content = self.buffer[..resp_end].to_string();
                    if !content.is_empty() {
                        output.push(content);
                    }
                    self.buffer = self.buffer[resp_end + 11..].to_string();
                    self.in_response_block = false;
                    continue;
                } else {
                    // We're in response mode - emit content but keep potential partial tags
                    let potential_tags = ["</RESPONSE>", "<thinking>", "</thinking>"];
                    let mut keep_len = 0;
                    for tag in potential_tags {
                        for i in (1..tag.len()).rev() {
                            if self.buffer.ends_with(&tag[..i]) {
                                keep_len = keep_len.max(i);
                            }
                        }
                    }
                    
                    let emit_len = self.buffer.len().saturating_sub(keep_len);
                    if emit_len > 0 {
                        let content = self.buffer[..emit_len].to_string();
                        output.push(content);
                        self.buffer = self.buffer[emit_len..].to_string();
                    }
                    break;
                }
            }

            // Not in any block yet - check for partial tags
            let partial_tags = ["<thinking>", "<RESPONSE>"];
            let mut has_partial = false;
            for tag in partial_tags {
                for i in (1..tag.len()).rev() {
                    if self.buffer.ends_with(&tag[..i]) {
                        has_partial = true;
                        break;
                    }
                }
                if has_partial { break; }
            }
            
            if has_partial {
                // Wait for more tokens
                break;
            }
            
            // No partial tags. If buffer is getting large and we haven't seen any tags,
            // the model might not be using our tag format. Wait longer to be sure.
            if self.buffer.len() > 500 && !self.seen_any_tag {
                // Model isn't using tags - emit as-is but clean just in case
                tracing::warn!("Buffer exceeded 500 chars with no tags detected. Entering fallback mode.");
                self.in_response_block = true;
                continue;
            }
            
            // Buffer is small, wait for more
            break;
        }
        output
    }
    
    fn flush(&mut self) -> Option<String> {
        // If we are left with content in the buffer...
        
        if self.in_thinking_block {
             tracing::warn!("Stream ended inside thinking block. Discarding remaining buffer.");
             self.buffer.clear();
             return None;
        }
        
        if self.in_response_block || !self.buffer.is_empty() {
            // Emit whatever is left, cleaned 
            let content = self.buffer.clone();
            self.buffer.clear();
            
            if content.is_empty() { 
                return None; 
            }
            
            // Clean any stray tags
            let cleaned = Self::clean_tags(&content);
            if cleaned.is_empty() {
                return None;
            }
            
            // Check for repetition before returning
            let final_content = self.strip_repeated_content(&cleaned);
            if final_content.is_empty() {
                return None;
            }
            
            tracing::info!("Flushing final content: {} chars", final_content.len());
            return Some(final_content);
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
    previous_messages: Vec<String>,
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
    let mut filter = TokenFilter::with_history(character_name, previous_messages);
    
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

fn build_llm_messages(context: &crate::services::ContextResult, _character_name: &str) -> Vec<serde_json::Value> {
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
        
        // Use content directly - the role already identifies the speaker
        // Adding name prefixes can train the model to repeat "Name:" patterns
        let content = msg.content.clone();
        
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