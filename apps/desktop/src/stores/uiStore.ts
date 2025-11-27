import { create } from 'zustand';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  
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
  // Sidebar
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  
  // Modals
  activeModal: null,
  modalData: null,
  openModal: (id, data) => set({ activeModal: id, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),
  
  // Toasts
  toasts: [],
  addToast: (toast) => {
    const id = crypto.randomUUID();
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    
    // Auto remove after duration
    const duration = toast.duration ?? 5000;
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
