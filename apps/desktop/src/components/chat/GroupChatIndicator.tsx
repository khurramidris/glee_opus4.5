import type { Character } from '@/types';
import { Avatar } from '@/components/ui/Avatar';

interface GroupChatIndicatorProps {
  characters: Character[];
  currentSpeaker?: string;
}

export function GroupChatIndicator({
  characters,
  currentSpeaker,
}: GroupChatIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-surface-800 border-b border-surface-700">
      <div className="flex -space-x-2">
        {characters.slice(0, 4).map((char) => (
          <Avatar
            key={char.id}
            src={char.avatarPath}
            fallback={char.name}
            size="sm"
            className="ring-2 ring-surface-800"
          />
        ))}
        {characters.length > 4 && (
          <div className="w-8 h-8 rounded-full bg-surface-600 ring-2 ring-surface-800 flex items-center justify-center text-xs text-surface-300">
            +{characters.length - 4}
          </div>
        )}
      </div>
      
      <span className="text-sm text-surface-400">
        {currentSpeaker ? (
          <>
            <span className="text-surface-200">{currentSpeaker}</span> is responding...
          </>
        ) : (
          <>Group chat with {characters.length} characters</>
        )}
      </span>
    </div>
  );
}
```

---

## Part 3B-1 Complete

**Files created: 24**

```
apps/desktop/src/components/
├── ui/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── TextArea.tsx
│   ├── Select.tsx
│   ├── Modal.tsx
│   ├── Avatar.tsx
│   ├── Badge.tsx
│   ├── Card.tsx
│   ├── Progress.tsx
│   ├── Spinner.tsx
│   ├── Toast.tsx
│   ├── Tabs.tsx
│   ├── Toggle.tsx
│   └── ErrorBoundary.tsx
├── layout/
│   ├── AppShell.tsx
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   └── StatusBar.tsx
└── chat/
    ├── ChatView.tsx
    ├── ChatHeader.tsx
    ├── MessageList.tsx
    ├── MessageBubble.tsx
    ├── BranchNavigator.tsx
    ├── StreamingMessage.tsx
    ├── ChatInput.tsx
    ├── TypingIndicator.tsx
    ├── MessageActions.tsx
    └── GroupChatIndicator.tsx
```

**What exists now:**
- All UI primitives (Button, Input, Modal, Avatar, etc.)
- App layout with sidebar navigation
- Complete chat interface with:
  - Virtualized message list
  - Branch navigation [1/3] ◄ ►
  - Streaming message display
  - Message actions (edit, regenerate)
  - Typing indicator
  - Group chat indicator

**What's next in Part 3B-2:**
- Character components (Browser, Card, Creator, Editor, ImportDialog)
- Persona components (List, Editor, Selector)
- Conversation components (List, Item, Creator, GroupChatCreator)
- Lorebook components (List, Editor, EntryEditor, KeywordInput)
- Settings components (Panel, GenerationSettings, DataSettings)
- Onboarding components (WelcomeScreen, DownloadProgress, SetupComplete)

---

**Ready for Part 3B-2?**
 
# GLEE Implementation — Part 3B-2A of 4
## React Components: Character, Persona & Conversation

---

## Overview

Part 3B-2 is split into:
- **Part 3B-2A**: Character, Persona, Conversation components
- **Part 3B-2B**: Lorebook, Settings, Onboarding components

---

## Files in Part 3B-2A

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
