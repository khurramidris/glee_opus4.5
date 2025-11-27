import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Character, CreateCharacterInput, UpdateCharacterInput } from '@/types';
import { commands } from '@/lib/commands';

interface CharacterState {
  characters: Character[];
  isLoading: boolean;
  error: string | null;
  
  fetchCharacters: () => Promise<void>;
  createCharacter: (input: CreateCharacterInput) => Promise<Character>;
  updateCharacter: (id: string, input: UpdateCharacterInput) => Promise<Character>;
  deleteCharacter: (id: string) => Promise<void>;
  importCharacterCard: (jsonData: string, avatarBase64?: string) => Promise<Character>;
  getCharacter: (id: string) => Character | undefined;
}

export const useCharacterStore = create<CharacterState>()(
  immer((set, get) => ({
    characters: [],
    isLoading: false,
    error: null,

    fetchCharacters: async () => {
      set({ isLoading: true, error: null });
      try {
        const characters = await commands.listCharacters();
        set({ characters, isLoading: false });
      } catch (e) {
        set({ error: String(e), isLoading: false });
      }
    },

    createCharacter: async (input) => {
      const character = await commands.createCharacter(input);
      set((state) => {
        state.characters.unshift(character);
      });
      return character;
    },

    updateCharacter: async (id, input) => {
      const character = await commands.updateCharacter(id, input);
      set((state) => {
        const index = state.characters.findIndex((c) => c.id === id);
        if (index !== -1) {
          state.characters[index] = character;
        }
      });
      return character;
    },

    deleteCharacter: async (id) => {
      await commands.deleteCharacter(id);
      set((state) => {
        state.characters = state.characters.filter((c) => c.id !== id);
      });
    },

    importCharacterCard: async (jsonData, avatarBase64) => {
      const character = await commands.importCharacterCard(jsonData, avatarBase64);
      set((state) => {
        state.characters.unshift(character);
      });
      return character;
    },

    getCharacter: (id) => {
      return get().characters.find((c) => c.id === id);
    },
  }))
);
