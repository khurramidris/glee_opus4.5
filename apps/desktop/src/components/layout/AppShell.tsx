import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { StatusBar } from './StatusBar';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen w-screen bg-surface-900 text-surface-100 overflow-hidden">
      {/* Sidebar */}
      <div className="flex-shrink-0 h-full">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0 h-full relative">
        <Header />
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
        <StatusBar />
      </div>
    </div>
  );
}