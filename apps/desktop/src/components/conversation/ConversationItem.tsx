import { memo, useState } from 'react';
import type { Conversation } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
}

export const ConversationItem = memo(function ConversationItem({
  conversation,
  isSelected,
  onClick,
  onDelete,
}: ConversationItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const character = conversation.characters[0];

  return (
    <div
      className={cn(
        'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
        isSelected
          ? 'bg-primary-50 text-primary-900'
          : 'hover:bg-surface-100 text-surface-700'
      )}
      onClick={onClick}
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
    >
      {/* Avatar Stack for Group */}
      {conversation.isGroup ? (
        <div className="relative w-10 h-10 flex-shrink-0">
          {conversation.characters.slice(0, 2).map((char, i) => (
            <Avatar
              key={char.id}
              src={char.avatarPath}
              fallback={char.name}
              size="sm"
              className={cn(
                'absolute ring-2 ring-white',
                i === 0 ? 'top-0 left-0' : 'bottom-0 right-0'
              )}
            />
          ))}
        </div>
      ) : (
        <Avatar
          src={character?.avatarPath}
          fallback={character?.name || '?'}
          size="md"
        />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{conversation.title}</span>
          {conversation.isGroup && (
            <Badge size="sm" variant="default">
              {conversation.characters.length}
            </Badge>
          )}
        </div>
        <p className="text-xs text-surface-500 truncate">
          {formatDate(conversation.updatedAt)}
        </p>
      </div>

      {/* Delete button */}
      {showMenu && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute right-2 p-1.5 text-surface-500 hover:text-red-500 hover:bg-surface-200 rounded transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  );
});
