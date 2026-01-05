import { useEffect, Suspense, useRef, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
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
import { useSmartSetup } from '@/hooks/useSmartSetup';

interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

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
  const addToast = useUIStore((s) => s.addToast);
  const toasts = useUIStore((s) => s.toasts) as ToastItem[];
  const autoStartAttempted = useRef(false);
  const { checkStatus } = useSmartSetup();

  const [loadingPhase, setLoadingPhase] = useState<'init' | 'settings' | 'data' | 'model' | 'ready'>('init');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    // Show window quickly to reveal the splash screen
    // We add a tiny delay to ensure the DOM is ready for the initial splash
    const showWindow = async () => {
      try {
        const win = getCurrentWindow();
        console.log("Window show requested from frontend...");
        await win.show();
        console.log("Window show command executed successfully");
      } catch (err) {
        console.error("Failed to show window from frontend:", err);
      }
    };

    setTimeout(showWindow, 100);

    const loadData = async () => {
      try {
        setLoadingPhase('settings');
        setLoadingProgress(10);
        await fetchSettings();
        setLoadingProgress(30);

        const refreshSetup = async () => {
          try {
            const setupStatus = await checkStatus();
            console.log('[App] Refreshing Setup status:', setupStatus);
            if (!setupStatus) {
              setNeedsOnboarding(true);
              return false;
            } else {
              const needsSetup = !setupStatus.is_complete || setupStatus.missing_binary || setupStatus.missing_model;
              setNeedsOnboarding(needsSetup);
              return !needsSetup;
            }
          } catch (e) {
            console.error('Failed to refresh setup status:', e);
            setNeedsOnboarding(true);
            return false;
          }
        };

        // Check if setup is complete (binary + model exist)
        setLoadingProgress(35);
        await refreshSetup();

        setLoadingPhase('data');
        setLoadingProgress(40);
        await Promise.all([
          fetchCharacters(),
          fetchPersonas(),
          fetchConversations(),
        ]);
        setLoadingProgress(70);
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to load initial data';
        console.error("Failed to load initial data", e);
        setLoadError(errorMessage);
        addToast({ type: 'error', message: errorMessage });
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    let unlistenWarning: (() => void) | null = null;
    let unlistenError: (() => void) | null = null;

    const setupListeners = async () => {
      const { listen } = await import('@tauri-apps/api/event');

      unlistenWarning = await listen<{ message: string }>('chat:warning', (event) => {
        console.warn('[App] Chat warning:', event.payload.message);
        addToast({ type: 'warning', message: event.payload.message });
      });

      unlistenError = await listen<{ error: string }>('chat:error', (event) => {
        console.error('[App] Chat error:', event.payload.error);
        addToast({ type: 'error', message: event.payload.error });
      });
    };

    setupListeners();

    return () => {
      if (unlistenWarning) unlistenWarning();
      if (unlistenError) unlistenError();
    };
  }, [addToast]);

  useEffect(() => {
    // Wait until we know if onboarding is needed
    if (needsOnboarding === null) return;

    // If onboarding is needed, skip sidecar startup
    if (needsOnboarding || (settings && settings.app.firstRun)) {
      setLoadingProgress(100);
      setLoadingPhase('ready');
      return;
    }

    // Only auto-start sidecar if setup is complete
    if (settings && !autoStartAttempted.current) {
      autoStartAttempted.current = true;
      setLoadingPhase('model');
      setLoadingProgress(80);

      startSidecar()
        .then(() => {
          setLoadingProgress(100);
          setTimeout(() => setLoadingPhase('ready'), 300);
        })
        .catch(err => {
          console.log('Model auto-start failed (may not be installed yet):', err);
          setLoadingProgress(100);
          setTimeout(() => setLoadingPhase('ready'), 300);
        });
    }
  }, [settings, startSidecar, needsOnboarding]);

  // Window is shown on mount in the first useEffect

  const getLoadingStatus = () => {
    if (loadError) return `Error: ${loadError}`;
    switch (loadingPhase) {
      case 'init': return 'Loading...';
      case 'settings': return 'Loading settings...';
      case 'data': return 'Loading characters and personas...';
      case 'model': return 'Starting AI model...';
      default: return 'Almost ready...';
    }
  };

  // Still loading
  if (!settings || needsOnboarding === null || (loadingPhase !== 'ready' && !needsOnboarding)) {
    return <SplashScreen status={getLoadingStatus()} progress={loadingProgress} />;
  }

  // Show onboarding if firstRun OR if setup is incomplete (binary/model missing)
  if (settings.app.firstRun || needsOnboarding) {
    return (
      <ErrorBoundary>
        <WelcomeScreen onComplete={() => {
          console.log('[App] Onboarding marked complete, refreshing status...');
          // Give a small delay for DB to persist if needed
          setTimeout(() => {
            checkStatus().then(status => {
              if (status) {
                const stillNeeds = !status.is_complete || status.missing_binary || status.missing_model;
                console.log('[App] Status after onboarding:', status, 'stillNeeds:', stillNeeds);
                setNeedsOnboarding(stillNeeds);
              }
            });
          }, 500);
        }} />
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

function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
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