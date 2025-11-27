import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacters } from '@/hooks/useCharacters';
import { useConversationStore } from '@/stores/conversationStore';
import { useUIStore } from '@/stores/uiStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { PersonaSelector } from '@/components/persona/PersonaSelector';
import { cn } from '@/lib/utils';

interface GroupChatCreatorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GroupChatCreator({ isOpen, onClose }: GroupChatCreatorProps) {
  const navigate = useNavigate();
  const { characters } = useCharacters();
  const { createConversation } = useConversationStore();
  const { addToast } = useUIStore();

  const [title, setTitle] = useState('');
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleCharacter = (charId: string) => {
    setSelectedCharacterIds((prev) =>
      prev.includes(charId)
        ? prev.filter((id) => id !== charId)
        : [...prev, charId]
    );
  };

  const handleCreate = async () => {
    if (selectedCharacterIds.length < 2) {
      addToast({ type: 'error', message: 'Select at least 2 characters for group chat' });
      return;
    }

    setIsSubmitting(true);
    try {
      const conversation = await createConversation({
        characterIds: selectedCharacterIds,
        title: title || `Group Chat (${selectedCharacterIds.length} characters)`,
        personaId: personaId || undefined,
      });
      navigate(`/chat/${conversation.id}`);
      onClose();
    } catch (e) {
      addToast({ type: 'error', message: `Failed to create group chat: ${e}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Group Chat" size="lg">
      <div className="space-y-4">
        <Input
          label="Group Name"
          placeholder="Adventure Party, Study Group, etc."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div>
          <label className="block text-sm font-medium text-surface-300 mb-2">
            Select Characters ({selectedCharacterIds.length} selected)
          </label>
          <p className="text-xs text-surface-500 mb-3">
            Select 2 or more characters. They will take turns responding to your messages.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-72 overflow-y-auto">
            {characters.map((char) => {
              const isSelected = selectedCharacterIds.includes(char.id);
              const order = selectedCharacterIds.indexOf(char.id) + 1;
              
              return (
                <button
                  key={char.id}
                  onClick={() => toggleCharacter(char.id)}
                  className={cn(
                    'relative flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                    isSelected
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-surface-600 hover:border-surface-500'
                  )}
                >
                  {isSelected && (
                    <span className="absolute -top-2 -left-2 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {order}
                    </span>
                  )}
                  <Avatar
                    src={char.avatarPath}
                    fallback={char.name}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-surface-100 truncate">
                      {char.name}
                    </p>
                  </div>
                  {isSelected && (
                    <svg className="w-5 h-5 text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <PersonaSelector
          value={personaId}
          onChange={setPersonaId}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            isLoading={isSubmitting}
            disabled={selectedCharacterIds.length < 2}
          >
            Create Group ({selectedCharacterIds.length})
          </Button>
        </div>
      </div>
    </Modal>
  );
}
```

---

## Part 3B-2A Complete

**Files created: 15**

```
apps/desktop/src/components/
├── character/
│   ├── CharacterBrowser.tsx
│   ├── CharacterCard.tsx
│   ├── CharacterCreator.tsx
│   ├── CharacterEditor.tsx
│   ├── CharacterDetail.tsx
│   ├── ImportDialog.tsx
│   └── AvatarUploader.tsx
├── persona/
│   ├── PersonaList.tsx
│   ├── PersonaCard.tsx
│   ├── PersonaEditor.tsx
│   └── PersonaSelector.tsx
└── conversation/
    ├── ConversationList.tsx
    ├── ConversationItem.tsx
    ├── ConversationCreator.tsx
    └── GroupChatCreator.tsx
```

**What exists now:**
- Character browser with search, import, CRUD
- Character cards with chat/edit/delete actions
- Character creator with tabs (Basic, Personality, Advanced)
- Character editor for modifying existing characters
- TavernAI/SillyTavern character card import (PNG with tEXt chunk + JSON)
- Avatar uploader with preview
- Persona list with CRUD operations
- Persona selector dropdown for conversations
- Conversation list with recent chats
- Single character conversation creator
- Group chat creator (multi-character selection)

**What's next in Part 3B-2B:**
- Lorebook components (List, Editor, EntryEditor, KeywordInput, LorebookAttacher)
- Settings components (Panel, GenerationSettings, ModelSettings, AppearanceSettings, DataSettings)
- Onboarding components (WelcomeScreen, DownloadProgress, SetupComplete)

---

**Ready for Part 3B-2B?**
 
# GLEE Implementation — Part 3B-2B of 4
## React Components: Lorebook, Settings & Onboarding

---

## Overview

Part 3B-2B completes the React frontend with:
- Lorebook components
- Settings components  
- Onboarding components

After this part: Complete React frontend ready to combine with backend.

---

## Files in Part 3B-2B

```
apps/desktop/src/components/
├── lorebook/
│   ├── LorebookList.tsx
│   ├── LorebookEditor.tsx
│   ├── EntryEditor.tsx
│   ├── KeywordInput.tsx
│   └── LorebookAttacher.tsx
├── settings/
│   ├── SettingsPanel.tsx
│   ├── GenerationSettings.tsx
│   ├── ModelSettings.tsx
│   ├── AppearanceSettings.tsx
│   └── DataSettings.tsx
└── onboarding/
    ├── WelcomeScreen.tsx
    ├── DownloadProgress.tsx
    └── SetupComplete.tsx
