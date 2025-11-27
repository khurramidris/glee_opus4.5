import { useNavigate } from 'react-router-dom';
import type { Conversation } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';

interface ChatHeaderProps {
  conversation: Conversation;
}

export function ChatHeader({ conversation }: ChatHeaderProps) {
  const navigate = useNavigate();
  const character = conversation.characters[0];

  return (
    <header className="flex items-center gap-4 px-4 py-3 border-b border-surface-700 bg-surface-800">
      <button
        onClick={() => navigate('/characters')}
        className="p-2 text-surface-400 hover:text-surface-100 hover:bg-surface-700 rounded-lg transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {character && (
        <>
          <Avatar
            src={character.avatarPath}
            fallback={character.name}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-surface-100 truncate">
                {character.name}
              </h2>
              {conversation.isGroup && (
                <Badge variant="primary">Group</Badge>
              )}
            </div>
            <p className="text-sm text-surface-400 truncate">
              {character.description || 'No description'}
            </p>
          </div>
        </>
      )}

      <div className="flex items-center gap-2">
        <button
          className="p-2 text-surface-400 hover:text-surface-100 hover:bg-surface-700 rounded-lg transition-colors"
          title="Conversation settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
