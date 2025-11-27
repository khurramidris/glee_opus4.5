import { invoke } from '@tauri-apps/api/core';
import type {
  Character,
  CreateCharacterInput,
  UpdateCharacterInput,
  Conversation,
  CreateConversationInput,
  UpdateConversationInput,
  Message,
  SendMessageInput,
  EditMessageInput,
  Persona,
  CreatePersonaInput,
  UpdatePersonaInput,
  Lorebook,
  LorebookEntry,
  CreateLorebookInput,
  UpdateLorebookInput,
  CreateEntryInput,
  UpdateEntryInput,
  Settings,
  AppInfo,
  ModelStatus,
  Download,
  StartDownloadInput,
} from '@/types';

// Character commands
export const commands = {
  // Characters
  createCharacter: (input: CreateCharacterInput): Promise<Character> =>
    invoke('create_character', { input }),

  getCharacter: (id: string): Promise<Character> =>
    invoke('get_character', { id }),

  listCharacters: (): Promise<Character[]> =>
    invoke('list_characters'),

  updateCharacter: (id: string, input: UpdateCharacterInput): Promise<Character> =>
    invoke('update_character', { id, input }),

  deleteCharacter: (id: string): Promise<void> =>
    invoke('delete_character', { id }),

  importCharacterCard: (jsonData: string, avatarBase64?: string): Promise<Character> =>
    invoke('import_character_card', { jsonData, avatarBase64 }),

  // Personas
  createPersona: (input: CreatePersonaInput): Promise<Persona> =>
    invoke('create_persona', { input }),

  getPersona: (id: string): Promise<Persona> =>
    invoke('get_persona', { id }),

  listPersonas: (): Promise<Persona[]> =>
    invoke('list_personas'),

  updatePersona: (id: string, input: UpdatePersonaInput): Promise<Persona> =>
    invoke('update_persona', { id, input }),

  deletePersona: (id: string): Promise<void> =>
    invoke('delete_persona', { id }),

  setDefaultPersona: (id: string): Promise<Persona> =>
    invoke('set_default_persona', { id }),

  // Conversations
  createConversation: (input: CreateConversationInput): Promise<Conversation> =>
    invoke('create_conversation', { input }),

  getConversation: (id: string): Promise<Conversation> =>
    invoke('get_conversation', { id }),

  listConversations: (): Promise<Conversation[]> =>
    invoke('list_conversations'),

  updateConversation: (id: string, input: UpdateConversationInput): Promise<Conversation> =>
    invoke('update_conversation', { id, input }),

  deleteConversation: (id: string): Promise<void> =>
    invoke('delete_conversation', { id }),

  getConversationMessages: (conversationId: string): Promise<Message[]> =>
    invoke('get_conversation_messages', { conversationId }),

  // Messages
  sendMessage: (input: SendMessageInput): Promise<Message> =>
    invoke('send_message', { input }),

  regenerateMessage: (messageId: string): Promise<void> =>
    invoke('regenerate_message', { messageId }),

  editMessage: (input: EditMessageInput): Promise<Message> =>
    invoke('edit_message', { input }),

  deleteMessage: (messageId: string): Promise<void> =>
    invoke('delete_message', { messageId }),

  getBranchSiblings: (messageId: string): Promise<Message[]> =>
    invoke('get_branch_siblings', { messageId }),

  switchBranch: (messageId: string): Promise<Message[]> =>
    invoke('switch_branch', { messageId }),

  stopGeneration: (): Promise<void> =>
    invoke('stop_generation'),

  // Lorebooks
  createLorebook: (input: CreateLorebookInput): Promise<Lorebook> =>
    invoke('create_lorebook', { input }),

  getLorebook: (id: string): Promise<Lorebook> =>
    invoke('get_lorebook', { id }),

  listLorebooks: (): Promise<Lorebook[]> =>
    invoke('list_lorebooks'),

  updateLorebook: (id: string, input: UpdateLorebookInput): Promise<Lorebook> =>
    invoke('update_lorebook', { id, input }),

  deleteLorebook: (id: string): Promise<void> =>
    invoke('delete_lorebook', { id }),

  createEntry: (input: CreateEntryInput): Promise<LorebookEntry> =>
    invoke('create_entry', { input }),

  updateEntry: (id: string, input: UpdateEntryInput): Promise<LorebookEntry> =>
    invoke('update_entry', { id, input }),

  deleteEntry: (id: string): Promise<void> =>
    invoke('delete_entry', { id }),

  attachToConversation: (conversationId: string, lorebookId: string): Promise<void> =>
    invoke('attach_to_conversation', { conversationId, lorebookId }),

  detachFromConversation: (conversationId: string, lorebookId: string): Promise<void> =>
    invoke('detach_from_conversation', { conversationId, lorebookId }),

  // Settings
  getSettings: (): Promise<Settings> =>
    invoke('get_settings'),

  getSetting: (key: string): Promise<string | null> =>
    invoke('get_setting', { key }),

  updateSetting: (key: string, value: string): Promise<void> =>
    invoke('update_setting', { key, value }),

  // System
  getAppInfo: (): Promise<AppInfo> =>
    invoke('get_app_info'),

  getModelStatus: (): Promise<ModelStatus> =>
    invoke('get_model_status'),

  startSidecar: (): Promise<void> =>
    invoke('start_sidecar'),

  stopSidecar: (): Promise<void> =>
    invoke('stop_sidecar'),

  healthCheck: (): Promise<boolean> =>
    invoke('health_check'),

  // Downloads
  startModelDownload: (input: StartDownloadInput): Promise<Download> =>
    invoke('start_model_download', { input }),

  pauseDownload: (id: string): Promise<Download> =>
    invoke('pause_download', { id }),

  resumeDownload: (id: string): Promise<Download> =>
    invoke('resume_download', { id }),

  cancelDownload: (id: string): Promise<void> =>
    invoke('cancel_download', { id }),

  getDownloadStatus: (id: string): Promise<Download> =>
    invoke('get_download_status', { id }),

  // Export/Import
  exportCharacter: (id: string): Promise<string> =>
    invoke('export_character', { id }),

  exportConversation: (id: string): Promise<string> =>
    invoke('export_conversation', { id }),

  exportAllData: (): Promise<string> =>
    invoke('export_all_data'),

  importCharacter: (data: string): Promise<Character> =>
    invoke('import_character', { data }),

  importData: (data: string): Promise<string> =>
    invoke('import_data', { data }),
};
