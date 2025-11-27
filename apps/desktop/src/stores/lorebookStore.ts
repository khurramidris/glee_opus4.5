import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  Lorebook,
  LorebookEntry,
  CreateLorebookInput,
  UpdateLorebookInput,
  CreateEntryInput,
  UpdateEntryInput,
} from '@/types';
import { commands } from '@/lib/commands';

interface LorebookState {
  lorebooks: Lorebook[];
  isLoading: boolean;
  error: string | null;
  
  fetchLorebooks: () => Promise<void>;
  createLorebook: (input: CreateLorebookInput) => Promise<Lorebook>;
  updateLorebook: (id: string, input: UpdateLorebookInput) => Promise<Lorebook>;
  deleteLorebook: (id: string) => Promise<void>;
  getLorebook: (id: string) => Lorebook | undefined;
  
  // Entries
  createEntry: (input: CreateEntryInput) => Promise<LorebookEntry>;
  updateEntry: (id: string, input: UpdateEntryInput) => Promise<LorebookEntry>;
  deleteEntry: (id: string, lorebookId: string) => Promise<void>;
}

export const useLorebookStore = create<LorebookState>()(
  immer((set, get) => ({
    lorebooks: [],
    isLoading: false,
    error: null,

    fetchLorebooks: async () => {
      set({ isLoading: true, error: null });
      try {
        const lorebooks = await commands.listLorebooks();
        set({ lorebooks, isLoading: false });
      } catch (e) {
        set({ error: String(e), isLoading: false });
      }
    },

    createLorebook: async (input) => {
      const lorebook = await commands.createLorebook(input);
      set((state) => {
        state.lorebooks.unshift(lorebook);
      });
      return lorebook;
    },

    updateLorebook: async (id, input) => {
      const lorebook = await commands.updateLorebook(id, input);
      set((state) => {
        const index = state.lorebooks.findIndex((l) => l.id === id);
        if (index !== -1) {
          state.lorebooks[index] = lorebook;
        }
      });
      return lorebook;
    },

    deleteLorebook: async (id) => {
      await commands.deleteLorebook(id);
      set((state) => {
        state.lorebooks = state.lorebooks.filter((l) => l.id !== id);
      });
    },

    getLorebook: (id) => {
      return get().lorebooks.find((l) => l.id === id);
    },

    createEntry: async (input) => {
      const entry = await commands.createEntry(input);
      set((state) => {
        const lorebook = state.lorebooks.find((l) => l.id === input.lorebookId);
        if (lorebook) {
          lorebook.entries.push(entry);
        }
      });
      return entry;
    },

    updateEntry: async (id, input) => {
      const entry = await commands.updateEntry(id, input);
      set((state) => {
        for (const lorebook of state.lorebooks) {
          const index = lorebook.entries.findIndex((e) => e.id === id);
          if (index !== -1) {
            lorebook.entries[index] = entry;
            break;
          }
        }
      });
      return entry;
    },

    deleteEntry: async (id, lorebookId) => {
      await commands.deleteEntry(id);
      set((state) => {
        const lorebook = state.lorebooks.find((l) => l.id === lorebookId);
        if (lorebook) {
          lorebook.entries = lorebook.entries.filter((e) => e.id !== id);
        }
      });
    },
  }))
);
