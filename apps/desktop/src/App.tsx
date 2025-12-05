import { useEffect, Suspense } from 'react';
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
import { Spinner } from '@/components/ui/Spinner';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUIStore } from '@/stores/uiStore';
import { useCharacterStore } from '@/stores/characterStore';
import { usePersonaStore } from '@/stores/personaStore';
import { useConversationStore } from '@/stores/conversationStore';

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full bg-surface-900 text-surface-100">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p>Loading Glee...</p>
      </div>
    </div>
  );
}

export default function App() {
  const { settings, fetchSettings } = useSettingsStore();
  const { fetchCharacters } = useCharacterStore();
  const { fetchPersonas } = usePersonaStore();
  const { fetchConversations } = useConversationStore();
  const toasts = useUIStore((s) => s.toasts);

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchSettings();
        await Promise.all([
          fetchCharacters(),
          fetchPersonas(),
          fetchConversations(),
        ]);
      } catch (e) {
        console.error("Failed to load initial data", e);
      }
    };
    loadData();
  }, []);

  // Show loading while settings are being fetched
  if (!settings) {
    return <LoadingFallback />;
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