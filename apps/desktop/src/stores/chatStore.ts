import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Message, SendMessageInput, EditMessageInput, Conversation } from '@/types';
import { commands } from '@/lib/commands';

interface ChatState {
  // Current conversation
  conversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  
  // Streaming state
  streamingMessages: Map<string, string>;
  isGenerating: boolean;
  
  // Actions
  loadConversation: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<Message | null>;
  regenerateMessage: (messageId: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<Message | null>;
  stopGeneration: () => Promise<void>;
  
  // Branch navigation
  switchBranch: (messageId: string) => Promise<void>;
  getBranchSiblings: (messageId: string) => Promise<Message[]>;
  
  // Streaming updates
  appendStreamToken: (messageId: string, token: string) => void;
  finalizeStreamMessage: (message: Message) => void;
  setGenerating: (isGenerating: boolean) => void;
  
  // Clear
  clearChat: () => void;
}

export const useChatStore = create<ChatState>()(
  immer((set, get) => ({
    conversation: null,
    messages: [],
    isLoading: false,
    error: null,
    streamingMessages: new Map(),
    isGenerating: false,

    loadConversation: async (id) => {
      set({ isLoading: true, error: null, streamingMessages: new Map() });
      try {
        const [conversation, messages] = await Promise.all([
          commands.getConversation(id),
          commands.getConversationMessages(id),
        ]);
        set({ conversation, messages, isLoading: false });
      } catch (e) {
        set({ error: String(e), isLoading: false });
      }
    },

    sendMessage: async (content) => {
      const { conversation } = get();
      if (!conversation) return null;
      
      try {
        const message = await commands.sendMessage({
          conversationId: conversation.id,
          content,
        });
        
        set((state) => {
          state.messages.push(message);
          state.isGenerating = true;
        });
        
        return message;
      } catch (e) {
        set({ error: String(e) });
        return null;
      }
    },

    regenerateMessage: async (messageId) => {
      try {
        await commands.regenerateMessage(messageId);
        set({ isGenerating: true });
        
        // Reload messages to get updated branch state
        const { conversation } = get();
        if (conversation) {
          const messages = await commands.getConversationMessages(conversation.id);
          set({ messages });
        }
      } catch (e) {
        set({ error: String(e) });
      }
    },

    editMessage: async (messageId, content) => {
      try {
        const message = await commands.editMessage({ messageId, content });
        
        // Reload messages to get updated branch state
        const { conversation } = get();
        if (conversation) {
          const messages = await commands.getConversationMessages(conversation.id);
          set({ messages, isGenerating: true });
        }
        
        return message;
      } catch (e) {
        set({ error: String(e) });
        return null;
      }
    },

    stopGeneration: async () => {
      try {
        await commands.stopGeneration();
        set({ isGenerating: false });
      } catch (e) {
        set({ error: String(e) });
      }
    },

    switchBranch: async (messageId) => {
      try {
        const messages = await commands.switchBranch(messageId);
        set({ messages });
      } catch (e) {
        set({ error: String(e) });
      }
    },

    getBranchSiblings: async (messageId) => {
      return commands.getBranchSiblings(messageId);
    },

    appendStreamToken: (messageId, token) => {
      set((state) => {
        const current = state.streamingMessages.get(messageId) || '';
        state.streamingMessages.set(messageId, current + token);
      });
    },

    finalizeStreamMessage: (message) => {
      set((state) => {
        state.streamingMessages.delete(message.id);
        state.isGenerating = false;
        
        // Update or add the message
        const index = state.messages.findIndex((m) => m.id === message.id);
        if (index !== -1) {
          state.messages[index] = message;
        } else {
          state.messages.push(message);
        }
      });
    },

    setGenerating: (isGenerating) => {
      set({ isGenerating });
    },

    clearChat: () => {
      set({
        conversation: null,
        messages: [],
        streamingMessages: new Map(),
        isGenerating: false,
        error: null,
      });
    },
  }))
);
