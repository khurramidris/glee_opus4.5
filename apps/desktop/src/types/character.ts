export interface Character {
  id: string;
  name: string;
  description: string;
  personality: string;
  systemPrompt: string;
  firstMessage: string;
  exampleDialogues: string;
  avatarPath: string | null;
  tags: string[];
  isBundled: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  metadata: Record<string, unknown>;
}

export interface CreateCharacterInput {
  name: string;
  description?: string;
  personality?: string;
  systemPrompt?: string;
  firstMessage?: string;
  exampleDialogues?: string;
  avatarPath?: string;
  tags?: string[];
}

export interface UpdateCharacterInput {
  name?: string;
  description?: string;
  personality?: string;
  systemPrompt?: string;
  firstMessage?: string;
  exampleDialogues?: string;
  avatarPath?: string;
  tags?: string[];
}

export interface ExportedCharacter {
  gleeExportVersion: string;
  exportType: string;
  exportedAt: string;
  character: Character;
  avatarBase64: string | null;
}
