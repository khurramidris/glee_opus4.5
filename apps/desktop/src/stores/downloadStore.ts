import { create } from 'zustand';
import type { Download, StartDownloadInput } from '@/types';
import { commands } from '@/lib/commands';

interface DownloadProgress {
  downloadedBytes: number;
  totalBytes: number;
  speedBps: number;
}

interface DownloadState {
  currentDownload: Download | null;
  progress: DownloadProgress | null;
  isDownloading: boolean;
  isVerifying: boolean;
  error: string | null;
  
  startDownload: (input: StartDownloadInput) => Promise<Download>;
  pauseDownload: () => Promise<void>;
  resumeDownload: () => Promise<void>;
  cancelDownload: () => Promise<void>;
  updateProgress: (downloadedBytes: number, totalBytes: number, speedBps: number) => void;
  setComplete: () => void;
  setVerifying: () => void;
  setError: (error: string) => void;
  reset: () => void;
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  currentDownload: null,
  progress: null,
  isDownloading: false,
  isVerifying: false,
  error: null,

  startDownload: async (input) => {
    set({ isDownloading: true, isVerifying: false, error: null });
    try {
      const download = await commands.startModelDownload(input);
      set({ 
        currentDownload: download,
        progress: {
          downloadedBytes: 0,
          totalBytes: download.totalBytes || 0,
          speedBps: 0,
        },
      });
      return download;
    } catch (e) {
      set({ isDownloading: false, error: String(e) });
      throw e;
    }
  },

  pauseDownload: async () => {
    const { currentDownload } = get();
    if (currentDownload) {
      try {
        await commands.pauseDownload(currentDownload.id);
        set({ isDownloading: false });
      } catch (e) {
        set({ error: String(e) });
      }
    }
  },

  resumeDownload: async () => {
    const { currentDownload } = get();
    if (currentDownload) {
      try {
        await commands.resumeDownload(currentDownload.id);
        set({ isDownloading: true, error: null });
      } catch (e) {
        set({ error: String(e) });
      }
    }
  },

  cancelDownload: async () => {
    const { currentDownload } = get();
    if (currentDownload) {
      try {
        await commands.cancelDownload(currentDownload.id);
        set({ currentDownload: null, isDownloading: false, progress: null });
      } catch (e) {
        set({ error: String(e) });
      }
    }
  },

  updateProgress: (downloadedBytes, totalBytes, speedBps) => {
    set({
      progress: { downloadedBytes, totalBytes, speedBps },
      isDownloading: true,
      isVerifying: false,
    });
  },

  setComplete: () => {
    set({
      isDownloading: false,
      isVerifying: false,
      currentDownload: null,
      progress: null,
    });
  },

  setVerifying: () => {
    set({ isVerifying: true, isDownloading: false });
  },

  setError: (error) => {
    set({ error, isDownloading: false, isVerifying: false });
  },

  reset: () => {
    set({
      currentDownload: null,
      progress: null,
      isDownloading: false,
      isVerifying: false,
      error: null,
    });
  },
}));