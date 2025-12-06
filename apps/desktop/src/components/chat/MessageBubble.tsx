import { useState, memo } from 'react';
import type { Message } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import { BranchNavigator } from './BranchNavigator';
import { MessageActions } from './MessageActions';

interface MessageBubbleProps {
  message: Message;
  onRegenerate: () => void;
  onEdit: (content: string) => void;
  onSwitchBranch: (messageId: string) => void;
  getBranchSiblings: (messageId: string) => Promise<Message[]>;
}

// Format timestamp - handle both Date objects and numeric timestamps
function formatTime(date: Date | string | number): string {
  let d: Date;
  if (typeof date === 'number') {
    d = new Date(date);
  } else if (typeof date === 'string') {
    d = new Date(date);
  } else {
    d = date;
  }

  if (isNaN(d.getTime())) {
    return '';
  }

  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
}

export const MessageBubble = memo(function MessageBubble({
  message,
  onRegenerate,
  onEdit,
  onSwitchBranch,
  getBranchSiblings,
}: MessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showActions, setShowActions] = useState(false);

  const isUser = message.authorType === 'user';
  const isSystem = message.authorType === 'system';

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit(editContent);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <p className="text-sm text-surface-500 italic">{message.content}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group flex gap-3 py-2 w-full',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <Avatar
        fallback={isUser ? 'You' : (message.authorName || 'AI')}
        size="md"
        className={cn(
          'flex-shrink-0',
          isUser ? 'bg-gradient-to-br from-blue-400 to-blue-500' : 'bg-gradient-to-br from-amber-400 to-orange-500'
        )}
      />

      <div
        className={cn(
          'flex flex-col max-w-[65%]',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        {/* Branch Navigator */}
        {(message.siblingCount ?? 0) > 1 && (
          <BranchNavigator
            messageId={message.id}
            onSwitch={onSwitchBranch}
            getSiblings={getBranchSiblings}
          />
        )}

        {/* Message content */}
        <div
          className={cn(
            'relative px-4 py-2.5 rounded-2xl shadow-soft',
            isUser
              ? 'bg-primary-500 text-white rounded-br-md'
              : 'bg-surface-50 text-surface-800 rounded-bl-md border border-surface-200'
          )}
        >
          {isEditing ? (
            <div className="min-w-[200px]">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-transparent border-none outline-none resize-none text-inherit focus:ring-0"
                rows={Math.max(3, Math.ceil(editContent.length / 40))}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveEdit();
                  } else if (e.key === 'Escape') {
                    handleCancelEdit();
                  }
                }}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={handleCancelEdit}
                  className="text-xs opacity-70 hover:opacity-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="text-xs font-bold hover:opacity-90"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
          )}
        </div>

        {/* Timestamp */}
        <span className={cn(
          'text-xs text-surface-400 mt-1',
          isUser ? 'mr-1' : 'ml-1'
        )}>
          {formatTime(message.createdAt)}
        </span>

        {/* Actions */}
        <MessageActions
          visible={showActions && !isEditing}
          isUser={isUser}
          content={message.content}
          onEdit={() => setIsEditing(true)}
          onRegenerate={onRegenerate}
        />
      </div>
    </div>
  );
});