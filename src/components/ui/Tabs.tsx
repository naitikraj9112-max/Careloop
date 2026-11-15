import React from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className }) => {
  return (
    <div role="tablist" className={cn('flex items-center gap-2 overflow-x-auto py-1', className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-semibold',
              'whitespace-nowrap transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E] focus-visible:ring-offset-2',
              isActive
                ? 'bg-[#18181B] text-white shadow-sm'
                : 'border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50'
            )}
          >
            {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  'w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center',
                  isActive ? 'bg-white text-neutral-900' : 'bg-neutral-800 text-white'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
