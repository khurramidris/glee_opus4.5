import { useParams, Link } from 'react-router-dom';
import { useMemo, useCallback } from 'react';
import { useChat } from '@/hooks/useChat';
import { useModelStatus } from '@/hooks/useModelStatus';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { CharacterInfoPanel } from './CharacterInfoPanel';
import { ChatErrorBoundary } from './ChatErrorBoundary';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { motion, AnimatePresence } from 'framer-motion';

export function ChatView() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { rightPanelCollapsed, toggleRightPanel } = useUIStore();
  const { isLoaded: isModelLoaded, status: modelStatus, startSidecar, isLoading: isModelLoading } = useModelStatus();

  if (!conversationId) {
    return <div className="p-8 text-center text-white/50">No conversation selected</div>;
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

  const currentCharacter = conversation?.characters[0];
  const currentCharacterName = currentCharacter?.name || 'Character';

  const handleRetryChat = useCallback(() => {
    if (conversationId) {
      window.location.reload();
    }
  }, [conversationId]);

  const memoizedMessages = useMemo(() => messages, [messages]);

  if (isLoading && !conversation) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!conversation && !isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <p className="text-red-400 mb-4">{error || 'Conversation not found'}</p>
        <a href="/characters" className="text-primary-400 hover:text-primary-300 hover:underline transition-colors">
          Back to Characters
        </a>
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
    <div className="flex h-full gap-2">
      {/* Main Chat Panel */}
      <div className="flex flex-col flex-1 min-w-0 h-full panel rounded-2xl overflow-hidden">
        <div className="relative flex flex-col h-full">
          {conversation && <ChatHeader conversation={conversation} />}

          {/* Model Warning Banner */}
          {!isModelLoaded && (
            <div className={cn(
              "mx-4 mt-3 px-4 py-3 rounded-xl flex items-center justify-between gap-4",
              "bg-amber-500/10 border border-amber-500/20"
            )}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <span className="text-sm text-amber-200 truncate">
                  {modelStatus === 'not_found'
                    ? 'No AI model found. Configure in Settings.'
                    : 'AI model not loaded. Start the model to chat.'}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {modelStatus !== 'not_found' && (
                  <button
                    onClick={handleStartModel}
                    disabled={isModelLoading}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-150",
                      "bg-amber-500 text-white hover:bg-amber-400",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {isModelLoading ? 'Starting...' : 'Start Model'}
                  </button>
                )}
                <Link
                  to="/settings"
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-150",
                    "bg-white/10 text-white/80 hover:bg-white/15 hover:text-white"
                  )}
                >
                  Settings
                </Link>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-hidden relative">
            <ChatErrorBoundary conversationId={conversationId} onRetry={handleRetryChat}>
              <MessageList
                messages={memoizedMessages}
                streamingMessages={streamingMessages}
                streamingContent={streamingContent}
                onRegenerate={regenerate}
                onEdit={edit}
                onSwitchBranch={switchBranch}
                getBranchSiblings={getBranchSiblings}
                characterName={currentCharacterName}
                isGenerating={isGenerating}
              />
            </ChatErrorBoundary>
          </div>

          {/* Input */}
          <div className="pb-2">
            <ChatInput
              onSend={sendMessage}
              onStop={stopGeneration}
              disabled={!isModelLoaded}
              isGenerating={isGenerating}
              placeholder={isModelLoaded ? `Message ${currentCharacterName}...` : 'Model not loaded'}
            />
          </div>
        </div>
      </div>

      {/* Character Info Panel */}
      <AnimatePresence mode="wait">
        {currentCharacter && !rightPanelCollapsed && (
          <motion.div
            initial={{ width: 0, opacity: 0, marginRight: -8 }}
            animate={{ width: 288, opacity: 1, marginRight: 0 }}
            exit={{ width: 0, opacity: 0, marginRight: -8 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="flex-shrink-0 h-full overflow-hidden"
          >
            <div className="w-72 h-full relative group">
              <CharacterInfoPanel character={currentCharacter} />
              {/* Collapse Button (Internal) */}
              <button
                onClick={toggleRightPanel}
                className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-all opacity-0 group-hover:opacity-100 z-50"
                title="Collapse Character Info"
              >
                <svg className="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expand Right Panel Button (Floating when collapsed) */}
      {rightPanelCollapsed && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={toggleRightPanel}
          className="absolute right-4 bottom-4 z-50 w-10 h-10 rounded-full bg-primary-500 text-white shadow-lg flex items-center justify-center hover:bg-primary-600 transition-colors"
          title="Expand Character Info"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
          </svg>
        </motion.button>
      )}
    </div>
  );
}