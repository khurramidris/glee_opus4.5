import { useEffect } from 'react';
import { usePersonaStore } from '@/stores/personaStore';

export function usePersonas() {
  const store = usePersonaStore();
  
  useEffect(() => {
    if (store.personas.length === 0 && !store.isLoading) {
      store.fetchPersonas();
    }
  }, []);
  
  return store;
}
