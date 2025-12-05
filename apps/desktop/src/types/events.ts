import type { Message } from './message';

export interface ChatTokenEvent {
  conversationId: string;
  messageId: string;
  token: string;
}

export interface ChatCompleteEvent {
  conversationId: string;
  message: Message;
}

export interface ChatErrorEvent {
  conversationId: string;
  messageId: string | null;
  error: string;
}

export interface DownloadProgressEvent {
  id: string;
  downloadedBytes: number;
  totalBytes: number;
  speedBps: number;
}

export interface DownloadCompleteEvent {
  id: string;
  path: string;
}

export interface DownloadErrorEvent {
  id: string;
  error: string;
}

export interface ModelStatusEvent {
  status: string;
  message: string | null;
}