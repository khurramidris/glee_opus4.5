import { useEffect, useCallback } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { events } from '@/lib/events';
import type { ChatTokenEvent, ChatCompleteEvent, ChatErrorEvent } from '@/types';
import { useUIStore } from '@/stores/uiStore';

export function useChat(conversationId: string) {
  const store = useChatStore();
  const addToast = useUIStore((s) => s.addToast);
  
  useEffect(() => {
    store.loadConversation(conversationId);
    
    return () => {
      store.clearChat();
    };
  }, [conversationId]);
  
  // Subscribe to streaming events
  useEffect(() => {
    const unsubscribers: Array<() => void> = [];
    
    events.onChatToken((event: ChatTokenEvent) => {
      if (event.conversationId === conversationId) {
        store.appendStreamToken(event.messageId, event.token);
      }
    }).then((unsub) => unsubscribers.push(unsub));
    
    events.onChatComplete((event: ChatCompleteEvent) => {
      if (event.conversationId === conversationId) {
        store.finalizeStreamMessage(event.message);
      }
    }).then((unsub) => unsubscribers.push(unsub));
    
    events.onChatError((event: ChatErrorEvent) => {
      if (event.conversationId === conversationId) {
        store.setGenerating(false);
        addToast({ type: 'error', message: event.error });
      }
    }).then((unsub) => unsubscribers.push(unsub));
    
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [conversationId]);
  
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    await store.sendMessage(content);
  }, [store]);
  
  const regenerate = useCallback(async (messageId: string) => {
    await store.regenerateMessage(messageId);
  }, [store]);
  
  const edit = useCallback(async (messageId: string, content: string) => {
    await store.editMessage(messageId, content);
  }, [store]);
  
  const switchBranch = useCallback(async (messageId: string) => {
    await store.switchBranch(messageId);
  }, [store]);
  
  return {
    conversation: store.conversation,
    messages: store.messages,
    streamingMessages: store.streamingMessages,
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
