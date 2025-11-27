import { cn } from '@/lib/utils';
import type { ReactNode, HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  children,
  hoverable = false,
  padding = 'md',
  className,
  ...props
}: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div
      className={cn(
        'bg-surface-800 border border-surface-700 rounded-xl',
        hoverable && 'hover:border-surface-600 hover:bg-surface-750 transition-colors cursor-pointer',
        paddings[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
