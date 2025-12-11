import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Message, Conversation } from '@/types';
import { commands } from '@/lib/commands';

interface StreamingMessage {
  content: string;
  startedAt: number;
}

interface ChatState {
  conversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  streamingMessages: Record<string, StreamingMessage>;
  isGenerating: boolean;
  pendingSend: boolean;
  _updateCounter: number;
  
  loadConversation: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<Message | null>;
  regenerateMessage: (messageId: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<Message | null>;
  stopGeneration: () => Promise<void>;
  switchBranch: (messageId: string) => Promise<void>;
  getBranchSiblings: (messageId: string) => Promise<Message[]>;
  appendStreamToken: (messageId: string, token: string) => void;
  finalizeStreamMessage: (message: Message) => void;
  handleStreamError: (messageId: string | null, error: string) => void;
  setGenerating: (isGenerating: boolean) => void;
  clearChat: () => void;
  clearMessages: (conversationId: string) => void;
  clearStaleStreams: () => void;
}

const STREAM_STALE_TIMEOUT = 30000;

export const useChatStore = create<ChatState>()(
  immer((set, get) => ({
    conversation: null,
    messages: [],
    isLoading: false,
    error: null,
    streamingMessages: {},
    isGenerating: false,
    pendingSend: false,
    _updateCounter: 0,

    loadConversation: async (id) => {
      console.log('[ChatStore] loadConversation:', id);
      
      set({ 
        isLoading: true, 
        error: null, 
        streamingMessages: {},
        isGenerating: false,
        pendingSend: false,
      });
      
      try {
        const [conversation, messages] = await Promise.all([
          commands.getConversation(id),
          commands.getConversationMessages(id),
        ]);
        
        console.log('[ChatStore] Loaded:', messages.length, 'messages');
        
        set((state) => {
          state.conversation = conversation;
          state.messages = messages;
          state.isLoading = false;
          state._updateCounter++;
        });
      } catch (e) {
        console.error('[ChatStore] Load error:', e);
        set({ error: String(e), isLoading: false });
      }
    },

    sendMessage: async (content) => {
      const { conversation, pendingSend, isGenerating } = get();
      
      console.log('[ChatStore] sendMessage:', content.substring(0, 50));
      
      if (!conversation || pendingSend || isGenerating) {
        console.log('[ChatStore] sendMessage blocked:', { hasConv: !!conversation, pendingSend, isGenerating });
        return null;
      }
      
      const trimmedContent = content.trim();
      if (!trimmedContent) {
        return null;
      }
      
      set({ pendingSend: true, error: null });
      
      try {
        console.log('[ChatStore] Calling backend...');
        const message = await commands.sendMessage({
          conversationId: conversation.id,
          content: trimmedContent,
        });
        
        console.log('[ChatStore] Got message:', message.id);
        
        const currentState = get();
        set({
          messages: [...currentState.messages, message],
          isGenerating: true,
          pendingSend: false,
          _updateCounter: currentState._updateCounter + 1,
        });
        
        console.log('[ChatStore] State updated, messages:', get().messages.length);
        
        return message;
      } catch (e) {
        console.error('[ChatStore] Send error:', e);
        set({ error: String(e), pendingSend: false });
        return null;
      }
    },

    regenerateMessage: async (messageId) => {
      const { isGenerating } = get();
      
      if (isGenerating) {
        await get().stopGeneration();
      }
      
      try {
        await commands.regenerateMessage(messageId);
        set((state) => {
          state.isGenerating = true;
          state.error = null;
          state._updateCounter++;
        });
        
        const { conversation } = get();
        if (conversation) {
          const messages = await commands.getConversationMessages(conversation.id);
          set((state) => {
            state.messages = messages;
            state._updateCounter++;
          });
        }
      } catch (e) {
        console.error('[ChatStore] Regenerate error:', e);
        set({ error: String(e) });
      }
    },

    editMessage: async (messageId, content) => {
      const trimmedContent = content.trim();
      if (!trimmedContent) {
        set({ error: 'Message cannot be empty' });
        return null;
      }
      
      try {
        const message = await commands.editMessage({ messageId, content: trimmedContent });
        
        const { conversation } = get();
        if (conversation) {
          const messages = await commands.getConversationMessages(conversation.id);
          set((state) => {
            state.messages = messages;
            state.isGenerating = true;
            state.error = null;
            state._updateCounter++;
          });
        }
        
        return message;
      } catch (e) {
        console.error('[ChatStore] Edit error:', e);
        set({ error: String(e) });
        return null;
      }
    },

    stopGeneration: async () => {
      try {
        await commands.stopGeneration();
        set((state) => {
          state.isGenerating = false;
          state.streamingMessages = {};
          state._updateCounter++;
        });
      } catch (e) {
        console.error('[ChatStore] Stop error:', e);
        set({ error: String(e) });
      }
    },

    switchBranch: async (messageId) => {
      try {
        if (get().isGenerating) {
          await get().stopGeneration();
        }
        
        const messages = await commands.switchBranch(messageId);
        set((state) => {
          state.messages = messages;
          state.error = null;
          state._updateCounter++;
        });
      } catch (e) {
        console.error('[ChatStore] Switch branch error:', e);
        set({ error: String(e) });
      }
    },

    getBranchSiblings: async (messageId) => {
      return commands.getBranchSiblings(messageId);
    },

    appendStreamToken: (messageId, token) => {
      console.log('[ChatStore] appendStreamToken:', messageId, token.substring(0, 10));
      
      const currentState = get();
      const currentStreaming = currentState.streamingMessages[messageId];
      
      const newStreaming = {
        ...currentState.streamingMessages,
        [messageId]: currentStreaming
          ? { ...currentStreaming, content: currentStreaming.content + token }
          : { content: token, startedAt: Date.now() },
      };
      
      set({
        streamingMessages: newStreaming,
        _updateCounter: currentState._updateCounter + 1,
      });
    },

    finalizeStreamMessage: (message) => {
      console.log('[ChatStore] finalizeStreamMessage:', message.id);
      
      const currentState = get();
      
      const { [message.id]: _, ...newStreaming } = currentState.streamingMessages;
      
      const index = currentState.messages.findIndex((m) => m.id === message.id);
      const newMessages = index !== -1
        ? [
            ...currentState.messages.slice(0, index),
            message,
            ...currentState.messages.slice(index + 1),
          ]
        : [...currentState.messages, message];
      
      set({
        streamingMessages: newStreaming,
        isGenerating: false,
        messages: newMessages,
        _updateCounter: currentState._updateCounter + 1,
      });
      
      console.log('[ChatStore] After finalize - messages:', get().messages.length);
    },

    handleStreamError: (messageId, error) => {
      console.error('[ChatStore] handleStreamError:', error);
      
      set((state) => {
        if (messageId) {
          const newStreaming = { ...state.streamingMessages };
          delete newStreaming[messageId];
          state.streamingMessages = newStreaming;
        }
        state.isGenerating = false;
        state.error = error;
        state._updateCounter++;
      });
    },

    setGenerating: (isGenerating) => {
      set((state) => {
        state.isGenerating = isGenerating;
        state._updateCounter++;
      });
    },

    clearChat: () => {
      console.log('[ChatStore] clearChat');
      set({
        conversation: null,
        messages: [],
        streamingMessages: {},
        isGenerating: false,
        pendingSend: false,
        error: null,
        _updateCounter: 0,
      });
    },

    clearMessages: (conversationId) => {
      console.log('[ChatStore] clearMessages for:', conversationId);
      const { conversation } = get();
      if (conversation && conversation.id === conversationId) {
        set({
          messages: [],
          streamingMessages: {},
          isGenerating: false,
          pendingSend: false,
          _updateCounter: get()._updateCounter + 1,
        });
      }
    },

    clearStaleStreams: () => {
      const now = Date.now();
      const { streamingMessages } = get();
      
      const staleIds = Object.entries(streamingMessages)
        .filter(([_, stream]) => now - stream.startedAt > STREAM_STALE_TIMEOUT)
        .map(([id]) => id);
      
      if (staleIds.length > 0) {
        console.log('[ChatStore] Clearing stale streams:', staleIds);
        set((state) => {
          const newStreaming = { ...state.streamingMessages };
          staleIds.forEach((id) => delete newStreaming[id]);
          state.streamingMessages = newStreaming;
          
          if (Object.keys(newStreaming).length === 0) {
            state.isGenerating = false;
          }
          state._updateCounter++;
        });
      }
    },
  }))
);
