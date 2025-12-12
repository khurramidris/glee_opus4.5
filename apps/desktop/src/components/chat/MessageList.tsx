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

  const streamingIds = Object.keys(streamingMessages);

  const streamingContentLength = useMemo(() => {
    return streamingIds.reduce((acc, id) => acc + (streamingMessages[id]?.content?.length || 0), 0);
  }, [streamingIds, streamingMessages]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, streamingIds.length, streamingContentLength, isGenerating]);

  const showTypingIndicator = isGenerating && streamingIds.length === 0;

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto px-6 py-4 space-y-2 bg-surface-100"
    >
      <div className="flex justify-center py-4">
        <span className="text-xs text-surface-400 bg-surface-200 px-3 py-1 rounded-full">
          Today
        </span>
      </div>

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

      {showTypingIndicator && (
        <div className="py-2">
          <TypingIndicator characterName={characterName} onStop={() => {}} />
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
