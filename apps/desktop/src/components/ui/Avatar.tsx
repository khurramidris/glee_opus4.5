import { useState, useEffect } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { cn } from '@/lib/utils';

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Avatar({
  src,
  alt = '',
  fallback,
  size = 'md',
  className,
}: AvatarProps) {
  const [error, setError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  useEffect(() => {
    if (!src) {
      setImageSrc(null);
      return;
    }

    // Handle different src types
    if (src.startsWith('data:') || src.startsWith('http')) {
      // Data URI or remote URL (for dev/base64)
      setImageSrc(src);
    } else {
      // Local path - assumed to be in app data dir if just a filename
      // or full path if starts with slash/drive letter
      if (src.includes('/') || src.includes('\\')) {
        setImageSrc(convertFileSrc(src));
      } else {
        setImageSrc(convertFileSrc(src));
      }
    }
    setError(false);
  }, [src]);

  const getFallbackText = () => {
    if (fallback) return fallback.slice(0, 2).toUpperCase();
    if (alt) return alt.slice(0, 2).toUpperCase();
    return '??';
  };

  const showFallback = !imageSrc || error;

  // Generate a color based on the fallback text
  const getGradient = () => {
    const text = fallback || alt || '';
    const colors = [
      'from-amber-400 to-orange-500',
      'from-teal-400 to-cyan-500',
      'from-violet-400 to-purple-500',
      'from-rose-400 to-pink-500',
      'from-emerald-400 to-green-500',
      'from-blue-400 to-indigo-500',
    ];
    const index = text.charCodeAt(0) % colors.length || 0;
    return colors[index];
  };

  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-full overflow-hidden flex-shrink-0',
        showFallback ? `bg-gradient-to-br ${getGradient()}` : 'bg-surface-200',
        sizes[size],
        className
      )}
    >
      {showFallback ? (
        <span className="font-medium text-white">{getFallbackText()}</span>
      ) : (
        <img
          src={imageSrc || ''}
          alt={alt}
          onError={() => setError(true)}
          className="w-full h-full object-cover"
        />
      )}
    </div>
  );
}