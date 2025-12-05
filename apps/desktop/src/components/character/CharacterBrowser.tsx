import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacters } from '@/hooks/useCharacters';
import { CharacterCard } from './CharacterCard';
import { ImportDialog } from './ImportDialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { commands } from '@/lib/commands';

export function CharacterBrowser() {
  const navigate = useNavigate();
  const { characters, isLoading, deleteCharacter } = useCharacters();

  const [searchQuery, setSearchQuery] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isStartingChat, setIsStartingChat] = useState<string | null>(null);

  const filteredCharacters = characters.filter((char) =>
    char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    char.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    char.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleStartChat = async (characterId: string) => {
    setIsStartingChat(characterId);
    try {
      const existing = await commands.findConversationByCharacter(characterId);

      if (existing) {
        navigate(`/chat/${existing.id}`);
      } else {
        const conversation = await commands.createConversation({
          characterIds: [characterId],
        });
        navigate(`/chat/${conversation.id}`);
      }
    } catch (e) {
      console.error('Failed to start conversation:', e);
    } finally {
      setIsStartingChat(null);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteCharacter(id);
    setDeleteConfirm(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search and Actions Bar */}
      <div className="flex items-center gap-4 p-4 border-b border-surface-700 bg-surface-900">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search characters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <Button variant="secondary" onClick={() => setShowImportDialog(true)}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Import
        </Button>
      </div>

      {/* Character Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredCharacters.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 mb-4 text-surface-600">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-surface-300 mb-2">
              {searchQuery ? 'No characters found' : 'No characters yet'}
            </h3>
            <p className="text-surface-500 mb-4">
              {searchQuery
                ? 'Try a different search term'
                : 'Create your first character to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={() => navigate('/characters/new')}>
                Create Character
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredCharacters.map((character) => (
              <div key={character.id} className={isStartingChat === character.id ? 'opacity-50 pointer-events-none' : ''}>
                <CharacterCard
                  character={character}
                  onChat={() => handleStartChat(character.id)}
                  onEdit={() => navigate(`/characters/${character.id}/edit`)}
                  onDelete={() => setDeleteConfirm(character.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Import Dialog */}
      <ImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Character"
        size="sm"
      >
        <p className="text-surface-300 mb-6">
          Are you sure you want to delete this character? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}