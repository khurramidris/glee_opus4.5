import { useEffect, useCallback, useRef } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { EventSubscriptionManager } from '@/lib/events';
import type { ChatTokenEvent, ChatCompleteEvent, ChatErrorEvent } from '@/types';
import { useUIStore } from '@/stores/uiStore';

export function useChat(conversationId: string) {
  const store = useChatStore();
  const addToast = useUIStore((s) => s.addToast);
  const subscriptionRef = useRef<EventSubscriptionManager | null>(null);
  const conversationIdRef = useRef(conversationId);
  
  conversationIdRef.current = conversationId;
  
  const appendStreamToken = useChatStore((s) => s.appendStreamToken);
  const finalizeStreamMessage = useChatStore((s) => s.finalizeStreamMessage);
  const handleStreamError = useChatStore((s) => s.handleStreamError);
  
  useEffect(() => {
    store.loadConversation(conversationId);
    
    return () => {
      store.clearChat();
    };
  }, [conversationId]);
  
  useEffect(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribeAll();
    }
    
    const manager = new EventSubscriptionManager();
    subscriptionRef.current = manager;
    
    const setupListeners = async () => {
      try {
        await manager.subscribe<ChatTokenEvent>('chat:token', (event) => {
          if (event.conversationId === conversationIdRef.current) {
            appendStreamToken(event.messageId, event.token);
          }
        });
        
        await manager.subscribe<ChatCompleteEvent>('chat:complete', (event) => {
          if (event.conversationId === conversationIdRef.current) {
            finalizeStreamMessage(event.message);
          }
        });
        
        await manager.subscribe<ChatErrorEvent>('chat:error', (event) => {
          if (event.conversationId === conversationIdRef.current) {
            handleStreamError(event.messageId, event.error);
            addToast({ type: 'error', message: event.error });
          }
        });
      } catch (error) {
        console.error('[useChat] Failed to set up event subscriptions:', error);
      }
    };
    
    setupListeners();
    
    const cleanupInterval = setInterval(() => {
      useChatStore.getState().clearStaleStreams();
    }, 10000);
    
    return () => {
      manager.unsubscribeAll();
      clearInterval(cleanupInterval);
    };
  }, [conversationId, appendStreamToken, finalizeStreamMessage, handleStreamError, addToast]);
  
  const sendMessage = useCallback(async (content: string) => {
    const result = await store.sendMessage(content);
    const currentError = useChatStore.getState().error;
    if (!result && currentError) {
      console.error('[useChat] sendMessage error:', currentError);
      addToast({ type: 'error', message: currentError });
    }
    return result;
  }, [store, addToast]);
  
  const regenerate = useCallback(async (messageId: string) => {
    await store.regenerateMessage(messageId);
    const currentError = useChatStore.getState().error;
    if (currentError) {
      addToast({ type: 'error', message: currentError });
    }
  }, [store, addToast]);
  
  const edit = useCallback(async (messageId: string, content: string) => {
    const result = await store.editMessage(messageId, content);
    const currentError = useChatStore.getState().error;
    if (!result && currentError) {
      addToast({ type: 'error', message: currentError });
    }
    return result;
  }, [store, addToast]);
  
  const switchBranch = useCallback(async (messageId: string) => {
    await store.switchBranch(messageId);
    const currentError = useChatStore.getState().error;
    if (currentError) {
      addToast({ type: 'error', message: currentError });
    }
  }, [store, addToast]);
  
  const streamingContent = useCallback((messageId: string): string => {
    const stream = store.streamingMessages[messageId];
    return stream?.content ?? '';
  }, [store.streamingMessages]);
  
  return {
    conversation: store.conversation,
    messages: store.messages,
    streamingMessages: store.streamingMessages,
    streamingContent,
    isLoading: store.isLoading,
    isGenerating: store.isGenerating,
    error: store.error,
    sendMessage,
    regenerate,
    edit,
    switchBranch,
    stopGeneration: store.stopGeneration,
    getBranchSiblings: store.getBranchSiblings,
  };
}