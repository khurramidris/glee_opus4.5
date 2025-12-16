import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className,
  dot = false,
}: BadgeProps) {
  const variants = {
    default: `
      bg-surface-200/60 
      text-surface-600 
      border-surface-300/50
    `,
    primary: `
      bg-primary-500/15 
      text-primary-300 
      border-primary-400/30
    `,
    success: `
      bg-emerald-500/15 
      text-emerald-300 
      border-emerald-400/30
    `,
    warning: `
      bg-amber-500/15 
      text-amber-300 
      border-amber-400/30
    `,
    danger: `
      bg-red-500/15 
      text-red-300 
      border-red-400/30
    `,
    info: `
      bg-blue-500/15 
      text-blue-300 
      border-blue-400/30
    `,
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  const dotColors = {
    default: 'bg-surface-500',
    primary: 'bg-primary-400',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-red-400',
    info: 'bg-blue-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium border',
        'transition-colors duration-150',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />
      )}
      {children}
    </span>
  );
}
