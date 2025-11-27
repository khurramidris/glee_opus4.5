import { useEffect } from 'react';
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
import { useSettingsStore } from '@/stores/settingsStore';
import { useUIStore } from '@/stores/uiStore';
import { useCharacterStore } from '@/stores/characterStore';
import { usePersonaStore } from '@/stores/personaStore';
import { useConversationStore } from '@/stores/conversationStore';

export default function App() {
  const { settings, fetchSettings } = useSettingsStore();
  const { fetchCharacters } = useCharacterStore();
  const { fetchPersonas } = usePersonaStore();
  const { fetchConversations } = useConversationStore();
  const toasts = useUIStore((s) => s.toasts);

  useEffect(() => {
    // Load initial data
    fetchSettings();
    fetchCharacters();
    fetchPersonas();
    fetchConversations();
  }, []);

  // Show onboarding if first run
  if (settings?.app.firstRun) {
    return <WelcomeScreen />;
  }

  return (
    <BrowserRouter>
      <AppShell>
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
        </Routes>
      </AppShell>
      
      {/* Global toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
    </BrowserRouter>
  );
}
