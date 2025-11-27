import type { Character } from './character';

export interface Conversation {
  id: string;
  title: string;
  personaId: string | null;
  isGroup: boolean;
  activeMessageId: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  metadata: Record<string, unknown>;
  characters: Character[];
  lorebookIds: string[];
}

export interface CreateConversationInput {
  characterIds: string[];
  title?: string;
  personaId?: string;
}

export interface UpdateConversationInput {
  title?: string;
  personaId?: string;
}
