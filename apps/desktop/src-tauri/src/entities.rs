use serde::{Deserialize, Serialize};
use std::str::FromStr;

// ==========================================
// SHARED HELPER FUNCTIONS
// ==========================================
pub fn new_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

pub fn now_timestamp() -> i64 {
    chrono::Utc::now().timestamp()
}

// ==========================================
// DATA STRUCTURES
// ==========================================

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

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
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

// Character Card V2 - wrapper structure
// Note: No rename_all to accept both snake_case and camelCase field names
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterCardV2 {
    pub spec: String,
    #[serde(alias = "specVersion")]
    pub spec_version: String,
    pub data: CharacterCardDataV2,
}

// Character Card V2 Data - the actual character data
// Note: No rename_all to accept snake_case by default with camelCase aliases
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterCardDataV2 {
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub personality: String,
    #[serde(default)]
    pub scenario: String,
    #[serde(default, alias = "firstMes")]
    pub first_mes: String,
    #[serde(default, alias = "mesExample")]
    pub mes_example: String,
    #[serde(default, alias = "systemPrompt")]
    pub system_prompt: String,
    #[serde(default)]
    pub tags: Vec<String>,
    // Additional V2 fields that may be present
    #[serde(default, alias = "creatorNotes")]
    pub creator_notes: Option<String>,
    #[serde(default)]
    pub creator: Option<String>,
    #[serde(default, alias = "characterVersion")]
    pub character_version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterCardV1 {
    
    // Support standard "name" OR "char_name"
    #[serde(alias = "char_name")]
    pub name: String,
    
    #[serde(default, alias = "char_persona")]
    pub description: String,
    
    #[serde(default, alias = "char_personality")]
    pub personality: String,
    
    #[serde(default, alias = "world_scenario")]
    pub scenario: String,
    
    #[serde(default, alias = "char_greeting")]
    pub first_mes: String,
    
    #[serde(default, alias = "example_dialogue")]
    pub mes_example: String,
}

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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePersonaInput {
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub is_default: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePersonaInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub is_default: Option<bool>,
}

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
    pub characters: Vec<Character>,
    pub lorebook_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateConversationInput {
    pub character_ids: Vec<String>,
    pub title: Option<String>,
    pub persona_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateConversationInput {
    pub title: Option<String>,
    pub persona_id: Option<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AuthorType {
    User,
    Character,
    System,
}

impl ToString for AuthorType {
    fn to_string(&self) -> String {
        match self {
            AuthorType::User => "user".to_string(),
            AuthorType::Character => "character".to_string(),
            AuthorType::System => "system".to_string(),
        }
    }
}

impl AuthorType {
    pub fn as_str(&self) -> &'static str {
        match self {
            AuthorType::User => "user",
            AuthorType::Character => "character",
            AuthorType::System => "system",
        }
    }
}

impl FromStr for AuthorType {
    type Err = ();
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "user" => Ok(AuthorType::User),
            "character" => Ok(AuthorType::Character),
            "system" => Ok(AuthorType::System),
            _ => Err(()),
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
    pub author_name: Option<String>,
    pub sibling_count: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendMessageInput {
    pub conversation_id: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EditMessageInput {
    pub message_id: String,
    pub content: String,
}

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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateLorebookInput {
    pub name: String,
    pub description: Option<String>,
    pub is_global: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateLorebookInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub is_global: Option<bool>,
    pub is_enabled: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateEntryInput {
    pub lorebook_id: String,
    pub name: String,
    pub keywords: Vec<String>,
    pub content: String,
    pub priority: Option<i32>,
    pub case_sensitive: Option<bool>,
    pub match_whole_word: Option<bool>,
    pub insertion_position: Option<String>,
    pub token_budget: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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
    #[serde(default)]
    pub lorebook_budget: Option<i32>,
    #[serde(default)]
    pub response_reserve: Option<i32>,
    #[serde(default)]
    pub example_dialogue_budget: Option<i32>,
    #[serde(default)]
    pub stop_sequences: Option<Vec<String>>,
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
    #[serde(default)]
    pub sidecar_path: Option<String>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            generation: GenerationSettings {
                temperature: 0.8,
                max_tokens: 512,
                top_p: 0.9,
                context_size: 4096,
                lorebook_budget: Some(500),
                response_reserve: Some(512),
                example_dialogue_budget: Some(500),
                stop_sequences: None,
            },
            app: AppSettings {
                theme: "dark".to_string(),
                first_run: true,
            },
            model: ModelSettings {
                path: String::new(),
                gpu_layers: 99,
                sidecar_path: None,
            },
        }
    }
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum QueueStatus {
    Pending,
    Processing,
    Completed,
    Failed,
    Cancelled,
}

impl ToString for QueueStatus {
    fn to_string(&self) -> String {
        match self {
            QueueStatus::Pending => "pending".to_string(),
            QueueStatus::Processing => "processing".to_string(),
            QueueStatus::Completed => "completed".to_string(),
            QueueStatus::Failed => "failed".to_string(),
            QueueStatus::Cancelled => "cancelled".to_string(),
        }
    }
}

impl FromStr for QueueStatus {
    type Err = ();
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "pending" => Ok(QueueStatus::Pending),
            "processing" => Ok(QueueStatus::Processing),
            "completed" => Ok(QueueStatus::Completed),
            "failed" => Ok(QueueStatus::Failed),
            "cancelled" => Ok(QueueStatus::Cancelled),
            _ => Err(()),
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum DownloadStatus {
    Pending,
    Downloading,
    Completed,
    Failed,
    Cancelled,
    Paused,
}

impl ToString for DownloadStatus {
    fn to_string(&self) -> String {
        match self {
            DownloadStatus::Pending => "pending".to_string(),
            DownloadStatus::Downloading => "downloading".to_string(),
            DownloadStatus::Completed => "completed".to_string(),
            DownloadStatus::Failed => "failed".to_string(),
            DownloadStatus::Cancelled => "cancelled".to_string(),
            DownloadStatus::Paused => "paused".to_string(),
        }
    }
}

impl FromStr for DownloadStatus {
    type Err = ();
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "pending" => Ok(DownloadStatus::Pending),
            "downloading" => Ok(DownloadStatus::Downloading),
            "completed" => Ok(DownloadStatus::Completed),
            "failed" => Ok(DownloadStatus::Failed),
            "cancelled" => Ok(DownloadStatus::Cancelled),
            "paused" => Ok(DownloadStatus::Paused),
            _ => Err(()),
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartDownloadInput {
    pub url: String,
    pub checksum: Option<String>,
    #[serde(default)]
    pub download_type: Option<String>, // "model" or "binary"
}

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

// Events
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatTokenEvent {
    pub conversation_id: String,
    pub message_id: String,
    pub token: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatCompleteEvent {
    pub conversation_id: String,
    pub message: Message,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatErrorEvent {
    pub conversation_id: String,
    pub message_id: Option<String>,
    pub error: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgressEvent {
    pub id: String,
    pub downloaded_bytes: i64,
    pub total_bytes: i64,
    pub speed_bps: i64,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelStatusEvent {
    pub status: String,
    pub message: Option<String>,
}