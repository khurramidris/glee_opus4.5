import { useParams, Link } from 'react-router-dom';
import { useChat } from '@/hooks/useChat';
import { useModelStatus } from '@/hooks/useModelStatus';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { CharacterInfoPanel } from './CharacterInfoPanel';
import { Spinner } from '@/components/ui/Spinner';
import { useChatStore } from '@/stores/chatStore';

export function ChatView() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { isLoaded: isModelLoaded, status: modelStatus, startSidecar, isLoading: isModelLoading } = useModelStatus();

  // Subscribe to update counter to force re-renders
  const updateCounter = useChatStore((s) => s._updateCounter);

  if (!conversationId) {
    return <div className="p-8 text-center text-surface-500">No conversation selected</div>;
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
  console.log('[ChatView] Render - messages:', messages.length, 'counter:', updateCounter, 'modelLoaded:', isModelLoaded);

  const currentCharacter = conversation?.characters[0];
  const currentCharacterName = currentCharacter?.name || 'Character';

  if (isLoading && !conversation) {
    return <div className="h-full flex items-center justify-center"><Spinner size="lg" /></div>;
  }

  if (!conversation && !isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <p className="text-red-500 mb-4">{error || 'Conversation not found'}</p>
        <a href="/characters" className="text-primary-600 hover:underline">Back to Characters</a>
      </div>
    );
  }

  const handleStartModel = async () => {
    try {
      await startSidecar();
    } catch (e) {
      console.error('Failed to start model:', e);
    }
  };

  return (
    <div className="flex h-full gap-1.5">
      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 min-w-0 h-full bg-surface-50 rounded-2xl overflow-hidden">
        {conversation && <ChatHeader conversation={conversation} />}

        {/* Model not loaded warning */}
        {!isModelLoaded && (
          <div className="mx-4 mt-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm text-amber-800">
                {modelStatus === 'not_found' 
                  ? 'No AI model found. Please download or configure a model in Settings.'
                  : 'AI model not loaded. Click "Start Model" to begin chatting.'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {modelStatus !== 'not_found' && (
                <button
                  onClick={handleStartModel}
                  disabled={isModelLoading}
                  className="px-3 py-1.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
                >
                  {isModelLoading ? 'Starting...' : 'Start Model'}
                </button>
              )}
              <Link
                to="/settings"
                className="px-3 py-1.5 text-sm bg-surface-200 text-surface-700 rounded-lg hover:bg-surface-300"
              >
                Settings
              </Link>
            </div>
          </div>
        )}

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
            isGenerating={isGenerating}
          />
        </div>

        <div className="pb-2">
          <ChatInput
            onSend={sendMessage}
            onStop={stopGeneration}
            disabled={!isModelLoaded}
            isGenerating={isGenerating}
            placeholder={isModelLoaded ? `Message ${currentCharacterName}...` : 'Model not loaded - configure in Settings'}
          />
        </div>
      </div>

      {/* Panel 4: Character Info Panel */}
      {currentCharacter && (
        <CharacterInfoPanel character={currentCharacter} />
      )}
    </div>
  );
}