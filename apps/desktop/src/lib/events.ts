import { listen, type UnlistenFn, type Event } from '@tauri-apps/api/event';
import type {
  ChatTokenEvent,
  ChatCompleteEvent,
  ChatErrorEvent,
  DownloadProgressEvent,
  DownloadCompleteEvent,
  DownloadErrorEvent,
  ModelStatusEvent,
} from '@/types';

type EventCallback<T> = (payload: T) => void;

/**
 * Subscribe to a Tauri event with proper typing
 */
async function subscribeToEvent<T>(
  eventName: string,
  callback: EventCallback<T>
): Promise<UnlistenFn> {
  return listen<T>(eventName, (event: Event<T>) => {
    callback(event.payload);
  });
}

export const events = {
  // Chat events
  onChatToken: (handler: EventCallback<ChatTokenEvent>): Promise<UnlistenFn> =>
    subscribeToEvent('chat:token', handler),

  onChatComplete: (handler: EventCallback<ChatCompleteEvent>): Promise<UnlistenFn> =>
    subscribeToEvent('chat:complete', handler),

  onChatError: (handler: EventCallback<ChatErrorEvent>): Promise<UnlistenFn> =>
    subscribeToEvent('chat:error', handler),

  // Download events
  onDownloadProgress: (handler: EventCallback<DownloadProgressEvent>): Promise<UnlistenFn> =>
    subscribeToEvent('download:progress', handler),

  onDownloadComplete: (handler: EventCallback<DownloadCompleteEvent>): Promise<UnlistenFn> =>
    subscribeToEvent('download:complete', handler),

  onDownloadError: (handler: EventCallback<DownloadErrorEvent>): Promise<UnlistenFn> =>
    subscribeToEvent('download:error', handler),

  onDownloadVerifying: (handler: EventCallback<{ id: string }>): Promise<UnlistenFn> =>
    subscribeToEvent('download:verifying', handler),

  // Model events
  onModelStatus: (handler: EventCallback<ModelStatusEvent>): Promise<UnlistenFn> =>
    subscribeToEvent('model:status', handler),
};

/**
 * Helper to manage multiple event subscriptions
 */
export class EventSubscriptionManager {
  private unsubscribers: UnlistenFn[] = [];
  private mounted = true;

  async subscribe<T>(
    eventName: string,
    handler: EventCallback<T>
  ): Promise<void> {
    const unsubscribe = await subscribeToEvent(eventName, (payload: T) => {
      if (this.mounted) {
        handler(payload);
      }
    });
    
    if (this.mounted) {
      this.unsubscribers.push(unsubscribe);
    } else {
      // Already unmounted, clean up immediately
      unsubscribe();
    }
  }

  unsubscribeAll(): void {
    this.mounted = false;
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
  }
}