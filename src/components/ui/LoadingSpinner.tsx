import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type SpinnerSize = 'sm' | 'md' | 'lg';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  text?: string;
}

const sizeStyles: Record<SpinnerSize, string> = {
  sm: 'h-5 w-5',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

const textSizeStyles: Record<SpinnerSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
}) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3" role="status">
      <Loader2
        className={cn('animate-spin text-blue-600', sizeStyles[size])}
        aria-hidden="true"
      />
      {text && (
        <p className={cn('text-gray-500 font-medium', textSizeStyles[size])}>
          {text}
        </p>
      )}
      <span className="sr-only">{text || 'Loading...'}</span>
    </div>
  );
};

export default LoadingSpinner;
