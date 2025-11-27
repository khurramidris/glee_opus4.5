import { useParams } from 'react-router-dom';
import { useChat } from '@/hooks/useChat';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { Spinner } from '@/components/ui/Spinner';

export function ChatView() {
  const { conversationId } = useParams<{ conversationId: string }>();
  
  if (!conversationId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-surface-400">No conversation selected</p>
      </div>
    );
  }

  const {
    conversation,
    messages,
    streamingMessages,
    isLoading,
    isGenerating,
    sendMessage,
    regenerate,
    edit,
    switchBranch,
    stopGeneration,
    getBranchSiblings,
  } = useChat(conversationId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-surface-400">Conversation not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ChatHeader conversation={conversation} />
      
      <div className="flex-1 overflow-hidden">
        <MessageList
          messages={messages}
          streamingMessages={streamingMessages}
          onRegenerate={regenerate}
          onEdit={edit}
          onSwitchBranch={switchBranch}
          getBranchSiblings={getBranchSiblings}
        />
      </div>

      <div className="border-t border-surface-700">
        {isGenerating && (
          <div className="px-4 py-2 border-b border-surface-700">
            <TypingIndicator
              characterName={conversation.characters[0]?.name || 'Character'}
              onStop={stopGeneration}
            />
          </div>
        )}
        <ChatInput
          onSend={sendMessage}
          disabled={isGenerating}
          placeholder={`Message ${conversation.characters[0]?.name || 'character'}...`}
        />
      </div>
    </div>
  );
}
