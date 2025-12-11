import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Conversation } from '@/types';

interface ChatHeaderProps {
  conversation: Conversation;
}

export function ChatHeader({ conversation }: ChatHeaderProps) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const characterName = conversation.characters?.[0]?.name || conversation.title || 'Character';

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-surface-200/50 bg-surface-50/80 backdrop-blur-sm relative z-10">
      <h1 className="text-lg font-semibold text-surface-800 font-display tracking-tight">
        Chat with {characterName}
      </h1>

      {/* Three-dot Menu */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-lg transition-all duration-200"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-full mt-1 w-48 bg-surface-50 rounded-xl shadow-lg border border-surface-200/50 py-1 z-20">
              <button
                onClick={() => {
                  navigate('/characters');
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-surface-700 hover:bg-surface-100 transition-colors"
              >
                Back to Characters
              </button>
              <button
                onClick={() => {
                  const charId = conversation.characters?.[0]?.id;
                  if (charId) navigate(`/characters/${charId}/edit`);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-surface-700 hover:bg-surface-100 transition-colors"
              >
                Edit Character
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}