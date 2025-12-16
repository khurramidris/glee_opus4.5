import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: string | number;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  variant?: 'underline' | 'pills';
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  className,
  variant = 'underline'
}: TabsProps) {
  if (variant === 'pills') {
    return (
      <div className={cn('flex gap-1 p-1 bg-surface-100 rounded-lg', className)}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-150',
              activeTab === tab.id
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-surface-500 hover:text-surface-700 hover:bg-surface-200/50'
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && (
              <span className={cn(
                'px-1.5 py-0.5 text-xs rounded-full',
                activeTab === tab.id
                  ? 'bg-primary-100 text-primary-600'
                  : 'bg-surface-200 text-surface-500'
              )}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex border-b border-surface-200', className)}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors duration-150 -mb-px',
              isActive
                ? 'text-primary-600'
                : 'text-surface-500 hover:text-surface-700'
            )}
          >
            {tab.icon && (
              <span className={cn(
                isActive ? 'text-primary-500' : 'text-surface-400'
              )}>
                {tab.icon}
              </span>
            )}
            {tab.label}
            {tab.badge !== undefined && (
              <span className={cn(
                'px-1.5 py-0.5 text-xs rounded-full',
                isActive
                  ? 'bg-primary-100 text-primary-600'
                  : 'bg-surface-100 text-surface-500'
              )}>
                {tab.badge}
              </span>
            )}
            {/* Active indicator */}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-primary-400 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
