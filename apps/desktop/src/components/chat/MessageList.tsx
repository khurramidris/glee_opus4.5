import { useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Message } from '@/types';
import { MessageBubble } from './MessageBubble';
import { StreamingMessage } from './StreamingMessage';

interface MessageListProps {
  messages: Message[];
  streamingMessages: Map<string, string>;
  onRegenerate: (messageId: string) => void;
  onEdit: (messageId: string, content: string) => void;
  onSwitchBranch: (messageId: string) => void;
  getBranchSiblings: (messageId: string) => Promise<Message[]>;
}

export function MessageList({
  messages,
  streamingMessages,
  onRegenerate,
  onEdit,
  onSwitchBranch,
  getBranchSiblings,
}: MessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Combine regular messages with streaming messages
  const allMessages = [...messages];
  const streamingIds = Array.from(streamingMessages.keys());

  const virtualizer = useVirtualizer({
    count: allMessages.length + streamingIds.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, streamingMessages.size]);

  return (
    <div
      ref={parentRef}
      className="h-full overflow-y-auto px-4 py-4"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const index = virtualRow.index;
          const isStreaming = index >= allMessages.length;

          if (isStreaming) {
            const streamIndex = index - allMessages.length;
            const messageId = streamingIds[streamIndex];
            const content = streamingMessages.get(messageId) || '';

            return (
              <div
                key={messageId}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <StreamingMessage content={content} />
              </div>
            );
          }

          const message = allMessages[index];

          return (
            <div
              key={message.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <MessageBubble
                message={message}
                onRegenerate={() => onRegenerate(message.id)}
                onEdit={(content) => onEdit(message.id, content)}
                onSwitchBranch={onSwitchBranch}
                getBranchSiblings={getBranchSiblings}
              />
            </div>
          );
        })}
      </div>
      <div ref={scrollRef} />
    </div>
  );
}
