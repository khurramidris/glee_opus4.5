import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { StatusBar } from './StatusBar';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  return (
    <div className="flex h-screen bg-surface-900">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div
        className={cn(
          'flex flex-col flex-1 min-w-0 transition-all duration-200',
          sidebarOpen ? 'ml-64' : 'ml-16'
        )}
      >
        <Header />
        <main className="flex-1 overflow-hidden">{children}</main>
        <StatusBar />
      </div>
    </div>
  );
}
