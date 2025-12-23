import { useMemo } from 'react';
import { useAvatarUrl } from '@/hooks/useAvatarUrl';
import { cn } from '@/lib/utils';

export interface AvatarProps {
  src?: string | null;
  fallback: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showRing?: boolean;
}

// Harmonious avatar color palette
const AVATAR_COLORS = [
  { bg: 'bg-purple-500', text: 'text-purple-50' },
  { bg: 'bg-violet-500', text: 'text-violet-50' },
  { bg: 'bg-indigo-500', text: 'text-indigo-50' },
  { bg: 'bg-cyan-500', text: 'text-cyan-50' },
  { bg: 'bg-teal-500', text: 'text-teal-50' },
  { bg: 'bg-emerald-500', text: 'text-emerald-50' },
  { bg: 'bg-amber-500', text: 'text-amber-50' },
  { bg: 'bg-rose-500', text: 'text-rose-50' },
  { bg: 'bg-pink-500', text: 'text-pink-50' },
  { bg: 'bg-blue-500', text: 'text-blue-50' },
];

function getColorFromName(name: string) {
  // Simple hash function for deterministic color selection
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function Avatar({
  src,
  fallback,
  size = 'md',
  className,
  showRing = false,
}: AvatarProps) {
  const resolvedUrl = useAvatarUrl(src);
  const displaySrc = resolvedUrl;

  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-14 h-14 text-lg',
    '2xl': 'w-20 h-20 text-2xl',
  };

  const ringStyles = showRing ? 'ring-2 ring-white/30 ring-offset-2 ring-offset-transparent' : '';

  const colorScheme = useMemo(() => getColorFromName(fallback), [fallback]);
  const initials = useMemo(() => getInitials(fallback), [fallback]);

  if (displaySrc) {
    return (
      <div
        className={cn(
          'relative flex-shrink-0 rounded-full overflow-hidden',
          'bg-surface-200',
          sizes[size],
          ringStyles,
          className
        )}
      >
        <img
          src={displaySrc}
          alt={fallback}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Hide broken image and show fallback
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        {/* Fallback shown behind image in case of load failure */}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center font-semibold',
            colorScheme.bg,
            colorScheme.text
          )}
          style={{ zIndex: -1 }}
        >
          {initials}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex-shrink-0 rounded-full flex items-center justify-center font-semibold',
        'shadow-sm',
        colorScheme.bg,
        colorScheme.text,
        sizes[size],
        ringStyles,
        className
      )}
    >
      {initials}
    </div>
  );
}