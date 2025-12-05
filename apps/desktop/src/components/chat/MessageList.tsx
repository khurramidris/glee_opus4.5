import { useRef, useEffect } from 'react';
import type { Message } from '@/types';
import { MessageBubble } from './MessageBubble';
import { StreamingMessage } from './StreamingMessage';

interface MessageListProps {
  messages: Message[];
  streamingMessages: Record<string, { content: string; startedAt: number }>;
  streamingContent: (messageId: string) => string;
  onRegenerate: (messageId: string) => void;
  onEdit: (messageId: string, content: string) => void;
  onSwitchBranch: (messageId: string) => void;
  getBranchSiblings: (messageId: string) => Promise<Message[]>;
  characterName: string;
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
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // Get streaming message IDs
  const streamingIds = Object.keys(streamingMessages);
  
  // Debug logging
  useEffect(() => {
    console.log('[MessageList] Render - messages:', messages.length, 'streaming:', streamingIds.length);
  }, [messages.length, streamingIds.length]);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, streamingIds.length, streamingMessages]);

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto px-4 py-4 space-y-4"
    >
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
      
      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
}