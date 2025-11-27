import { useEffect } from 'react';
import { useConversationStore } from '@/stores/conversationStore';

export function useConversations() {
  const store = useConversationStore();
  
  useEffect(() => {
    if (store.conversations.length === 0 && !store.isLoading) {
      store.fetchConversations();
    }
  }, []);
  
  return store;
}

export function useConversation(id: string) {
  const { conversations, fetchConversations, isLoading } = useConversationStore();
  
  useEffect(() => {
    if (conversations.length === 0 && !isLoading) {
      fetchConversations();
    }
  }, [id]);
  
  return {
    conversation: conversations.find((c) => c.id === id),
    isLoading,
  };
}
