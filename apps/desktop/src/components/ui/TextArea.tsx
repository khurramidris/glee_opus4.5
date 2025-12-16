import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
  hint?: string;
  variant?: 'default' | 'glass';
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, error, label, hint, id, variant = 'default', ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    const variants = {
      default: `
        bg-surface-100 
        border-surface-200 
        text-surface-800 
        placeholder-surface-400
        focus:border-primary-500 
        focus:ring-primary-500/20
        hover:border-surface-300
      `,
      glass: `
        bg-white/10 
        border-white/15 
        text-white 
        placeholder-white/40
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
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3.5 py-2.5 border rounded-lg resize-y min-h-[80px]',
            'text-sm leading-relaxed',
            'transition-all duration-150 ease-out',
            'focus:outline-none focus:ring-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            variants[variant],
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            className
          )}
          {...props}
        />
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

TextArea.displayName = 'TextArea';
