import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type {
  ChatTokenEvent,
  ChatCompleteEvent,
  ChatErrorEvent,
  DownloadProgressEvent,
  ModelStatusEvent,
} from '@/types';

export const events = {
  onChatToken: (handler: (event: ChatTokenEvent) => void): Promise<UnlistenFn> =>
    listen('chat:token', (e) => handler(e.payload as ChatTokenEvent)),

  onChatComplete: (handler: (event: ChatCompleteEvent) => void): Promise<UnlistenFn> =>
    listen('chat:complete', (e) => handler(e.payload as ChatCompleteEvent)),

  onChatError: (handler: (event: ChatErrorEvent) => void): Promise<UnlistenFn> =>
    listen('chat:error', (e) => handler(e.payload as ChatErrorEvent)),

  onDownloadProgress: (handler: (event: DownloadProgressEvent) => void): Promise<UnlistenFn> =>
    listen('download:progress', (e) => handler(e.payload as DownloadProgressEvent)),

  onModelStatus: (handler: (event: ModelStatusEvent) => void): Promise<UnlistenFn> =>
    listen('model:status', (e) => handler(e.payload as ModelStatusEvent)),
};
