import { create } from 'zustand';
import type { Settings, ModelStatus } from '@/types';
import { commands } from '@/lib/commands';

interface SettingsState {
  settings: Settings | null;
  modelStatus: ModelStatus | null;
  isLoading: boolean;
  error: string | null;

  fetchSettings: () => Promise<void>;
  updateSetting: (key: string, value: string) => Promise<void>;
  fetchModelStatus: () => Promise<void>;
  startSidecar: () => Promise<void>;
  stopSidecar: () => Promise<void>;
  setFirstRunComplete: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  modelStatus: null,
  isLoading: false,
  error: null,

  fetchSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const settings = await commands.getSettings();
      set({ settings, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  updateSetting: async (key, value) => {
    await commands.updateSetting(key, value);
    const settings = await commands.getSettings();
    set({ settings });
  },

  fetchModelStatus: async () => {
    try {
      const modelStatus = await commands.getModelStatus();
      set({ modelStatus });
    } catch (e) {
      // Don't set global error for background polling
      console.error(e);
    }
  },

  startSidecar: async () => {
    set({ isLoading: true, error: null });
    try {
      await commands.startSidecar();
      set({
        modelStatus: { status: 'ready', modelPath: null, modelLoaded: true },
        isLoading: false,
      });
    } catch (e) {
      const errorMsg = String(e);
      set({
        error: errorMsg,
        modelStatus: { status: 'error', modelPath: null, modelLoaded: false },
        isLoading: false,
      });
      // CRITICAL FIX: Rethrow so the UI component knows it failed
      throw e;
    }
  },

  stopSidecar: async () => {
    try {
      await commands.stopSidecar();
      set({ modelStatus: { status: 'not_found', modelPath: null, modelLoaded: false } });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  setFirstRunComplete: async () => {
    await commands.updateSetting('app.first_run', 'false');
    const settings = await commands.getSettings();
    set({ settings });
  },
}));