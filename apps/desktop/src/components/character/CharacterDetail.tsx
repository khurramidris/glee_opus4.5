import type { Character } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/format';

interface CharacterDetailProps {
  character: Character;
  onChat: () => void;
  onEdit: () => void;
  onClose: () => void;
}

export function CharacterDetail({
  character,
  onChat,
  onEdit,
  onClose,
}: CharacterDetailProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start gap-4 p-6 border-b border-surface-700">
        <Avatar
          src={character.avatarPath}
          fallback={character.name}
          size="xl"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-semibold text-surface-100">
              {character.name}
            </h2>
            {character.isBundled && (
              <Badge variant="primary">Starter</Badge>
            )}
          </div>
          <p className="text-surface-400 text-sm">
            Created {formatDate(character.createdAt)}
          </p>
          {character.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {character.tags.map((tag) => (
                <Badge key={tag} size="sm">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 text-surface-400 hover:text-surface-100 hover:bg-surface-700 rounded-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {character.description && (
          <div>
            <h3 className="text-sm font-medium text-surface-400 mb-2">Description</h3>
            <p className="text-surface-200 whitespace-pre-wrap">{character.description}</p>
          </div>
        )}

        {character.personality && (
          <div>
            <h3 className="text-sm font-medium text-surface-400 mb-2">Personality</h3>
            <p className="text-surface-200 whitespace-pre-wrap">{character.personality}</p>
          </div>
        )}

        {character.firstMessage && (
          <div>
            <h3 className="text-sm font-medium text-surface-400 mb-2">First Message</h3>
            <div className="bg-surface-700 rounded-lg p-3">
              <p className="text-surface-200 whitespace-pre-wrap">{character.firstMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 p-6 border-t border-surface-700">
        <Button onClick={onChat} className="flex-1">
          Start Chat
        </Button>
        <Button variant="secondary" onClick={onEdit}>
          Edit
        </Button>
      </div>
    </div>
  );
}
