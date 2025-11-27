import { useConversations } from '@/hooks/useConversations';
import { ConversationItem } from './ConversationItem';
import { Spinner } from '@/components/ui/Spinner';

interface ConversationListProps {
  onSelect: (conversationId: string) => void;
  selectedId?: string;
}

export function ConversationList({ onSelect, selectedId }: ConversationListProps) {
  const { conversations, isLoading, deleteConversation } = useConversations();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <p className="text-surface-500 text-sm">
          No conversations yet. Start chatting with a character!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          isSelected={conversation.id === selectedId}
          onClick={() => onSelect(conversation.id)}
          onDelete={() => deleteConversation(conversation.id)}
        />
      ))}
    </div>
  );
}
