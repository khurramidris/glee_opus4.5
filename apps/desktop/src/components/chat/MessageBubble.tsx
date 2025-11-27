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
        'group flex gap-3 py-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {!isUser && (
        <Avatar
          fallback={message.authorName || 'AI'}
          size="md"
          className="flex-shrink-0"
        />
      )}

      <div
        className={cn(
          'flex flex-col max-w-[70%]',
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

        {/* Author name for character */}
        {!isUser && message.authorName && (
          <span className="text-sm font-medium text-surface-300 mb-1">
            {message.authorName}
          </span>
        )}

        {/* Message content */}
        <div
          className={cn(
            'relative px-4 py-2.5 rounded-2xl',
            isUser
              ? 'bg-primary-600 text-white rounded-br-md'
              : 'bg-surface-700 text-surface-100 rounded-bl-md'
          )}
        >
          {isEditing ? (
            <div className="min-w-[200px]">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-transparent border-none outline-none resize-none text-inherit"
                rows={3}
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={handleCancelEdit}
                  className="text-xs text-surface-400 hover:text-surface-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="text-xs text-primary-400 hover:text-primary-300"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          )}
        </div>

        {/* Actions */}
        <MessageActions
          visible={showActions && !isEditing}
          isUser={isUser}
          onEdit={() => setIsEditing(true)}
          onRegenerate={onRegenerate}
        />
      </div>

      {isUser && (
        <Avatar
          fallback="You"
          size="md"
          className="flex-shrink-0 bg-primary-600"
        />
      )}
    </div>
  );
});
