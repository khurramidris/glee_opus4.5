import { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { cn } from '@/lib/utils';

export function TitleBar() {
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        const win = getCurrentWindow();

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

    const minimize = async () => {
        await getCurrentWindow().minimize();
    };

    const toggleMaximize = async () => {
        const win = getCurrentWindow();
        const maximized = await win.isMaximized();
        if (maximized) {
            await win.unmaximize();
        } else {
            await win.maximize();
        }
        setIsMaximized(!maximized);
    };

    const close = async () => {
        await getCurrentWindow().close();
    };

    const WindowButton = ({
        onClick,
        title,
        variant = 'default',
        children
    }: {
        onClick: () => void;
        title: string;
        variant?: 'default' | 'close';
        children: React.ReactNode;
    }) => (
        <button
            onClick={onClick}
            className={cn(
                "inline-flex justify-center items-center w-11 h-full",
                "transition-colors duration-150",
                "focus:outline-none",
                variant === 'close'
                    ? "text-white/50 hover:bg-danger hover:text-white"
                    : "text-white/50 hover:bg-white/10 hover:text-white"
            )}
            title={title}
        >
            {children}
        </button>
    );

    return (
        <div className="h-9 bg-transparent flex justify-between items-center select-none z-50 flex-shrink-0">
            {/* Drag region */}
            <div className="flex-1 h-full" data-tauri-drag-region />

            {/* Window controls */}
            <div className="flex h-full flex-shrink-0">
                <WindowButton onClick={minimize} title="Minimize">
                    <svg width="10" height="1" viewBox="0 0 10 1" fill="none">
                        <path d="M0 0.5H10" stroke="currentColor" strokeWidth="1" />
                    </svg>
                </WindowButton>

                <WindowButton onClick={toggleMaximize} title={isMaximized ? "Restore Down" : "Maximize"}>
                    {isMaximized ? (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 0H10V8H8V10H0V2H2V0Z" stroke="currentColor" strokeWidth="1" fill="none" />
                            <path d="M2 2H8V8H2V2Z" stroke="currentColor" strokeWidth="1" fill="none" />
                        </svg>
                    ) : (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" strokeWidth="1" />
                        </svg>
                    )}
                </WindowButton>

                <WindowButton onClick={close} title="Close" variant="close">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                </WindowButton>
            </div>
        </div>
    );
}
