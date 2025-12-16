import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  error?: string;
  label?: string;
  placeholder?: string;
  hint?: string;
  variant?: 'default' | 'glass';
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, error, label, id, placeholder, hint, variant = 'default', ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    const variants = {
      default: `
        bg-surface-100 
        border-surface-200 
        text-surface-800
        focus:border-primary-500 
        focus:ring-primary-500/20
        hover:border-surface-300
      `,
      glass: `
        bg-white/10 
        border-white/15 
        text-white
        focus:border-primary-400 
        focus:ring-primary-500/30
        hover:border-white/25
      `,
    };

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-surface-700 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={cn(
              'w-full px-3.5 py-2.5 pr-10 border rounded-lg appearance-none',
              'text-sm leading-tight',
              'transition-all duration-150 ease-out',
              'focus:outline-none focus:ring-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              variants[variant],
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {/* Custom dropdown arrow */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg
              className={cn(
                'w-4 h-4',
                variant === 'glass' ? 'text-white/50' : 'text-surface-400'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {hint && !error && (
          <p className="mt-1.5 text-xs text-surface-500">{hint}</p>
        )}
        {error && (
          <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
