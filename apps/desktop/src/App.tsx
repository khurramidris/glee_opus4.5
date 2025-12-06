import { useEffect, Suspense, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ChatView } from '@/components/chat/ChatView';
import { CharacterBrowser } from '@/components/character/CharacterBrowser';
import { CharacterCreator } from '@/components/character/CharacterCreator';
import { CharacterEditor } from '@/components/character/CharacterEditor';
import { PersonaList } from '@/components/persona/PersonaList';
import { LorebookList } from '@/components/lorebook/LorebookList';
import { LorebookEditor } from '@/components/lorebook/LorebookEditor';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { WelcomeScreen } from '@/components/onboarding/WelcomeScreen';
import { Toast } from '@/components/ui/Toast';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { SplashScreen } from '@/components/ui/SplashScreen';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUIStore } from '@/stores/uiStore';
import { useCharacterStore } from '@/stores/characterStore';
import { usePersonaStore } from '@/stores/personaStore';
import { useConversationStore } from '@/stores/conversationStore';

function LoadingFallback() {
  return (
    <SplashScreen status="Loading content..." />
  );
}

export default function App() {
  const { settings, fetchSettings, startSidecar } = useSettingsStore();
  const { fetchCharacters } = useCharacterStore();
  const { fetchPersonas } = usePersonaStore();
  const { fetchConversations } = useConversationStore();
  const toasts = useUIStore((s) => s.toasts);
  const autoStartAttempted = useRef(false);

  // Loading state tracking for splash screen
  const [loadingPhase, setLoadingPhase] = useState<'init' | 'settings' | 'data' | 'model' | 'ready'>('init');
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Phase 1: Load settings
        setLoadingPhase('settings');
        setLoadingProgress(10);
        await fetchSettings();
        setLoadingProgress(30);

        // Phase 2: Load app data
        setLoadingPhase('data');
        setLoadingProgress(40);
        await Promise.all([
          fetchCharacters(),
          fetchPersonas(),
          fetchConversations(),
        ]);
        setLoadingProgress(70);
      } catch (e) {
        console.error("Failed to load initial data", e);
      }
    };
    loadData();
  }, []);

  // Auto-start sidecar after settings are loaded and first run is complete
  useEffect(() => {
    if (settings && !settings.app.firstRun && !autoStartAttempted.current) {
      autoStartAttempted.current = true;
      setLoadingPhase('model');
      setLoadingProgress(80);

      // Start model loading
      startSidecar()
        .then(() => {
          setLoadingProgress(100);
          setTimeout(() => setLoadingPhase('ready'), 300);
        })
        .catch(err => {
          console.log('Model auto-start failed (may not be installed yet):', err);
          // Still mark as ready so user can access the app
          setLoadingProgress(100);
          setTimeout(() => setLoadingPhase('ready'), 300);
        });
    } else if (settings && settings.app.firstRun) {
      // First run - mark as ready immediately
      setLoadingProgress(100);
      setLoadingPhase('ready');
    }
  }, [settings, startSidecar]);

  // Get status message based on loading phase
  const getLoadingStatus = () => {
    switch (loadingPhase) {
      case 'init': return 'Initializing...';
      case 'settings': return 'Loading settings...';
      case 'data': return 'Loading characters and personas...';
      case 'model': return 'Starting AI model...';
      default: return 'Almost ready...';
    }
  };

  // Show splash screen while initializing
  if (!settings || (loadingPhase !== 'ready' && !settings.app.firstRun)) {
    return <SplashScreen status={getLoadingStatus()} progress={loadingProgress} />;
  }

  // Show onboarding if first run
  if (settings.app.firstRun) {
    return (
      <ErrorBoundary>
        <WelcomeScreen />
        <ToastContainer toasts={toasts} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppShell>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Navigate to="/characters" replace />} />
              <Route path="/characters" element={<CharacterBrowser />} />
              <Route path="/characters/new" element={<CharacterCreator />} />
              <Route path="/characters/:id/edit" element={<CharacterEditor />} />
              <Route path="/chat/:conversationId" element={<ChatView />} />
              <Route path="/personas" element={<PersonaList />} />
              <Route path="/lorebooks" element={<LorebookList />} />
              <Route path="/lorebooks/:id" element={<LorebookEditor />} />
              <Route path="/settings" element={<SettingsPanel />} />
              <Route path="*" element={<Navigate to="/characters" replace />} />
            </Routes>
          </Suspense>
        </AppShell>
        <ToastContainer toasts={toasts} />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

// Helper component to render toasts
function ToastContainer({ toasts }: { toasts: any[] }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast {...toast} />
        </div>
      ))}
    </div>
  );
}