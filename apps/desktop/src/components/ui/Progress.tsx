import { cn } from '@/lib/utils';

export interface ProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'gradient';
  showLabel?: boolean;
  className?: string;
}

export function Progress({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  showLabel = false,
  className,
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizes = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  const variants = {
    default: 'bg-primary-500',
    gradient: 'bg-gradient-to-r from-primary-500 via-primary-400 to-primary-500',
  };

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'w-full bg-surface-200/50 rounded-full overflow-hidden',
          sizes[size]
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300 ease-out',
            variants[variant],
            variant === 'gradient' && 'shadow-sm shadow-primary-500/30'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1.5 text-xs text-surface-500">
          <span>{Math.round(percentage)}%</span>
          <span>{value} / {max}</span>
        </div>
      )}
    </div>
  );
}
