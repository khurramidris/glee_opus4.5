import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './Spinner';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center gap-2 
      font-semibold transition-all duration-150 ease-out
      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent
      disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
      active:scale-[0.98]
    `;

    const variants = {
      primary: `
        bg-gradient-to-b from-primary-500 to-primary-600 
        text-white 
        hover:from-primary-400 hover:to-primary-500
        active:from-primary-600 active:to-primary-700
        shadow-md shadow-primary-500/25 
        hover:shadow-lg hover:shadow-primary-500/30
        focus-visible:ring-primary-500/50
        border border-primary-500/20
      `,
      secondary: `
        bg-white/10 
        text-white 
        border border-white/20
        hover:bg-white/15 hover:border-white/30
        active:bg-white/20
        shadow-sm
        focus-visible:ring-white/30
      `,
      ghost: `
        bg-transparent 
        text-surface-600 
        hover:bg-surface-100/80 hover:text-surface-800
        active:bg-surface-200/80
        focus-visible:ring-surface-400/30
      `,
      danger: `
        bg-gradient-to-b from-danger to-red-600 
        text-white 
        hover:from-red-500 hover:to-red-600
        active:from-red-600 active:to-red-700
        shadow-md shadow-red-500/25
        hover:shadow-lg hover:shadow-red-500/30
        focus-visible:ring-red-500/50
        border border-red-500/20
      `,
      success: `
        bg-gradient-to-b from-success to-emerald-600 
        text-white 
        hover:from-emerald-500 hover:to-emerald-600
        active:from-emerald-600 active:to-emerald-700
        shadow-md shadow-emerald-500/25
        hover:shadow-lg hover:shadow-emerald-500/30
        focus-visible:ring-emerald-500/50
        border border-emerald-500/20
      `,
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs rounded-lg',
      md: 'px-4 py-2 text-sm rounded-lg',
      lg: 'px-6 py-2.5 text-base rounded-xl',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && <Spinner size="sm" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';