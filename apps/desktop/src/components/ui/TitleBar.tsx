import { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

export function TitleBar() {
    const [appWindow, setAppWindow] = useState<ReturnType<typeof getCurrentWindow> | null>(null);
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        const win = getCurrentWindow();
        setAppWindow(win);

        const checkMaximized = async () => {
            try {
                const max = await win.isMaximized();
                setIsMaximized(max);
            } catch {
                // Ignore errors when checking maximized state
            }
        };

        checkMaximized();

        const unlisten = win.onResized(() => {
            checkMaximized();
        });

        return () => {
            unlisten.then(f => f());
        };
    }, []);

    const minimize = () => appWindow?.minimize();

    const toggleMaximize = async () => {
        if (!appWindow) return;
        const maximized = await appWindow.isMaximized();
        if (maximized) {
            await appWindow.unmaximize();
        } else {
            await appWindow.maximize();
        }
        setIsMaximized(!maximized);
    };

    const close = () => appWindow?.close();

    return (
        <div className="h-8 bg-app-muted flex justify-end items-center select-none z-50 flex-shrink-0">
            <div className="flex-1 h-full" data-tauri-drag-region />

            <div className="flex h-full flex-shrink-0">
                <button
                    onClick={minimize}
                    className="inline-flex justify-center items-center w-10 h-full text-surface-800/70 hover:bg-surface-800/10 hover:text-surface-800 transition-colors focus:outline-none"
                    title="Minimize"
                >
                    <svg width="10" height="1" viewBox="0 0 10 1" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 0.5H10" stroke="currentColor" strokeWidth="1" />
                    </svg>
                </button>

                <button
                    onClick={toggleMaximize}
                    className="inline-flex justify-center items-center w-10 h-full text-surface-800/70 hover:bg-surface-800/10 hover:text-surface-800 transition-colors focus:outline-none"
                    title={isMaximized ? "Restore Down" : "Maximize"}
                >
                    {isMaximized ? (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2.5 2.5H9.5V9.5H2.5V2.5Z" stroke="currentColor" strokeWidth="1" />
                            <path d="M0.5 0.5H7.5V7.5H0.5V0.5Z" stroke="currentColor" strokeWidth="1" fill="none" />
                        </svg>
                    ) : (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" strokeWidth="1" />
                        </svg>
                    )}
                </button>

                <button
                    onClick={close}
                    className="inline-flex justify-center items-center w-10 h-full text-surface-800/70 hover:bg-red-500 hover:text-white transition-colors focus:outline-none"
                    title="Close"
                >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
