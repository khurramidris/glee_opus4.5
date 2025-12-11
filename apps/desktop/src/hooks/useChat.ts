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
  
  // Keep refs updated for use in callbacks
  conversationIdRef.current = conversationId;
  
  // Get store actions directly to avoid stale closures
  const appendStreamToken = useChatStore((s) => s.appendStreamToken);
  const finalizeStreamMessage = useChatStore((s) => s.finalizeStreamMessage);
  const handleStreamError = useChatStore((s) => s.handleStreamError);
  
  // Load conversation on mount or ID change
  useEffect(() => {
    console.log('[useChat] Loading conversation:', conversationId);
    store.loadConversation(conversationId);
    
    return () => {
      console.log('[useChat] Clearing chat');
      store.clearChat();
    };
  }, [conversationId]);
  
  // Subscribe to streaming events
  useEffect(() => {
    console.log('[useChat] Setting up event subscriptions for:', conversationId);
    
    // Clean up previous subscriptions
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribeAll();
    }
    
    const manager = new EventSubscriptionManager();
    subscriptionRef.current = manager;
    
    // Set up event listeners
    const setupListeners = async () => {
      try {
        await manager.subscribe<ChatTokenEvent>('chat:token', (event) => {
          console.log('[useChat] Received token event:', event.messageId, event.token.substring(0, 20));
          if (event.conversationId === conversationIdRef.current) {
            appendStreamToken(event.messageId, event.token);
          }
        });
        
        await manager.subscribe<ChatCompleteEvent>('chat:complete', (event) => {
          console.log('[useChat] Received complete event:', event.message?.id);
          if (event.conversationId === conversationIdRef.current) {
            finalizeStreamMessage(event.message);
          }
        });
        
        await manager.subscribe<ChatErrorEvent>('chat:error', (event) => {
          console.log('[useChat] Received error event:', event.error);
          if (event.conversationId === conversationIdRef.current) {
            handleStreamError(event.messageId, event.error);
            addToast({ type: 'error', message: event.error });
          }
        });
        
        console.log('[useChat] Event subscriptions set up successfully');
      } catch (error) {
        console.error('[useChat] Failed to set up event subscriptions:', error);
      }
    };
    
    setupListeners();
    
    // Set up stale stream cleanup interval
    const cleanupInterval = setInterval(() => {
      useChatStore.getState().clearStaleStreams();
    }, 10000);
    
    return () => {
      console.log('[useChat] Cleaning up event subscriptions');
      manager.unsubscribeAll();
      clearInterval(cleanupInterval);
    };
  }, [conversationId, appendStreamToken, finalizeStreamMessage, handleStreamError, addToast]);
  
  const sendMessage = useCallback(async (content: string) => {
    console.log('[useChat] sendMessage called:', content);
    const result = await store.sendMessage(content);
    console.log('[useChat] sendMessage result:', result?.id);
    // Get fresh error state after the async operation
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