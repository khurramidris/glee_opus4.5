import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Persona, CreatePersonaInput, UpdatePersonaInput } from '@/types';
import { commands } from '@/lib/commands';

interface PersonaState {
  personas: Persona[];
  isLoading: boolean;
  error: string | null;
  
  fetchPersonas: () => Promise<void>;
  createPersona: (input: CreatePersonaInput) => Promise<Persona>;
  updatePersona: (id: string, input: UpdatePersonaInput) => Promise<Persona>;
  deletePersona: (id: string) => Promise<void>;
  setDefaultPersona: (id: string) => Promise<Persona>;
  getDefaultPersona: () => Persona | undefined;
}

export const usePersonaStore = create<PersonaState>()(
  immer((set, get) => ({
    personas: [],
    isLoading: false,
    error: null,

    fetchPersonas: async () => {
      set({ isLoading: true, error: null });
      try {
        const personas = await commands.listPersonas();
        set({ personas, isLoading: false });
      } catch (e) {
        set({ error: String(e), isLoading: false });
      }
    },

    createPersona: async (input) => {
      const persona = await commands.createPersona(input);
      set((state) => {
        if (persona.isDefault) {
          state.personas.forEach((p) => (p.isDefault = false));
        }
        state.personas.unshift(persona);
      });
      return persona;
    },

    updatePersona: async (id, input) => {
      const persona = await commands.updatePersona(id, input);
      set((state) => {
        if (persona.isDefault) {
          state.personas.forEach((p) => (p.isDefault = p.id === id));
        }
        const index = state.personas.findIndex((p) => p.id === id);
        if (index !== -1) {
          state.personas[index] = persona;
        }
      });
      return persona;
    },

    deletePersona: async (id) => {
      await commands.deletePersona(id);
      set((state) => {
        state.personas = state.personas.filter((p) => p.id !== id);
      });
    },

    setDefaultPersona: async (id) => {
      const persona = await commands.setDefaultPersona(id);
      set((state) => {
        state.personas.forEach((p) => (p.isDefault = p.id === id));
      });
      return persona;
    },

    getDefaultPersona: () => {
      return get().personas.find((p) => p.isDefault);
    },
  }))
);
