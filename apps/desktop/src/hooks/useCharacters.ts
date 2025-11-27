import { useEffect } from 'react';
import { useCharacterStore } from '@/stores/characterStore';

export function useCharacters() {
  const store = useCharacterStore();
  
  useEffect(() => {
    if (store.characters.length === 0 && !store.isLoading) {
      store.fetchCharacters();
    }
  }, []);
  
  return store;
}

export function useCharacter(id: string) {
  const { characters, fetchCharacters, isLoading } = useCharacterStore();
  
  useEffect(() => {
    if (characters.length === 0 && !isLoading) {
      fetchCharacters();
    }
  }, [id]);
  
  return {
    character: characters.find((c) => c.id === id),
    isLoading,
  };
}
