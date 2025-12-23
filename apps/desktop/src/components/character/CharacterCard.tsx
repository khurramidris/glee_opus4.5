import { memo } from 'react';
import type { Character } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { truncate } from '@/lib/format';
import { cn } from '@/lib/utils';

interface CharacterCardProps {
  character: Character;
  onChat: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const CharacterCard = memo(function CharacterCard({
  character,
  onChat,
  onEdit,
  onDelete,
}: CharacterCardProps) {
  return (
    <Card
      hoverable
      padding="none"
      variant="glass"
      className="flex flex-col h-full overflow-hidden group transition-all duration-300 hover:glow-primary-sm hover:scale-[1.01] active:scale-[0.99]"
    >
      {/* Character Header */}
      <div className="flex-1 relative p-4 pb-3 flex flex-col">
        <div className="flex items-start gap-4">
          <Avatar
            src={character.avatarPath}
            fallback={character.name}
            size="xl"
            className="shadow-md flex-shrink-0"
          />
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white truncate font-display">
                {character.name}
              </h3>
              {character.isBundled && (
                <Badge variant="primary" size="sm">Starter</Badge>
              )}
            </div>
            <p className="text-sm text-white/50 mt-1.5 line-clamp-2 leading-relaxed">
              {truncate(character.description || 'No description', 80)}
            </p>
          </div>
        </div>

        {/* Tags */}
        {character.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-auto pt-3">
            {character.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} size="sm" variant="default">
                {tag}
              </Badge>
            ))}
            {character.tags.length > 3 && (
              <Badge size="sm" variant="default">
                +{character.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex border-t border-white/5 bg-white/2 mt-auto">
        <button
          onClick={onChat}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-2.5",
            "text-sm font-medium text-primary-400 hover:text-primary-300",
            "hover:bg-white/5 active:bg-white/10",
            "transition-colors duration-150"
          )}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Chat
        </button>

        <div className="w-px bg-white/5" />

        <button
          onClick={onEdit}
          className={cn(
            "px-4 py-2.5",
            "text-white/30 hover:text-white",
            "hover:bg-white/5 active:bg-white/10",
            "transition-colors duration-150"
          )}
          title="Edit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>

        <button
          onClick={onDelete}
          className={cn(
            "px-4 py-2.5",
            "text-white/30 hover:text-danger",
            "hover:bg-red-500/10 active:bg-red-500/20",
            "transition-colors duration-150"
          )}
          title="Delete"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </Card>
  );
});
