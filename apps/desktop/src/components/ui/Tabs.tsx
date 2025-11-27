import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex border-b border-surface-700', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
            activeTab === tab.id
              ? 'text-primary-400 border-primary-400'
              : 'text-surface-400 border-transparent hover:text-surface-200'
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
