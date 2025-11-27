import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Conversation, CreateConversationInput, UpdateConversationInput } from '@/types';
import { commands } from '@/lib/commands';

interface ConversationState {
  conversations: Conversation[];
  isLoading: boolean;
  error: string | null;
  
  fetchConversations: () => Promise<void>;
  createConversation: (input: CreateConversationInput) => Promise<Conversation>;
  updateConversation: (id: string, input: UpdateConversationInput) => Promise<Conversation>;
  deleteConversation: (id: string) => Promise<void>;
  getConversation: (id: string) => Conversation | undefined;
}

export const useConversationStore = create<ConversationState>()(
  immer((set, get) => ({
    conversations: [],
    isLoading: false,
    error: null,

    fetchConversations: async () => {
      set({ isLoading: true, error: null });
      try {
        const conversations = await commands.listConversations();
        set({ conversations, isLoading: false });
      } catch (e) {
        set({ error: String(e), isLoading: false });
      }
    },

    createConversation: async (input) => {
      const conversation = await commands.createConversation(input);
      set((state) => {
        state.conversations.unshift(conversation);
      });
      return conversation;
    },

    updateConversation: async (id, input) => {
      const conversation = await commands.updateConversation(id, input);
      set((state) => {
        const index = state.conversations.findIndex((c) => c.id === id);
        if (index !== -1) {
          state.conversations[index] = conversation;
        }
      });
      return conversation;
    },

    deleteConversation: async (id) => {
      await commands.deleteConversation(id);
      set((state) => {
        state.conversations = state.conversations.filter((c) => c.id !== id);
      });
    },

    getConversation: (id) => {
      return get().conversations.find((c) => c.id === id);
    },
  }))
);
