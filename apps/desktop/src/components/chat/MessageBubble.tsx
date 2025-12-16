import { useState, memo } from 'react';
import type { Message } from '@/types';
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

  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
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
      <div className="flex justify-center py-3">
        <p className="text-sm text-white/40 italic px-4 py-1.5 bg-white/5 rounded-full">
          {message.content}
        </p>
      </div>
    );
  }

  const authorLabel = isUser ? 'You' : (message.authorName || 'Character');

  return (
    <div
      className={cn(
        'group flex gap-3 py-3 w-full animate-fade-in',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div
        className={cn(
          'flex flex-col max-w-[75%]',
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
            'relative transition-all duration-200',
            isUser
              ? 'bubble-user'
              : 'bubble-ai'
          )}
        >
          {/* Author Label */}
          <div className={cn(
            'text-xs font-semibold mb-2',
            isUser ? 'text-white/70' : 'text-primary-400'
          )}>
            {authorLabel}
          </div>

          {isEditing ? (
            <div className="min-w-[200px]">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className={cn(
                  "w-full bg-transparent border-none outline-none resize-none text-inherit",
                  "focus:ring-0 leading-relaxed"
                )}
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
              <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-white/10">
                <button
                  onClick={handleCancelEdit}
                  className="text-xs opacity-70 hover:opacity-100 font-medium px-2 py-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="text-xs font-semibold bg-white/20 hover:bg-white/30 px-3 py-1 rounded-md transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words leading-relaxed text-[15px]">
              {message.content}
            </p>
          )}
        </div>

        {/* Timestamp */}
        <span className={cn(
          'text-[11px] font-medium text-white/30 mt-2',
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