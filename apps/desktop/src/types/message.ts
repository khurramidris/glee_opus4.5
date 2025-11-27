export type AuthorType = 'user' | 'character' | 'system';

export interface Message {
  id: string;
  conversationId: string;
  parentId: string | null;
  authorType: AuthorType;
  authorId: string | null;
  content: string;
  isActiveBranch: boolean;
  branchIndex: number;
  tokenCount: number;
  generationParams: Record<string, unknown> | null;
  createdAt: number;
  metadata: Record<string, unknown>;
  authorName?: string;
  siblingCount?: number;
}

export interface SendMessageInput {
  conversationId: string;
  content: string;
}

export interface EditMessageInput {
  messageId: string;
  content: string;
}
