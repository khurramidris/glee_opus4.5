import { useEffect } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { events } from '@/lib/events';

export function useModelStatus() {
  const { modelStatus, fetchModelStatus, startSidecar, stopSidecar, isLoading } = useSettingsStore();
  
  useEffect(() => {
    fetchModelStatus();
    
    // Subscribe to model status events
    const unsubscribe = events.onModelStatus((event) => {
      fetchModelStatus();
    });
    
    return () => {
      unsubscribe.then((unsub) => unsub());
    };
  }, []);
  
  return {
    status: modelStatus?.status ?? 'not_found',
    isLoaded: modelStatus?.modelLoaded ?? false,
    modelPath: modelStatus?.modelPath,
    isLoading,
    startSidecar,
    stopSidecar,
    refresh: fetchModelStatus,
  };
}
