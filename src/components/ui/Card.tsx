import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  className,
  onClick,
  hoverable = false,
}) => {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={cn(
        'bg-white rounded-3xl border border-neutral-200/70 p-6 text-left w-full shadow-[0_2px_12px_rgba(0,0,0,0.03)]',
        'transition-all duration-200',
        hoverable && 'hover:shadow-md hover:border-neutral-300 cursor-pointer',
        onClick && 'hover:shadow-md hover:border-neutral-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E] focus-visible:ring-offset-2',
        className
      )}
    >
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="text-lg font-bold text-neutral-900 tracking-tight">{title}</h3>}
          {subtitle && <p className="text-sm text-neutral-500 mt-0.5">{subtitle}</p>}
        </div>
      )}
      {children}
    </Component>
  );
};

export default Card;
