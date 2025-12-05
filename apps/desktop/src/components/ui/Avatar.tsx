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
        // Filename only - assume it's in the app's avatar directory
        // We need to resolve this relative to the app data dir.
        // For simplicity in V1, we assume avatars are stored in $APP_DATA/avatars/
        // But convertFileSrc with 'asset' doesn't automatically look there.
        // The backend `get_character` should theoretically return full path or we construct it.
        // If we only store filename, we need the base path.
        // For now, let's try to load via custom protocol if possible, 
        // OR rely on the Store/Hook to provide the full path.
        // 
        // BETTER APPROACH: The backend 'import' returns just filename.
        // The UI needs to know the AppData dir. 
        // Let's assume the passed `src` is the full path for now (fixed in AvatarUploader/Store)
        // OR: use a placeholder if it's just a filename and we can't resolve it yet.
        
        // HACK: For V1, assume specific protocol URL structure or context provider
        // Let's try to assume it's a relative path from the app assets
        // But real user images are in AppData.
        
        // Fix: Use the `asset:` protocol with the assumed path structure if we can get it.
        // Ideally, `src` passed here should be a Full Path or a URL.
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
          src={imageSrc || ''}
          alt={alt}
          onError={() => setError(true)}
          className="w-full h-full object-cover"
        />
      )}
    </div>
  );
}