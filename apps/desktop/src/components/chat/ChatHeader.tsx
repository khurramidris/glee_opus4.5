import { useNavigate } from 'react-router-dom';
import type { Conversation } from '@/types';

interface ChatHeaderProps {
  conversation: Conversation;
}

export function ChatHeader({ conversation }: ChatHeaderProps) {
  const navigate = useNavigate();


  return (
    <header className="flex items-center justify-center px-4 py-3 border-b border-surface-200 bg-surface-50 relative">
      {/* Back Button */}
      <button
        onClick={() => navigate('/characters')}
        className="absolute left-4 p-2 text-surface-500 hover:text-surface-700 hover:bg-surface-100 rounded-lg transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Centered Title */}
      <h1 className="text-lg font-bold text-primary-500">
        {conversation.title || 'Chat'}
      </h1>
    </header>
  );
}
