import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SplashScreenProps {
    onComplete?: () => void;
    status?: string;
    progress?: number;  // 0-100
}

export function SplashScreen({ onComplete, status = 'Loading...', progress }: SplashScreenProps) {
    const [displayProgress, setDisplayProgress] = useState(0);
    const [fadeOut, setFadeOut] = useState(false);

    // Smooth progress animation
    useEffect(() => {
        if (progress !== undefined) {
            const timer = setTimeout(() => {
                setDisplayProgress(progress);
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [progress]);

    // Auto-complete animation
    useEffect(() => {
        if (progress === 100) {
            const timer = setTimeout(() => {
                setFadeOut(true);
                if (onComplete) {
                    setTimeout(onComplete, 400);
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [progress, onComplete]);

    return (
        <div
            className={cn(
                "fixed inset-0 z-[9999] flex flex-col items-center justify-center",
                "bg-[radial-gradient(ellipse_at_0%_0%,_#581c87_0%,_#3b0764_20%,_#1e1b4b_50%,_#0f172a_100%)]",
                "text-white transition-opacity duration-400",
                fadeOut ? 'opacity-0' : 'opacity-100'
            )}
        >
            {/* Animated background glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className={cn(
                        "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
                        "w-[600px] h-[600px] rounded-full",
                        "bg-gradient-to-r from-primary-600/20 via-primary-500/10 to-primary-600/20",
                        "blur-3xl animate-pulse"
                    )}
                />
                <div
                    className={cn(
                        "absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2",
                        "w-[400px] h-[400px] rounded-full",
                        "bg-gradient-to-r from-secondary-500/10 to-transparent",
                        "blur-3xl animate-pulse"
                    )}
                    style={{ animationDelay: '1s' }}
                />
            </div>

            {/* Logo and title */}
            <div className="relative flex flex-col items-center mb-12">
                {/* Logo mark */}
                <div className="relative mb-4">
                    <div className="absolute -inset-4 bg-gradient-to-r from-primary-500/30 to-primary-600/30 rounded-2xl blur-xl" />
                    <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-2xl shadow-primary-500/30">
                        <span className="text-3xl font-bold text-white font-display">G</span>
                    </div>
                </div>

                {/* Glee logo text with gradient */}
                <h1
                    className={cn(
                        "text-5xl font-bold tracking-tight font-display",
                        "bg-gradient-to-r from-primary-300 via-primary-200 to-primary-300",
                        "bg-clip-text text-transparent"
                    )}
                >
                    Glee
                </h1>
                <p className="text-white/40 text-sm mt-2 tracking-widest uppercase font-medium">
                    AI Character Chat
                </p>
            </div>

            {/* Progress bar container */}
            <div className="relative w-72 mb-6">
                {/* Background track */}
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                    {/* Progress fill */}
                    <div
                        className={cn(
                            "h-full rounded-full transition-all duration-300 ease-out",
                            "bg-gradient-to-r from-primary-500 via-primary-400 to-primary-500",
                            "shadow-lg shadow-primary-500/40"
                        )}
                        style={{
                            width: progress !== undefined ? `${displayProgress}%` : '100%',
                            animation: progress === undefined ? 'pulse 1.5s ease-in-out infinite' : undefined
                        }}
                    />
                </div>

                {/* Shimmer effect for indeterminate state */}
                {progress === undefined && (
                    <div className="absolute inset-0 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                    </div>
                )}
            </div>

            {/* Status text */}
            <p className="text-white/50 text-sm font-medium">
                {status}
            </p>

            {/* Version info */}
            <p className="absolute bottom-6 text-white/20 text-xs font-medium">
                v0.1.0
            </p>

            {/* Keyframe styles */}
            <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
      `}</style>
        </div>
    );
}
