import { memo } from 'react';
import type { Character } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { truncate } from '@/lib/format';

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
    <Card hoverable padding="none" className="overflow-hidden group">
      {/* Character Header */}
      <div className="relative p-4 pb-3">
        <div className="flex items-start gap-3">
          <Avatar
            src={character.avatarPath}
            fallback={character.name}
            size="xl"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-surface-100 truncate">
                {character.name}
              </h3>
              {character.isBundled && (
                <Badge variant="primary" size="sm">Starter</Badge>
              )}
            </div>
            <p className="text-sm text-surface-400 mt-1 line-clamp-2">
              {truncate(character.description || 'No description', 80)}
            </p>
          </div>
        </div>

        {/* Tags */}
        {character.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {character.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} size="sm">
                {tag}
              </Badge>
            ))}
            {character.tags.length > 3 && (
              <Badge size="sm">+{character.tags.length - 3}</Badge>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex border-t border-surface-700">
        <button
          onClick={onChat}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-primary-400 hover:bg-primary-600/10 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Chat
        </button>
        
        <div className="w-px bg-surface-700" />
        
        <button
          onClick={onEdit}
          className="px-4 py-2.5 text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-colors"
          title="Edit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        
        <button
          onClick={onDelete}
          className="px-4 py-2.5 text-surface-400 hover:text-red-400 hover:bg-surface-700 transition-colors"
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
