import { create } from 'zustand';
import { TOAST_DURATIONS } from '@/lib/constants';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

interface UIState {
  // Panels
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setLeftPanelCollapsed: (collapsed: boolean) => void;
  setRightPanelCollapsed: (collapsed: boolean) => void;

  // Modals
  activeModal: string | null;
  modalData: unknown;
  openModal: (id: string, data?: unknown) => void;
  closeModal: () => void;

  // Toasts
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;

  // Loading states
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  // Panels
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  toggleLeftPanel: () => set((state: any) => ({ leftPanelCollapsed: !state.leftPanelCollapsed })),
  toggleRightPanel: () => set((state: any) => ({ rightPanelCollapsed: !state.rightPanelCollapsed })),
  setLeftPanelCollapsed: (collapsed) => set({ leftPanelCollapsed: collapsed }),
  setRightPanelCollapsed: (collapsed) => set({ rightPanelCollapsed: collapsed }),

  // Modals
  activeModal: null,
  modalData: null,
  openModal: (id, data) => set({ activeModal: id, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),

  // Toasts
  toasts: [],
  addToast: (toast) => {
    const id = crypto.randomUUID();

    // Use type-specific duration or fallback
    const duration = toast.duration ?? TOAST_DURATIONS[toast.type] ?? 5000;

    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));

    // Auto remove after duration
    setTimeout(() => {
      get().removeToast(id);
    }, duration);
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  // Loading
  globalLoading: false,
  setGlobalLoading: (loading) => set({ globalLoading: loading }),
}));