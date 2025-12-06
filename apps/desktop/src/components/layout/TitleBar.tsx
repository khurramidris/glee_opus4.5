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
    <div data-tauri-drag-region className="h-8 flex items-center justify-between px-4 bg-white border-b border-surface-200 select-none">
      <div className="text-xs font-medium text-surface-500 pointer-events-none">
        Glee
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleMinimize}
          className="p-1.5 hover:bg-surface-100 text-surface-500 hover:text-surface-900 rounded"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <button
          onClick={handleMaximize}
          className="p-1.5 hover:bg-surface-100 text-surface-500 hover:text-surface-900 rounded"
        >
          {isMaximized ? (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          )}
        </button>
        <button
          onClick={handleClose}
          className="p-1.5 hover:bg-red-500 text-surface-500 hover:text-white rounded"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}