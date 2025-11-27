# Glee Architecture

## Overview

Glee is an offline-first AI character companion application built with:

- **Tauri 2.0** - Desktop framework (Rust backend + Web frontend)
- **React 18** - Frontend UI
- **SQLite** - Local database
- **llama.cpp** - LLM inference (sidecar process)

## System Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                       │
│                     (React + TypeScript)                     │
│                                                              │
│  Components → Hooks → Stores → Commands/Events              │
└─────────────────────────────────┬───────────────────────────┘
                                  │ Tauri IPC
┌─────────────────────────────────┼───────────────────────────┐
│                     APPLICATION LAYER                        │
│                     (Tauri + Rust)                           │
│                                                              │
│  Commands → Services → Repositories                         │
└─────────────────────────────────┬───────────────────────────┘
                                  │
              ┌───────────────────┴───────────────────┐
              │                                       │
              ▼                                       ▼
┌─────────────────────────┐             ┌─────────────────────────┐
│       SQLite            │             │    llama.cpp Sidecar    │
│       Database          │             │    (HTTP API)           │
└─────────────────────────┘             └─────────────────────────┘
```

## Data Flow

### Message Sending

```
User Input
    │
    ▼
ChatInput Component
    │
    ├─► useChatStore.sendMessage()
    │
    ▼
invoke("send_message")
    │
    ▼
Rust: MessageService
    │
    ├─► Create user message in DB
    ├─► Create queue task
    └─► Notify queue worker
    
Queue Worker (async)
    │
    ├─► Build context (MemoryService)
    ├─► Call llama.cpp API
    ├─► Stream tokens
    └─► emit("chat:token") ──► Frontend event handler
                                    │
                                    ▼
                              Update streaming UI
```

### Branching

Messages form a tree structure using `parent_id`:

```
[Root Message]
     │
[User Message 1]
     │
     ├── [Character Response 1a] (active)
     │        │
     │   [User Message 2]
     │
     └── [Character Response 1b] (regeneration)
              │
         [User Message 2-alt]
```

Navigation uses `is_active_branch` to track the visible path.

## Key Modules

### Backend (Rust)

| Module | Purpose |
|--------|---------|
| `entities.rs` | Data structures (Character, Message, etc.) |
| `repositories.rs` | Database operations |
| `services/` | Business logic |
| `commands/` | Tauri IPC handlers |
| `workers/` | Background processing |
| `sidecar/` | llama.cpp management |

### Frontend (React)

| Module | Purpose |
|--------|---------|
| `types/` | TypeScript interfaces |
| `lib/commands.ts` | Typed Tauri invoke wrappers |
| `lib/events.ts` | Typed event handlers |
| `stores/` | Zustand state management |
| `hooks/` | React hooks for data access |
| `components/` | UI components |

## Database Schema

Core tables:
- `characters` - AI character definitions
- `personas` - User identity profiles
- `conversations` - Chat sessions
- `messages` - Message tree (with branching)
- `lorebooks` - World-building knowledge
- `lorebook_entries` - Keyword-triggered content
- `settings` - Key-value configuration
- `message_queue` - Async generation tasks
- `downloads` - Resumable file downloads

## LLM Integration

Communication with llama.cpp server:

1. **Startup:** App spawns llama-server process
2. **Health Check:** Poll `/health` until ready
3. **Generation:** POST to `/v1/chat/completions` with streaming
4. **Shutdown:** Graceful termination on app exit

Context is built from:
- Character system prompt
- Persona description
- Matched lorebook entries
- Conversation history (sliding window)

## Security Model

- **No network access** except localhost (sidecar) and explicit downloads
- **Data isolation** in platform-specific app data directory
- **No telemetry** or cloud sync
- **Import validation** for character cards

## Performance Considerations

- **Virtualized lists** for long conversations
- **Streaming tokens** for responsive generation
- **Background workers** for non-blocking operations
- **SQLite WAL mode** for concurrent access
- **Debounced saves** to reduce disk writes
