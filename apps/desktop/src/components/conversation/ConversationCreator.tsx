import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacters } from '@/hooks/useCharacters';
import { useConversationStore } from '@/stores/conversationStore';
import { useUIStore } from '@/stores/uiStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { PersonaSelector } from '@/components/persona/PersonaSelector';
import { cn } from '@/lib/utils';

interface ConversationCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedCharacterId?: string;
}

export function ConversationCreator({
  isOpen,
  onClose,
  preselectedCharacterId,
}: ConversationCreatorProps) {
  const navigate = useNavigate();
  const { characters } = useCharacters();
  const { createConversation } = useConversationStore();
  const { addToast } = useUIStore();

  const [title, setTitle] = useState('');
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    preselectedCharacterId || null
  );
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!selectedCharacterId) {
      addToast({ type: 'error', message: 'Please select a character' });
      return;
    }

    setIsSubmitting(true);
    try {
      const conversation = await createConversation({
        characterIds: [selectedCharacterId],
        title: title || undefined,
        personaId: personaId || undefined,
      });
      navigate(`/chat/${conversation.id}`);
      onClose();
    } catch (e) {
      addToast({ type: 'error', message: `Failed to create conversation: ${e}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Start New Chat" size="md">
      <div className="space-y-4">
        <Input
          label="Conversation Title (optional)"
          placeholder="Leave blank for auto-generated title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div>
          <label className="block text-sm font-medium text-surface-300 mb-2">
            Select Character
          </label>
          <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
            {characters.map((char) => (
              <button
                key={char.id}
                onClick={() => setSelectedCharacterId(char.id)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                  selectedCharacterId === char.id
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-surface-600 hover:border-surface-500'
                )}
              >
                <Avatar
                  src={char.avatarPath}
                  fallback={char.name}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-surface-100 truncate">
                    {char.name}
                  </p>
                  <p className="text-xs text-surface-500 truncate">
                    {char.description || 'No description'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <PersonaSelector
          value={personaId}
          onChange={setPersonaId}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            isLoading={isSubmitting}
            disabled={!selectedCharacterId}
          >
            Start Chat
          </Button>
        </div>
      </div>
    </Modal>
  );
}
