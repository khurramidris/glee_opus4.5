import { useNavigate } from 'react-router-dom';
import type { Conversation } from '@/types';
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
  conversation: Conversation;
}

export function ChatHeader({ conversation }: ChatHeaderProps) {
  const navigate = useNavigate();
  const character = conversation.characters[0];
  const title = conversation.title || character?.name || 'Chat';

  return (
    <header className={cn(
      "flex items-center justify-between px-5 py-3",
      "border-b border-white/5",
      "bg-transparent"
    )}>
      <div className="flex items-center gap-3 min-w-0">
        {/* Back button */}
        <button
          onClick={() => navigate('/characters')}
          className={cn(
            "p-2 -ml-2 rounded-lg transition-all duration-150",
            "text-white/50 hover:text-white hover:bg-white/10",
            "active:scale-95"
          )}
          title="Back to characters"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Title */}
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-white truncate font-display">
            {title.toLowerCase().startsWith('chat with') ? title : `Chat with ${title}`}
          </h1>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          className={cn(
            "p-2 rounded-lg transition-all duration-150",
            "text-white/50 hover:text-white hover:bg-white/10"
          )}
          title="More options"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>
    </header>
  );
}