import { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { UnlistenFn } from '@tauri-apps/api/event';

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    let unlistenFn: UnlistenFn | null = null;
    let mounted = true;

    const setup = async () => {
      // Initial state
      const maximized = await appWindow.isMaximized();
      if (mounted) setIsMaximized(maximized);

      // Listen for resize
      unlistenFn = await appWindow.onResized(async () => {
        const maximized = await appWindow.isMaximized();
        if (mounted) setIsMaximized(maximized);
      });
    };

    setup();

    return () => {
      mounted = false;
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, []);

  const handleMinimize = () => getCurrentWindow().minimize();
  const handleMaximize = () => getCurrentWindow().toggleMaximize();
  const handleClose = () => getCurrentWindow().close();

  return (
    <div data-tauri-drag-region className="h-10 flex items-center justify-between px-4 bg-transparent border-b border-white/5 select-none relative z-50">
      <div className="flex items-center gap-2 pointer-events-none">
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20 overflow-hidden p-0.5">
          <img src="/logo-small.png" alt="" className="w-full h-full object-contain" onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.parentElement!.innerHTML = '<span class="text-[10px] font-bold text-white">G</span>';
          }} />
        </div>
        <span className="text-[11px] font-bold tracking-wider text-white/50 uppercase">
          Glee
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleMinimize}
          className="p-1.5 hover:bg-white/5 text-white/40 hover:text-white rounded-md transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
          </svg>
        </button>
        <button
          onClick={handleMaximize}
          className="p-1.5 hover:bg-white/5 text-white/40 hover:text-white rounded-md transition-colors"
        >
          {isMaximized ? (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          )}
        </button>
        <button
          onClick={handleClose}
          className="p-1.5 hover:bg-red-500/80 text-white/40 hover:text-white rounded-md transition-colors group"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}