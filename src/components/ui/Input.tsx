import React, { useId } from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: LucideIcon;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon: Icon, className, id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id || autoId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;
    const hasError = !!error;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-neutral-800 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Icon className="h-5 w-5 text-neutral-400" aria-hidden="true" />
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={hasError}
            aria-describedby={
              [hasError ? errorId : '', helperText ? helperId : '']
                .filter(Boolean)
                .join(' ') || undefined
            }
            className={cn(
              'block w-full rounded-2xl border bg-white text-base px-5 py-3.5 min-h-12',
              'transition-all duration-150',
              'placeholder:text-neutral-400',
              'focus:outline-none focus:ring-2 focus:ring-[#22C55E]/25 focus:border-[#22C55E]',
              Icon && 'pl-12',
              hasError
                ? 'border-red-400 text-red-900 focus:ring-red-400/25 focus:border-red-500'
                : 'border-neutral-200 text-neutral-900 hover:border-neutral-300',
              'disabled:opacity-50 disabled:bg-neutral-50 disabled:cursor-not-allowed',
              className
            )}
            {...props}
          />
        </div>
        {hasError && (
          <p id={errorId} className="mt-1.5 text-xs font-medium text-red-600" role="alert">
            {error}
          </p>
        )}
        {helperText && !hasError && (
          <p id={helperId} className="mt-1.5 text-xs text-neutral-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
