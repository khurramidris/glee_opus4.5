export interface Settings {
  generation: GenerationSettings;
  app: AppSettings;
  model: ModelSettings;
}

export interface GenerationSettings {
  temperature: number;
  maxTokens: number;
  topP: number;
  contextSize: number;
  lorebookBudget?: number;
  responseReserve?: number;
}

export interface AppSettings {
  theme: string;
  firstRun: boolean;
}

export interface ModelSettings {
  path: string;
  gpuLayers: number;
}

export interface AppInfo {
  version: string;
  dataDir: string;
  modelLoaded: boolean;
  modelPath: string | null;
}

export interface ModelStatus {
  status: 'loading' | 'ready' | 'error' | 'not_found' | 'not_loaded';
  modelPath: string | null;
  modelLoaded: boolean;
}

export interface Download {
  id: string;
  url: string;
  destinationPath: string;
  totalBytes: number;
  downloadedBytes: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled' | 'paused';
  checksum: string | null;
  createdAt: number;
  updatedAt: number;
  errorMessage: string | null;
}

export interface StartDownloadInput {
  url: string;
  checksum?: string;
}