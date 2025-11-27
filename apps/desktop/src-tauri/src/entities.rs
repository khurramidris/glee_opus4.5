use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

// ============================================
// Common Types
// ============================================

pub fn new_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

pub fn now_timestamp() -> i64 {
    Utc::now().timestamp()
}

// ============================================
// Persona
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Persona {
    pub id: String,
    pub name: String,
    pub description: String,
    pub is_default: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub deleted_at: Option<i64>,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePersonaInput {
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub is_default: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePersonaInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub is_default: Option<bool>,
}

// ============================================
// Character
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Character {
    pub id: String,
    pub name: String,
    pub description: String,
    pub personality: String,
    pub system_prompt: String,
    pub first_message: String,
    pub example_dialogues: String,
    pub avatar_path: Option<String>,
    pub tags: Vec<String>,
    pub is_bundled: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub deleted_at: Option<i64>,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCharacterInput {
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub personality: String,
    #[serde(default)]
    pub system_prompt: String,
    #[serde(default)]
    pub first_message: String,
    #[serde(default)]
    pub example_dialogues: String,
    pub avatar_path: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCharacterInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub personality: Option<String>,
    pub system_prompt: Option<String>,
    pub first_message: Option<String>,
    pub example_dialogues: Option<String>,
    pub avatar_path: Option<String>,
    pub tags: Option<Vec<String>>,
}

// ============================================
// Conversation
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub persona_id: Option<String>,
    pub is_group: bool,
    pub active_message_id: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    pub deleted_at: Option<i64>,
    pub metadata: serde_json::Value,
    // Joined data
    #[serde(default)]
    pub characters: Vec<Character>,
    #[serde(default)]
    pub lorebook_ids: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateConversationInput {
    pub character_ids: Vec<String>,
    pub title: Option<String>,
    pub persona_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateConversationInput {
    pub title: Option<String>,
    pub persona_id: Option<String>,
}

// ============================================
// Message
// ============================================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AuthorType {
    User,
    Character,
    System,
}

impl AuthorType {
    pub fn as_str(&self) -> &'static str {
        match self {
            AuthorType::User => "user",
            AuthorType::Character => "character",
            AuthorType::System => "system",
        }
    }
    
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "user" => Some(AuthorType::User),
            "character" => Some(AuthorType::Character),
            "system" => Some(AuthorType::System),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub parent_id: Option<String>,
    pub author_type: AuthorType,
    pub author_id: Option<String>,
    pub content: String,
    pub is_active_branch: bool,
    pub branch_index: i32,
    pub token_count: i32,
    pub generation_params: Option<serde_json::Value>,
    pub created_at: i64,
    pub metadata: serde_json::Value,
    // Joined data for display
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sibling_count: Option<i32>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendMessageInput {
    pub conversation_id: String,
    pub content: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EditMessageInput {
    pub message_id: String,
    pub content: String,
}

// ============================================
// Lorebook
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Lorebook {
    pub id: String,
    pub name: String,
    pub description: String,
    pub is_global: bool,
    pub is_enabled: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub deleted_at: Option<i64>,
    pub metadata: serde_json::Value,
    #[serde(default)]
    pub entries: Vec<LorebookEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LorebookEntry {
    pub id: String,
    pub lorebook_id: String,
    pub name: String,
    pub keywords: Vec<String>,
    pub content: String,
    pub priority: i32,
    pub is_enabled: bool,
    pub case_sensitive: bool,
    pub match_whole_word: bool,
    pub insertion_position: String,
    pub token_budget: Option<i32>,
    pub created_at: i64,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateLorebookInput {
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub is_global: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateLorebookInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub is_global: Option<bool>,
    pub is_enabled: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateEntryInput {
    pub lorebook_id: String,
    pub name: String,
    pub keywords: Vec<String>,
    pub content: String,
    #[serde(default = "default_priority")]
    pub priority: i32,
    #[serde(default)]
    pub case_sensitive: bool,
    #[serde(default = "default_true")]
    pub match_whole_word: bool,
    #[serde(default = "default_insertion_position")]
    pub insertion_position: String,
    pub token_budget: Option<i32>,
}

fn default_priority() -> i32 { 50 }
fn default_true() -> bool { true }
fn default_insertion_position() -> String { "after_system".to_string() }

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateEntryInput {
    pub name: Option<String>,
    pub keywords: Option<Vec<String>>,
    pub content: Option<String>,
    pub priority: Option<i32>,
    pub is_enabled: Option<bool>,
    pub case_sensitive: Option<bool>,
    pub match_whole_word: Option<bool>,
    pub insertion_position: Option<String>,
    pub token_budget: Option<i32>,
}

// ============================================
// Settings
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub generation: GenerationSettings,
    pub app: AppSettings,
    pub model: ModelSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerationSettings {
    pub temperature: f32,
    pub max_tokens: i32,
    pub top_p: f32,
    pub context_size: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub theme: String,
    pub first_run: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelSettings {
    pub path: String,
    pub gpu_layers: i32,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            generation: GenerationSettings {
                temperature: 0.8,
                max_tokens: 512,
                top_p: 0.9,
                context_size: 8192,
            },
            app: AppSettings {
                theme: "dark".to_string(),
                first_run: true,
            },
            model: ModelSettings {
                path: String::new(),
                gpu_layers: 99,
            },
        }
    }
}

// ============================================
// Queue Task
// ============================================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum QueueStatus {
    Pending,
    Processing,
    Completed,
    Failed,
    Cancelled,
}

impl QueueStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            QueueStatus::Pending => "pending",
            QueueStatus::Processing => "processing",
            QueueStatus::Completed => "completed",
            QueueStatus::Failed => "failed",
            QueueStatus::Cancelled => "cancelled",
        }
    }
    
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "pending" => Some(QueueStatus::Pending),
            "processing" => Some(QueueStatus::Processing),
            "completed" => Some(QueueStatus::Completed),
            "failed" => Some(QueueStatus::Failed),
            "cancelled" => Some(QueueStatus::Cancelled),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueueTask {
    pub id: String,
    pub conversation_id: String,
    pub parent_message_id: Option<String>,
    pub target_character_id: Option<String>,
    pub status: QueueStatus,
    pub priority: i32,
    pub created_at: i64,
    pub started_at: Option<i64>,
    pub completed_at: Option<i64>,
    pub error_message: Option<String>,
    pub metadata: serde_json::Value,
}

// ============================================
// Download
// ============================================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DownloadStatus {
    Pending,
    Downloading,
    Completed,
    Failed,
    Cancelled,
    Paused,
}

impl DownloadStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            DownloadStatus::Pending => "pending",
            DownloadStatus::Downloading => "downloading",
            DownloadStatus::Completed => "completed",
            DownloadStatus::Failed => "failed",
            DownloadStatus::Cancelled => "cancelled",
            DownloadStatus::Paused => "paused",
        }
    }
    
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "pending" => Some(DownloadStatus::Pending),
            "downloading" => Some(DownloadStatus::Downloading),
            "completed" => Some(DownloadStatus::Completed),
            "failed" => Some(DownloadStatus::Failed),
            "cancelled" => Some(DownloadStatus::Cancelled),
            "paused" => Some(DownloadStatus::Paused),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Download {
    pub id: String,
    pub url: String,
    pub destination_path: String,
    pub total_bytes: i64,
    pub downloaded_bytes: i64,
    pub status: DownloadStatus,
    pub checksum: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartDownloadInput {
    pub url: String,
    pub checksum: Option<String>,
}

// ============================================
// Events (for Tauri emit)
// ============================================

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatTokenEvent {
    pub conversation_id: String,
    pub message_id: String,
    pub token: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatCompleteEvent {
    pub conversation_id: String,
    pub message: Message,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatErrorEvent {
    pub conversation_id: String,
    pub message_id: Option<String>,
    pub error: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgressEvent {
    pub id: String,
    pub downloaded_bytes: i64,
    pub total_bytes: i64,
    pub speed_bps: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelStatusEvent {
    pub status: String, // "loading", "ready", "error", "not_found"
    pub message: Option<String>,
}

// ============================================
// Character Card Import (TavernAI V2)
// ============================================

#[derive(Debug, Clone, Deserialize)]
pub struct CharacterCardV2 {
    pub spec: Option<String>,
    pub spec_version: Option<String>,
    pub data: CharacterCardData,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CharacterCardData {
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub personality: String,
    #[serde(default)]
    pub first_mes: String,
    #[serde(default)]
    pub mes_example: String,
    #[serde(default)]
    pub scenario: String,
    #[serde(default)]
    pub system_prompt: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub creator_notes: String,
}

// Legacy V1 format fallback
#[derive(Debug, Clone, Deserialize)]
pub struct CharacterCardV1 {
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub personality: String,
    #[serde(default)]
    pub first_mes: String,
    #[serde(default)]
    pub mes_example: String,
    #[serde(default)]
    pub scenario: String,
}

// ============================================
// Export/Import Types
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportedCharacter {
    pub glee_export_version: String,
    pub export_type: String,
    pub exported_at: String,
    pub character: Character,
    pub avatar_base64: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportedConversation {
    pub glee_export_version: String,
    pub export_type: String,
    pub exported_at: String,
    pub conversation: Conversation,
    pub messages: Vec<Message>,
    pub persona: Option<Persona>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub version: String,
    pub data_dir: String,
    pub model_loaded: bool,
    pub model_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelStatus {
    pub status: String,
    pub model_path: Option<String>,
    pub model_loaded: bool,
}
