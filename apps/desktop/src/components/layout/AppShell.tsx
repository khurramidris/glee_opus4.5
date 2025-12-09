import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { IconSidebar } from './IconSidebar';
import { ContactsList } from './ContactsList';
import { Header } from './Header';
import { StatusBar } from './StatusBar';
import { TitleBar } from '../ui/TitleBar';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const isInChat = location.pathname.startsWith('/chat/');


  return (
    <div className="h-screen w-screen flex flex-col text-surface-800 overflow-hidden">
      <TitleBar />
      <div className="flex-1 flex overflow-hidden relative">
        {/* Panel 1: Icon Sidebar (narrow) */}
        <div className="flex-shrink-0 h-full">
          <IconSidebar />
        </div>

        {/* Panel 2: Contacts/Characters List */}
        <div className="flex-shrink-0 h-full">
          <ContactsList />
        </div>

        {/* Panel 3: Main Content Area */}
        <div className="flex flex-col flex-1 min-w-0 h-full relative">
          {!isInChat && <Header />}
          <main className="flex-1 overflow-hidden relative">
            {children}
          </main>
          {!isInChat && <StatusBar />}
        </div>
      </div>
    </div>
  );
}