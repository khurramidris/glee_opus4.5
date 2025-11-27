export const DEFAULT_MODEL_URL = 'https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF/resolve/main/llama-2-7b-chat.Q4_K_M.gguf';

export const SUPPORTED_MODEL_EXTENSIONS = ['.gguf'];

export const MAX_AVATAR_SIZE = 10 * 1024 * 1024; // 10MB

export const SUPPORTED_AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

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
} as const;
