import { useEffect, useRef } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { EventSubscriptionManager } from '@/lib/events';
import type { ModelStatusEvent } from '@/types';

export function useModelStatus() {
  const { 
    modelStatus, 
    fetchModelStatus, 
    startSidecar, 
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
    
    return () => {
      manager.unsubscribeAll();
    };
  }, [fetchModelStatus]);
  
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