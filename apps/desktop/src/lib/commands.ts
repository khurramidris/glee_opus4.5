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

// Wrapper to handle Tauri command errors consistently
async function invokeCommand<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'message' in error) {
      throw new Error((error as { message: string }).message);
    }
    throw error;
  }
}

export const commands = {
  // ==================== Characters ====================
  createCharacter: (input: CreateCharacterInput): Promise<Character> =>
    invokeCommand('create_character', { input }),

  getCharacter: (id: string): Promise<Character> =>
    invokeCommand('get_character', { id }),

  listCharacters: (): Promise<Character[]> =>
    invokeCommand('list_characters'),

  updateCharacter: (id: string, input: UpdateCharacterInput): Promise<Character> =>
    invokeCommand('update_character', { id, input }),

  deleteCharacter: (id: string): Promise<void> =>
    invokeCommand('delete_character', { id }),

  importCharacterCard: (jsonData: string, avatarBase64?: string): Promise<Character> =>
    invokeCommand('import_character_card', { jsonData, avatarBase64 }),

  // ==================== Personas ====================
  createPersona: (input: CreatePersonaInput): Promise<Persona> =>
    invokeCommand('create_persona', { input }),

  getPersona: (id: string): Promise<Persona> =>
    invokeCommand('get_persona', { id }),

  listPersonas: (): Promise<Persona[]> =>
    invokeCommand('list_personas'),

  updatePersona: (id: string, input: UpdatePersonaInput): Promise<Persona> =>
    invokeCommand('update_persona', { id, input }),

  deletePersona: (id: string): Promise<void> =>
    invokeCommand('delete_persona', { id }),

  setDefaultPersona: (id: string): Promise<Persona> =>
    invokeCommand('set_default_persona', { id }),

  // ==================== Conversations ====================
  createConversation: (input: CreateConversationInput): Promise<Conversation> =>
    invokeCommand('create_conversation', { input }),

  getConversation: (id: string): Promise<Conversation> =>
    invokeCommand('get_conversation', { id }),

  listConversations: (): Promise<Conversation[]> =>
    invokeCommand('list_conversations'),

  updateConversation: (id: string, input: UpdateConversationInput): Promise<Conversation> =>
    invokeCommand('update_conversation', { id, input }),

  deleteConversation: (id: string): Promise<void> =>
    invokeCommand('delete_conversation', { id }),

  getConversationMessages: (conversationId: string): Promise<Message[]> =>
    invokeCommand('get_conversation_messages', { conversationId }),

  findConversationByCharacter: (characterId: string): Promise<Conversation | null> =>
    invokeCommand('find_conversation_by_character', { characterId }),

  clearConversationMessages: (conversationId: string): Promise<void> =>
    invokeCommand('clear_conversation_messages', { conversationId }),

  // ==================== Messages ====================
  sendMessage: (input: SendMessageInput): Promise<Message> =>
    invokeCommand('send_message', { input }),

  regenerateMessage: (messageId: string): Promise<void> =>
    invokeCommand('regenerate_message', { messageId }),

  editMessage: (input: EditMessageInput): Promise<Message> =>
    invokeCommand('edit_message', { input }),

  deleteMessage: (messageId: string): Promise<void> =>
    invokeCommand('delete_message', { messageId }),

  getBranchSiblings: (messageId: string): Promise<Message[]> =>
    invokeCommand('get_branch_siblings', { messageId }),

  switchBranch: (messageId: string): Promise<Message[]> =>
    invokeCommand('switch_branch', { messageId }),

  stopGeneration: (): Promise<void> =>
    invokeCommand('stop_generation'),

  // ==================== Lorebooks ====================
  createLorebook: (input: CreateLorebookInput): Promise<Lorebook> =>
    invokeCommand('create_lorebook', { input }),

  getLorebook: (id: string): Promise<Lorebook> =>
    invokeCommand('get_lorebook', { id }),

  listLorebooks: (): Promise<Lorebook[]> =>
    invokeCommand('list_lorebooks'),

  updateLorebook: (id: string, input: UpdateLorebookInput): Promise<Lorebook> =>
    invokeCommand('update_lorebook', { id, input }),

  deleteLorebook: (id: string): Promise<void> =>
    invokeCommand('delete_lorebook', { id }),

  createEntry: (input: CreateEntryInput): Promise<LorebookEntry> =>
    invokeCommand('create_entry', { input }),

  updateEntry: (id: string, input: UpdateEntryInput): Promise<LorebookEntry> =>
    invokeCommand('update_entry', { id, input }),

  deleteEntry: (id: string): Promise<void> =>
    invokeCommand('delete_entry', { id }),

  attachToConversation: (conversationId: string, lorebookId: string): Promise<void> =>
    invokeCommand('attach_to_conversation', { conversationId, lorebookId }),

  detachFromConversation: (conversationId: string, lorebookId: string): Promise<void> =>
    invokeCommand('detach_from_conversation', { conversationId, lorebookId }),

  // ==================== Settings ====================
  getSettings: (): Promise<Settings> =>
    invokeCommand('get_settings'),

  getSetting: (key: string): Promise<string | null> =>
    invokeCommand('get_setting', { key }),

  updateSetting: (key: string, value: string): Promise<void> =>
    invokeCommand('update_setting', { key, value }),

  updateSettingsBatch: (settings: Array<[string, string]>): Promise<void> =>
    invokeCommand('update_settings_batch', { settings }),

  // ==================== System ====================
  getAppInfo: (): Promise<AppInfo> =>
    invokeCommand('get_app_info'),

  getModelStatus: (): Promise<ModelStatus> =>
    invokeCommand('get_model_status'),

  startSidecar: (): Promise<void> =>
    invokeCommand('start_sidecar'),

  stopSidecar: (): Promise<void> =>
    invokeCommand('stop_sidecar'),

  restartSidecar: (): Promise<void> =>
    invokeCommand('restart_sidecar'),

  healthCheck: (): Promise<boolean> =>
    invokeCommand('health_check'),

  // ==================== Downloads ====================
  startModelDownload: (input: StartDownloadInput): Promise<Download> =>
    invokeCommand('start_model_download', { input }),

  pauseDownload: (id: string): Promise<Download> =>
    invokeCommand('pause_download', { id }),

  resumeDownload: (id: string): Promise<Download> =>
    invokeCommand('resume_download', { id }),

  cancelDownload: (id: string): Promise<void> =>
    invokeCommand('cancel_download', { id }),

  getDownloadStatus: (id: string): Promise<Download> =>
    invokeCommand('get_download_status', { id }),

  // ==================== Export/Import ====================
  exportCharacter: (id: string): Promise<string> =>
    invokeCommand('export_character', { id }),

  exportConversation: (id: string): Promise<string> =>
    invokeCommand('export_conversation', { id }),

  exportAllData: (): Promise<string> =>
    invokeCommand('export_all_data'),

  importCharacter: (data: string): Promise<Character> =>
    invokeCommand('import_character', { data }),

  importData: (data: string): Promise<string> =>
    invokeCommand('import_data', { data }),
};