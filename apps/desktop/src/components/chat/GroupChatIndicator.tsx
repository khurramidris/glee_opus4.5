import type { Character } from '@/types';
import { Avatar } from '@/components/ui/Avatar';

interface GroupChatIndicatorProps {
  characters: Character[];
  currentSpeaker?: string;
}

export function GroupChatIndicator({
  characters,
  currentSpeaker,
}: GroupChatIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-surface-800 border-b border-surface-700">
      <div className="flex -space-x-2">
        {characters.slice(0, 4).map((char) => (
          <Avatar
            key={char.id}
            src={char.avatarPath}
            fallback={char.name}
            size="sm"
            className="ring-2 ring-surface-800"
          />
        ))}
        {characters.length > 4 && (
          <div className="w-8 h-8 rounded-full bg-surface-600 ring-2 ring-surface-800 flex items-center justify-center text-xs text-surface-300">
            +{characters.length - 4}
          </div>
        )}
      </div>

      <span className="text-sm text-surface-400">
        {currentSpeaker ? (
          <>
            <span className="text-surface-200">{currentSpeaker}</span> is responding...
          </>
        ) : (
          <>Group chat with {characters.length} characters</>
        )}
      </span>
    </div>
  );
}
