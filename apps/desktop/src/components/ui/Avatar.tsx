import { useState } from 'react';
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

  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const getFallbackText = () => {
    if (fallback) return fallback.slice(0, 2).toUpperCase();
    if (alt) return alt.slice(0, 2).toUpperCase();
    return '??';
  };

  const showFallback = !src || error;

  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-full bg-surface-700 overflow-hidden flex-shrink-0',
        sizes[size],
        className
      )}
    >
      {showFallback ? (
        <span className="font-medium text-surface-300">{getFallbackText()}</span>
      ) : (
        <img
          src={src}
          alt={alt}
          onError={() => setError(true)}
          className="w-full h-full object-cover"
        />
      )}
    </div>
  );
}
