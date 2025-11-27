import { create } from 'zustand';
import type { Download, StartDownloadInput } from '@/types';
import { commands } from '@/lib/commands';

interface DownloadState {
  currentDownload: Download | null;
  progress: {
    downloadedBytes: number;
    totalBytes: number;
    speedBps: number;
  } | null;
  isDownloading: boolean;
  error: string | null;
  
  startDownload: (input: StartDownloadInput) => Promise<Download>;
  pauseDownload: () => Promise<void>;
  resumeDownload: () => Promise<void>;
  cancelDownload: () => Promise<void>;
  updateProgress: (downloadedBytes: number, totalBytes: number, speedBps: number) => void;
  setComplete: () => void;
  setError: (error: string) => void;
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  currentDownload: null,
  progress: null,
  isDownloading: false,
  error: null,

  startDownload: async (input) => {
    set({ isDownloading: true, error: null });
    const download = await commands.startModelDownload(input);
    set({ 
      currentDownload: download,
      progress: {
        downloadedBytes: 0,
        totalBytes: download.totalBytes,
        speedBps: 0,
      },
    });
    return download;
  },

  pauseDownload: async () => {
    const { currentDownload } = get();
    if (currentDownload) {
      await commands.pauseDownload(currentDownload.id);
      set({ isDownloading: false });
    }
  },

  resumeDownload: async () => {
    const { currentDownload } = get();
    if (currentDownload) {
      await commands.resumeDownload(currentDownload.id);
      set({ isDownloading: true });
    }
  },

  cancelDownload: async () => {
    const { currentDownload } = get();
    if (currentDownload) {
      await commands.cancelDownload(currentDownload.id);
      set({ currentDownload: null, isDownloading: false, progress: null });
    }
  },

  updateProgress: (downloadedBytes, totalBytes, speedBps) => {
    set({
      progress: { downloadedBytes, totalBytes, speedBps },
    });
  },

  setComplete: () => {
    set({
      isDownloading: false,
      currentDownload: null,
      progress: null,
    });
  },

  setError: (error) => {
    set({ error, isDownloading: false });
  },
}));
