import { useState, useEffect } from 'react';

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
                    setTimeout(onComplete, 500);
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [progress, onComplete]);

    return (
        <div
            className={`
        fixed inset-0 z-[9999] flex flex-col items-center justify-center
        /* Vibrant Neon Background matching main app */
        bg-[radial-gradient(circle_at_0%_0%,_#4c1d95_0%,_#312e81_30%,_#1e1b4b_70%,_#0f172a_100%)]
        text-white
        transition-opacity duration-500
        ${fadeOut ? 'opacity-0' : 'opacity-100'}
      `}
        >
            {/* Animated background glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
            w-[600px] h-[600px] rounded-full 
            bg-gradient-to-r from-primary-500/10 via-primary-400/5 to-primary-600/10 
            blur-3xl animate-pulse"
                />
            </div>

            {/* Logo and title */}
            <div className="relative flex flex-col items-center mb-12">
                {/* Glee logo text with gradient */}
                <h1
                    className="text-7xl font-bold tracking-tight 
            bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600 
            bg-clip-text text-transparent
            drop-shadow-lg"
                >
                    Glee
                </h1>
                <p className="text-white/60 text-lg mt-2 tracking-widest uppercase">
                    AI Character Chat
                </p>
            </div>

            {/* Progress bar container */}
            <div className="relative w-80 mb-6">
                {/* Background track */}
                <div className="h-2 bg-surface-200 rounded-full overflow-hidden shadow-inner">
                    {/* Progress fill */}
                    <div
                        className="h-full bg-gradient-to-r from-primary-500 via-primary-400 to-primary-500 
              rounded-full transition-all duration-300 ease-out
              shadow-lg shadow-primary-500/30"
                        style={{
                            width: progress !== undefined ? `${displayProgress}%` : '100%',
                            animation: progress === undefined ? 'pulse 1.5s ease-in-out infinite' : undefined
                        }}
                    />
                </div>

                {/* Shimmer effect for indeterminate state */}
                {progress === undefined && (
                    <div
                        className="absolute inset-0 h-2 rounded-full overflow-hidden"
                    >
                        <div
                            className="h-full w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent
                animate-shimmer"
                        />
                    </div>
                )}
            </div>

            {/* Status text */}
            <p className="text-white/60 text-sm animate-pulse">
                {status}
            </p>

            {/* Version info */}
            <p className="absolute bottom-8 text-surface-400 text-xs">
                v0.1.0
            </p>

            {/* Keyframe styles */}
            <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
      `}</style>
        </div>
    );
}
