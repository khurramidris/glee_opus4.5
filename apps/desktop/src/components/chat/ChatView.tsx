import { useParams } from 'react-router-dom';
import { useChat } from '@/hooks/useChat';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { Spinner } from '@/components/ui/Spinner';
import { useChatStore } from '@/stores/chatStore';

export function ChatView() {
  const { conversationId } = useParams<{ conversationId: string }>();
  
  // Subscribe to update counter to force re-renders
  const updateCounter = useChatStore((s) => s._updateCounter);
  
  if (!conversationId) {
    return <div className="p-8 text-center text-surface-400">No conversation selected</div>;
  }

  const {
    conversation,
    messages,
    streamingMessages,
    streamingContent,
    isLoading,
    isGenerating,
    error,
    sendMessage,
    regenerate,
    edit,
    switchBranch,
    stopGeneration,
    getBranchSiblings,
  } = useChat(conversationId);

  // Debug
  console.log('[ChatView] Render - messages:', messages.length, 'counter:', updateCounter);

  const currentCharacterName = conversation?.characters[0]?.name || 'Character';

  if (isLoading && !conversation) {
    return <div className="h-full flex items-center justify-center"><Spinner size="lg" /></div>;
  }

  if (!conversation && !isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <p className="text-red-400 mb-4">{error || 'Conversation not found'}</p>
        <a href="/characters" className="text-primary-400 hover:underline">Back to Characters</a>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {conversation && <ChatHeader conversation={conversation} />}
      
      <div className="flex-1 overflow-hidden relative">
        <MessageList
          key={`messages-${messages.length}-${updateCounter}`}
          messages={messages}
          streamingMessages={streamingMessages}
          streamingContent={streamingContent}
          onRegenerate={regenerate}
          onEdit={edit}
          onSwitchBranch={switchBranch}
          getBranchSiblings={getBranchSiblings}
          characterName={currentCharacterName}
        />
      </div>

      <div className="border-t border-surface-700 bg-surface-900">
        {isGenerating && (
          <div className="px-4 py-2 border-b border-surface-700 bg-surface-800/50">
            <TypingIndicator
              characterName={currentCharacterName}
              onStop={stopGeneration}
            />
          </div>
        )}
        <ChatInput
          onSend={sendMessage}
          onStop={stopGeneration}
          disabled={false}
          isGenerating={isGenerating}
          placeholder={`Message ${currentCharacterName}...`}
        />
      </div>
    </div>
  );
}