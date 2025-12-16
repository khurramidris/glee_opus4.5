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

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [content]);

  const handleSend = useCallback(async () => {
    const trimmedContent = content.trim();

    if (!trimmedContent || disabled || isOverLimit || isSending) {
      return;
    }

    const savedContent = content;
    setContent('');
    setIsSending(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      await onSend(trimmedContent);
    } catch (e) {
      console.error('[ChatInput] Error sending:', e);
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
    <div className="flex flex-col gap-2 p-4 pt-0">
      {content.length > MAX_MESSAGE_LENGTH * 0.9 && (
        <div className={cn(
          'text-xs text-right',
          isOverLimit ? 'text-red-500' : 'text-amber-500'
        )}>
          {content.length.toLocaleString()} / {MAX_MESSAGE_LENGTH.toLocaleString()}
        </div>
      )}

      <div className="max-w-4xl mx-auto w-full">
        <div className="relative bg-white/5 border border-white/10 rounded-2xl shadow-inner transition-all duration-200 focus-within:bg-white/10 focus-within:border-white/20">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            rows={1}
            className={cn(
              'w-full px-5 py-4 pr-36 bg-transparent border-none rounded-2xl',
              'text-surface-800 placeholder-surface-400 resize-none',
              'focus:outline-none',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'max-h-[200px] overflow-y-auto',
              isOverLimit && 'text-red-500'
            )}
          />

          {/* Action buttons inside input */}
          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            {/* Mic Button */}
            <button
              type="button"
              className="p-2 text-surface-400 hover:text-primary-600 rounded-lg transition-colors"
              title="Voice input"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>

            {/* Image Button */}
            <button
              type="button"
              className="p-2 text-surface-400 hover:text-primary-600 rounded-lg transition-colors"
              title="Attach image"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>

            {/* Send/Stop Button */}
            {isGenerating ? (
              <button
                onClick={onStop}
                className="px-4 py-2 flex items-center gap-2 bg-surface-300/80 text-surface-700 rounded-xl hover:bg-surface-300 transition-colors font-medium text-sm"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!canSend}
                className={cn(
                  'px-4 py-2 flex items-center gap-2 rounded-xl transition-all duration-200 font-medium text-sm',
                  canSend
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-surface-300/60 text-surface-400 cursor-not-allowed'
                )}
              >
                Send
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}