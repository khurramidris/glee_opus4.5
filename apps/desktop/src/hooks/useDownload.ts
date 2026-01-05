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

    events.onDownloadComplete((_event) => {
      console.log('[useDownload] Download completed event received');
      store.updateStatus('completed');
    }).then((unsub) => unsubscribers.push(unsub));

    events.onDownloadError((event) => {
      console.error('[useDownload] Download error event received:', event.error);
      store.setError(event.error);
    }).then((unsub) => unsubscribers.push(unsub));

    events.onDownloadVerifying((_event) => {
      console.log('[useDownload] Download verifying event received');
      store.setVerifying();
    }).then((unsub) => unsubscribers.push(unsub));

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, []);

  return store;
}
