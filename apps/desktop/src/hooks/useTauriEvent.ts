import { useEffect, useRef } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

export function useTauriEvent<T>(
  eventName: string,
  handler: (payload: T) => void,
  deps: unknown[] = []
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  
  useEffect(() => {
    let unlistenFn: UnlistenFn | null = null;
    
    listen<T>(eventName, (event) => {
      handlerRef.current(event.payload);
    }).then((fn) => {
      unlistenFn = fn;
    });
    
    return () => {
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, [eventName, ...deps]);
}
```

---

## Part 3A Complete

**Files created: 28**

```
apps/desktop/src/
├── main.tsx
├── App.tsx
├── types/
│   ├── index.ts
│   ├── character.ts
│   ├── conversation.ts
│   ├── message.ts
│   ├── persona.ts
│   ├── lorebook.ts
│   ├── settings.ts
│   └── events.ts
├── lib/
│   ├── commands.ts
│   ├── events.ts
│   ├── format.ts
│   ├── utils.ts
│   └── constants.ts
├── stores/
│   ├── index.ts
│   ├── characterStore.ts
│   ├── conversationStore.ts
│   ├── chatStore.ts
│   ├── personaStore.ts
│   ├── lorebookStore.ts
│   ├── settingsStore.ts
│   ├── downloadStore.ts
│   └── uiStore.ts
└── hooks/
    ├── useCharacters.ts
    ├── useConversations.ts
    ├── useChat.ts
    ├── usePersonas.ts
    ├── useLorebooks.ts
    ├── useSettings.ts
    ├── useModelStatus.ts
    ├── useDownload.ts
    ├── useBranching.ts
    └── useTauriEvent.ts
```

**What exists now:**
- All TypeScript types matching Rust entities
- Typed command wrappers for all 40+ Tauri commands
- Typed event handlers for streaming
- 8 Zustand stores with full state management
- 10 React hooks for data fetching and event handling
- Utility functions for formatting, PNG parsing, etc.

**What's next in Part 3B:**
- All React components (ui, layout, chat, character, persona, conversation, lorebook, settings, onboarding)

---

**Ready for Part 3B?**
 
# GLEE Implementation — Part 3B-1 of 4
## React Components: UI Primitives, Layout & Chat

---

## Overview

Part 3B is split into two sub-parts:
- **Part 3B-1**: UI primitives, Layout components, Chat components
- **Part 3B-2**: Character, Persona, Conversation, Lorebook, Settings, Onboarding components

---

## Files in Part 3B-1

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
