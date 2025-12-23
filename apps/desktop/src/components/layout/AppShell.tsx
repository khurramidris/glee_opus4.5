import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { ContactsList } from './ContactsList';
import { Header } from './Header';
import { StatusBar } from './StatusBar';
import { TitleBar } from '../ui/TitleBar';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { motion, AnimatePresence } from 'framer-motion';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const isInChat = location.pathname.startsWith('/chat/');
  const { leftPanelCollapsed, toggleLeftPanel } = useUIStore();

  return (
    <div className="h-screen w-screen flex flex-col bg-transparent text-surface-800 overflow-hidden relative">
      <TitleBar />

      <div className="flex-1 flex overflow-hidden relative p-2 gap-2">
        {/* Left Panel Persistent Toggle (Visible when collapsed) */}
        {leftPanelCollapsed && (
          <button
            onClick={toggleLeftPanel}
            className="toggle-tab toggle-tab-left-collapsed"
            title="Expand Sidebar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Panel 1: Contacts/Characters List */}
        <AnimatePresence mode="wait">
          {!leftPanelCollapsed && (
            <motion.div
              initial={{ width: 0, opacity: 0, marginLeft: -8 }}
              animate={{ width: 256, opacity: 1, marginLeft: 0 }}
              exit={{ width: 0, opacity: 0, marginLeft: -8 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="flex-shrink-0 h-full overflow-hidden"
            >
              <div className="w-64 h-full relative group rounded-2xl overflow-hidden">
                <ContactsList />
                {/* Collapse Button (Persistent tab on right edge of panel) */}
                <button
                  onClick={toggleLeftPanel}
                  className="toggle-tab toggle-tab-left-expanded"
                  title="Collapse Sidebar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Panel 3: Main Content Area */}
        <div className={cn(
          "flex flex-col flex-1 min-w-0 h-full relative rounded-2xl overflow-hidden",
          !isInChat && "panel"
        )}>
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