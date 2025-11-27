export interface Lorebook {
  id: string;
  name: string;
  description: string;
  isGlobal: boolean;
  isEnabled: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  metadata: Record<string, unknown>;
  entries: LorebookEntry[];
}

export interface LorebookEntry {
  id: string;
  lorebookId: string;
  name: string;
  keywords: string[];
  content: string;
  priority: number;
  isEnabled: boolean;
  caseSensitive: boolean;
  matchWholeWord: boolean;
  insertionPosition: string;
  tokenBudget: number | null;
  createdAt: number;
  metadata: Record<string, unknown>;
}

export interface CreateLorebookInput {
  name: string;
  description?: string;
  isGlobal?: boolean;
}

export interface UpdateLorebookInput {
  name?: string;
  description?: string;
  isGlobal?: boolean;
  isEnabled?: boolean;
}

export interface CreateEntryInput {
  lorebookId: string;
  name: string;
  keywords: string[];
  content: string;
  priority?: number;
  caseSensitive?: boolean;
  matchWholeWord?: boolean;
  insertionPosition?: string;
  tokenBudget?: number;
}

export interface UpdateEntryInput {
  name?: string;
  keywords?: string[];
  content?: string;
  priority?: number;
  isEnabled?: boolean;
  caseSensitive?: boolean;
  matchWholeWord?: boolean;
  insertionPosition?: string;
  tokenBudget?: number;
}
