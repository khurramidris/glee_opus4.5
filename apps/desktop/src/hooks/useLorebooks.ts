import { useEffect } from 'react';
import { useLorebookStore } from '@/stores/lorebookStore';

export function useLorebooks() {
  const store = useLorebookStore();
  
  useEffect(() => {
    if (store.lorebooks.length === 0 && !store.isLoading) {
      store.fetchLorebooks();
    }
  }, []);
  
  return store;
}

export function useLorebook(id: string) {
  const { lorebooks, fetchLorebooks, isLoading } = useLorebookStore();
  
  useEffect(() => {
    if (lorebooks.length === 0 && !isLoading) {
      fetchLorebooks();
    }
  }, [id]);
  
  return {
    lorebook: lorebooks.find((l) => l.id === id),
    isLoading,
  };
}
