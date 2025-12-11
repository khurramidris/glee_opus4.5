import { useEffect, useRef, useCallback } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { EventSubscriptionManager } from '@/lib/events';
import type { ModelStatusEvent } from '@/types';

export function useModelStatus() {
  const { 
    modelStatus, 
    fetchModelStatus, 
    startSidecar: storeStartSidecar, 
    stopSidecar, 
    isLoading 
  } = useSettingsStore();
  
  const subscriptionRef = useRef<EventSubscriptionManager | null>(null);
  
  useEffect(() => {
    // Initial fetch
    fetchModelStatus();
    
    // Clean up previous subscriptions
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribeAll();
    }
    
    const manager = new EventSubscriptionManager();
    subscriptionRef.current = manager;
    
    const setupListeners = async () => {
      await manager.subscribe<ModelStatusEvent>('model:status', () => {
        fetchModelStatus();
      });
    };
    
    setupListeners().catch(console.error);
    
    // Poll model status periodically
    const pollInterval = setInterval(() => {
      fetchModelStatus();
    }, 5000);
    
    return () => {
      manager.unsubscribeAll();
      clearInterval(pollInterval);
    };
  }, [fetchModelStatus]);
  
  // Wrap startSidecar to refresh status after starting
  const startSidecar = useCallback(async () => {
    await storeStartSidecar();
    // Refresh status after successful start
    await fetchModelStatus();
  }, [storeStartSidecar, fetchModelStatus]);
  
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