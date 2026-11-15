import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, id, ...props }, ref) => {
    const autoId = useId();
    const selectId = id || autoId;
    const errorId = `${selectId}-error`;
    const hasError = !!error;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-semibold text-neutral-800 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={hasError}
            aria-describedby={hasError ? errorId : undefined}
            className={cn(
              'block w-full rounded-2xl border bg-white text-base px-5 py-3.5 min-h-12',
              'appearance-none pr-11',
              'transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-[#22C55E]/25 focus:border-[#22C55E]',
              hasError
                ? 'border-red-400 text-red-900 focus:ring-red-400/25 focus:border-red-500'
                : 'border-neutral-200 text-neutral-900 hover:border-neutral-300',
              'disabled:opacity-50 disabled:bg-neutral-50 disabled:cursor-not-allowed',
              className
            )}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <ChevronDown className="h-5 w-5 text-neutral-400" aria-hidden="true" />
          </div>
        </div>
        {hasError && (
          <p id={errorId} className="mt-1.5 text-xs font-medium text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
