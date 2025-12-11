import { useRef, useEffect, useMemo } from 'react';
import type { Message } from '@/types';
import { MessageBubble } from './MessageBubble';
import { StreamingMessage } from './StreamingMessage';
import { TypingIndicator } from './TypingIndicator';

interface MessageListProps {
  messages: Message[];
  streamingMessages: Record<string, { content: string; startedAt: number }>;
  streamingContent: (messageId: string) => string;
  onRegenerate: (messageId: string) => void;
  onEdit: (messageId: string, content: string) => void;
  onSwitchBranch: (messageId: string) => void;
  getBranchSiblings: (messageId: string) => Promise<Message[]>;
  characterName: string;
  isGenerating?: boolean;
}

export function MessageList({
  messages,
  streamingMessages,
  streamingContent,
  onRegenerate,
  onEdit,
  onSwitchBranch,
  getBranchSiblings,
  characterName,
  isGenerating = false,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Get streaming message IDs
  const streamingIds = Object.keys(streamingMessages);

  // Calculate total streaming content length for scroll trigger
  const streamingContentLength = useMemo(() => {
    return streamingIds.reduce((acc, id) => acc + (streamingMessages[id]?.content?.length || 0), 0);
  }, [streamingIds, streamingMessages]);

  // Debug logging
  useEffect(() => {
    console.log('[MessageList] Render - messages:', messages.length, 'streaming:', streamingIds.length);
  }, [messages.length, streamingIds.length]);

  // Auto-scroll to bottom when messages change or streaming content updates
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, streamingIds.length, streamingContentLength, isGenerating]);

  // Show typing indicator only when generating but no streaming content yet
  const showTypingIndicator = isGenerating && streamingIds.length === 0;

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto px-6 py-4 space-y-2 bg-surface-100"
    >
      {/* Date separator (placeholder) */}
      <div className="flex justify-center py-4">
        <span className="text-xs text-surface-400 bg-surface-200 px-3 py-1 rounded-full">
          Today
        </span>
      </div>

      {/* Render all messages */}
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          onRegenerate={() => onRegenerate(message.id)}
          onEdit={(content) => onEdit(message.id, content)}
          onSwitchBranch={onSwitchBranch}
          getBranchSiblings={getBranchSiblings}
        />
      ))}

      {/* Render streaming messages */}
      {streamingIds.map((messageId) => {
        const content = streamingContent(messageId);
        return (
          <StreamingMessage
            key={`streaming-${messageId}`}
            content={content}
            characterName={characterName}
          />
        );
      })}

      {/* Typing indicator - shown when generating but no streaming content yet */}
      {showTypingIndicator && (
        <div className="py-2">
          <TypingIndicator characterName={characterName} onStop={() => {}} />
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
}