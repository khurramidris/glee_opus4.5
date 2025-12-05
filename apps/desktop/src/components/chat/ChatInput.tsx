import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
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
    <div className="flex flex-col gap-2 p-4">
      {content.length > MAX_MESSAGE_LENGTH * 0.9 && (
        <div className={cn(
          'text-xs text-right',
          isOverLimit ? 'text-red-400' : 'text-yellow-400'
        )}>
          {content.length.toLocaleString()} / {MAX_MESSAGE_LENGTH.toLocaleString()}
        </div>
      )}
      
      <div className="flex items-end gap-3">
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
              'w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl',
              'text-surface-100 placeholder-surface-500 resize-none',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'max-h-[200px] overflow-y-auto',
              isOverLimit && 'border-red-500 focus:ring-red-500'
            )}
          />
        </div>
        
        {isGenerating ? (
          <Button
            onClick={onStop}
            variant="secondary"
            className="flex-shrink-0"
          >
            Stop
          </Button>
        ) : (
          <Button
            onClick={handleSend}
            disabled={!canSend}
            className="flex-shrink-0"
          >
            {isSending ? 'Sending...' : 'Send'}
          </Button>
        )}
      </div>
    </div>
  );
}