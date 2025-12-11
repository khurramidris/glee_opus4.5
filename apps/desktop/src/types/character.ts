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

  // Enhanced character fields
  scenario: string;
  backstory: string;
  likes: string[];
  dislikes: string[];
  physicalTraits: string;
  speechPatterns: string;
  alternateGreetings: string[];

  // Creator attribution
  creatorName: string;
  creatorNotes: string;
  characterVersion: string;

  // Category tags
  povType: 'any' | 'first' | 'second' | 'third';
  rating: 'sfw' | 'nsfw' | 'limitless';
  genreTags: string[];
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

  // Enhanced fields
  scenario?: string;
  backstory?: string;
  likes?: string[];
  dislikes?: string[];
  physicalTraits?: string;
  speechPatterns?: string;
  alternateGreetings?: string[];

  // Creator info
  creatorName?: string;
  creatorNotes?: string;
  characterVersion?: string;

  // Category tags
  povType?: 'any' | 'first' | 'second' | 'third';
  rating?: 'sfw' | 'nsfw' | 'limitless';
  genreTags?: string[];
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

  // Enhanced fields
  scenario?: string;
  backstory?: string;
  likes?: string[];
  dislikes?: string[];
  physicalTraits?: string;
  speechPatterns?: string;
  alternateGreetings?: string[];

  // Creator info
  creatorName?: string;
  creatorNotes?: string;
  characterVersion?: string;

  // Category tags
  povType?: 'any' | 'first' | 'second' | 'third';
  rating?: 'sfw' | 'nsfw' | 'limitless';
  genreTags?: string[];
}

export interface ExportedCharacter {
  gleeExportVersion: string;
  exportType: string;
  exportedAt: string;
  character: Character;
  avatarBase64: string | null;
}
