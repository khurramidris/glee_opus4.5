import { useEffect } from 'react';
import { useDownloadStore } from '@/stores/downloadStore';
import { events } from '@/lib/events';

export function useDownload() {
  const store = useDownloadStore();
  
  useEffect(() => {
    const unsubscribers: Array<() => void> = [];
    
    events.onDownloadProgress((event) => {
      store.updateProgress(event.downloadedBytes, event.totalBytes, event.speedBps);
    }).then((unsub) => unsubscribers.push(unsub));
    
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, []);
  
  return store;
}
