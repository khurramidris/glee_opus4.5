export const DEFAULT_MODEL_URL = 'https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF/resolve/main/llama-2-7b-chat.Q4_K_M.gguf';

export const SUPPORTED_MODEL_EXTENSIONS = ['.gguf'];

export const MAX_AVATAR_SIZE = 10 * 1024 * 1024; // 10MB

export const SUPPORTED_AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export const MAX_MESSAGE_LENGTH = 100_000;
export const MAX_CHARACTER_NAME_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 50_000;

export const KEYBOARD_SHORTCUTS = {
  sendMessage: 'Enter',
  newLine: 'Shift+Enter',
  newConversation: 'Ctrl+N',
  openSettings: 'Ctrl+,',
  editLastMessage: 'Ctrl+E',
  regenerateResponse: 'Ctrl+R',
  previousBranch: 'Ctrl+Left',
  nextBranch: 'Ctrl+Right',
  quickSearch: 'Ctrl+K',
  escape: 'Escape',
  stopGeneration: 'Escape',
} as const;

export const TOKEN_BUDGET = {
  systemPrompt: 500,
  persona: 100,
  lorebook: 500,
  responseReserved: 512,
  exampleDialogues: 300,
} as const;

export const GENERATION_DEFAULTS = {
  temperature: 0.8,
  maxTokens: 512,
  topP: 0.9,
  contextSize: 8192,
  lorebookBudget: 500,
  responseReserve: 512,
} as const;

export const DEBOUNCE_DELAYS = {
  search: 300,
  save: 1000,
  resize: 100,
} as const;

export const TOAST_DURATIONS = {
  success: 3000,
  error: 5000,
  info: 4000,
  warning: 4000,
} as const;