import { useEffect } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';

export function useSettings() {
  const store = useSettingsStore();
  
  useEffect(() => {
    if (!store.settings && !store.isLoading) {
      store.fetchSettings();
    }
  }, []);
  
  return store;
}
