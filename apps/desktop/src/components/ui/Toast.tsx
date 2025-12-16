import { useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';

interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

export function Toast({ id, type, message }: ToastProps) {
  const removeToast = useUIStore((s) => s.removeToast);

  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(id);
    }, 4000);

    return () => clearTimeout(timer);
  }, [id, removeToast]);

  const icons = {
    success: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  };

  const styles = {
    success: 'bg-emerald-500/90 border-emerald-400/50 text-white',
    error: 'bg-danger/90 border-red-400/50 text-white',
    info: 'bg-blue-500/90 border-blue-400/50 text-white',
    warning: 'bg-amber-500/90 border-amber-400/50 text-white',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl',
        'border backdrop-blur-md shadow-lg',
        'animate-slide-up',
        styles[type]
      )}
    >
      <div className="flex-shrink-0">
        {icons[type]}
      </div>
      <p className="text-sm font-medium flex-1">{message}</p>
      <button
        onClick={() => removeToast(id)}
        className="flex-shrink-0 p-1 rounded-lg hover:bg-white/20 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}