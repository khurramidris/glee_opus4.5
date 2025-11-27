import { useState, useRef, useCallback, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Type a message...',
}: ChatInputProps) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    if (content.trim() && !disabled) {
      onSend(content.trim());
      setContent('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [content, disabled, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  return (
    <div className="flex items-end gap-3 p-4">
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            'w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl',
            'text-surface-100 placeholder-surface-500 resize-none',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'max-h-[200px] overflow-y-auto'
          )}
        />
      </div>
      
      <Button
        onClick={handleSend}
        disabled={disabled || !content.trim()}
        className="flex-shrink-0"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
          />
        </svg>
      </Button>
    </div>
  );
}
