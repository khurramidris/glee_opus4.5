import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { MAX_MESSAGE_LENGTH } from '@/lib/constants';

interface ChatInputProps {
  onSend: (content: string) => Promise<unknown>;
  onStop?: () => void;
  disabled?: boolean;
  isGenerating?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  onStop,
  disabled = false,
  isGenerating = false,
  placeholder = 'Type a message...',
}: ChatInputProps) {
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isOverLimit = content.length > MAX_MESSAGE_LENGTH;

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [content]);

  const handleSend = useCallback(async () => {
    const trimmedContent = content.trim();
    console.log('[ChatInput] Attempting to send:', trimmedContent);

    if (!trimmedContent || disabled || isOverLimit || isSending) {
      console.warn('[ChatInput] Send blocked:', { disabled, isOverLimit, isSending });
      return;
    }

    // Clear immediately for UX responsiveness
    const savedContent = content;
    setContent('');
    setIsSending(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const result = await onSend(trimmedContent);
      console.log('[ChatInput] Sent successfully, result:', !!result);
    } catch (e) {
      console.error('[ChatInput] Error sending:', e);
      // Restore text on failure
      setContent(savedContent);
    } finally {
      setIsSending(false);
    }
  }, [content, disabled, isOverLimit, isSending, onSend]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && isGenerating && onStop) {
      e.preventDefault();
      onStop();
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend, isGenerating, onStop]);

  const canSend = content.trim().length > 0 && !disabled && !isOverLimit && !isGenerating && !isSending;

  return (
    <div className="flex flex-col gap-2 p-4 bg-surface-50">
      {content.length > MAX_MESSAGE_LENGTH * 0.9 && (
        <div className={cn(
          'text-xs text-right',
          isOverLimit ? 'text-red-500' : 'text-amber-500'
        )}>
          {content.length.toLocaleString()} / {MAX_MESSAGE_LENGTH.toLocaleString()}
        </div>
      )}

      <div className="flex items-end gap-3">
        {/* Emoji Button */}
        <button className="p-2 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-full transition-colors flex-shrink-0">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            rows={1}
            className={cn(
              'w-full px-4 py-3 bg-surface-100 border border-surface-200 rounded-2xl',
              'text-surface-800 placeholder-surface-400 resize-none',
              'focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'max-h-[200px] overflow-y-auto',
              isOverLimit && 'border-red-500 focus:ring-red-500/30'
            )}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button className="p-2 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-full transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button className="p-2 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-full transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>

        {/* Send/Stop Button */}
        {isGenerating ? (
          <button
            onClick={onStop}
            className="px-5 py-2.5 bg-surface-200 text-surface-700 font-medium rounded-2xl hover:bg-surface-300 transition-colors flex-shrink-0"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={cn(
              'px-5 py-2.5 font-medium rounded-2xl transition-colors flex-shrink-0',
              canSend
                ? 'bg-primary-500 text-white hover:bg-primary-600'
                : 'bg-surface-200 text-surface-400 cursor-not-allowed'
            )}
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        )}
      </div>
    </div>
  );
}