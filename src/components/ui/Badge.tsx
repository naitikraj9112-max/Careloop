import React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'dark';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; dot?: string }> = {
  success: {
    bg: 'bg-[#EBF7EE]',
    text: 'text-[#1E3A2F]',
    dot: 'bg-[#22C55E]',
  },
  warning: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    dot: 'bg-amber-500',
  },
  danger: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    dot: 'bg-red-500',
  },
  info: {
    bg: 'bg-neutral-100',
    text: 'text-neutral-800',
    dot: 'bg-neutral-500',
  },
  neutral: {
    bg: 'bg-neutral-100',
    text: 'text-neutral-700',
    dot: 'bg-neutral-400',
  },
  dark: {
    bg: 'bg-[#18181B]',
    text: 'text-white',
  },
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'text-xs px-2.5 py-0.5',
  md: 'text-xs sm:text-sm px-3.5 py-1',
};

const dotSizeStyles: Record<BadgeSize, string> = {
  sm: 'h-1.5 w-1.5',
  md: 'h-2 w-2',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  children,
  className,
}) => {
  const styles = variantStyles[variant];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        styles.bg,
        styles.text,
        sizeStyles[size],
        className
      )}
    >
      {styles.dot && (
        <span
          className={cn('rounded-full shrink-0', styles.dot, dotSizeStyles[size])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};

export default Badge;
