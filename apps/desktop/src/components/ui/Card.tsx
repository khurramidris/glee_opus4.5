import { cn } from '@/lib/utils';
import type { ReactNode, HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'glass' | 'solid';
}

export function Card({
  children,
  hoverable = false,
  padding = 'md',
  variant = 'default',
  className,
  ...props
}: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const variants = {
    default: `
      bg-surface-50 
      border border-surface-200 
      shadow-card
    `,
    glass: `
      bg-white/5 
      backdrop-blur-xl 
      border border-white/10 
      shadow-panel
    `,
    solid: `
      bg-surface-100 
      border border-surface-200 
      shadow-sm
    `,
  };

  const hoverStyles = hoverable
    ? `
        hover:border-surface-300 
        hover:shadow-card-hover 
        hover:-translate-y-0.5 
        cursor-pointer
        transition-all duration-200 ease-out
      `
    : '';

  return (
    <div
      className={cn(
        'rounded-xl',
        variants[variant],
        hoverStyles,
        paddings[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
