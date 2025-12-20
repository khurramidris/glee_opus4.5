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
    <div className="h-screen w-screen flex flex-col bg-transparent text-surface-800 overflow-hidden">
      <TitleBar />

      <div className="flex-1 flex overflow-hidden relative p-2 pt-1 gap-2">
        {/* Left Panel Toggle (Floating when collapsed) */}
        {leftPanelCollapsed && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={toggleLeftPanel}
            className="absolute left-4 bottom-4 z-50 w-10 h-10 rounded-full bg-primary-500 text-white shadow-lg flex items-center justify-center hover:bg-primary-600 transition-colors"
            title="Expand Sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </motion.button>
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
              <div className="w-64 h-full relative group">
                <ContactsList />
                {/* Collapse Button (Internal) */}
                <button
                  onClick={toggleLeftPanel}
                  className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-all opacity-0 group-hover:opacity-100 z-50"
                  title="Collapse Sidebar"
                >
                  <svg className="w-4 h-4 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Panel 3: Main Content Area */}
        <div className={cn(
          "flex flex-col flex-1 min-w-0 h-full relative overflow-hidden",
          !isInChat && "panel rounded-2xl"
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