import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (content: string) => void;
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [content]);

  const handleSubmit = () => {
    if (content.trim() && !disabled && !isGenerating) {
      onSend(content.trim());
      setContent('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="px-4 pb-2">
      <div className={cn(
        "flex items-end gap-3 p-3 rounded-2xl",
        "bg-white/5 border border-white/10",
        "transition-all duration-150",
        "focus-within:border-white/20 focus-within:bg-white/8"
      )}>
        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            "flex-1 bg-transparent border-none outline-none resize-none",
            "text-white placeholder-white/40",
            "text-[15px] leading-relaxed",
            "max-h-[200px]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        />

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Voice Button (placeholder) */}
          <button
            type="button"
            className={cn(
              "p-2 rounded-lg transition-all duration-150",
              "text-white/40 hover:text-white/70 hover:bg-white/10",
              "disabled:opacity-30 disabled:cursor-not-allowed"
            )}
            disabled={disabled}
            title="Voice input"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>

          {/* Image Button (placeholder) */}
          <button
            type="button"
            className={cn(
              "p-2 rounded-lg transition-all duration-150",
              "text-white/40 hover:text-white/70 hover:bg-white/10",
              "disabled:opacity-30 disabled:cursor-not-allowed"
            )}
            disabled={disabled}
            title="Attach image"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

          {/* Send/Stop Button */}
          {isGenerating ? (
            <button
              type="button"
              onClick={onStop}
              className={cn(
                "p-2.5 rounded-xl transition-all duration-150",
                "bg-danger/80 hover:bg-danger text-white",
                "shadow-md shadow-danger/25"
              )}
              title="Stop generating"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={disabled || !content.trim()}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-150",
                "font-medium text-sm",
                content.trim() && !disabled
                  ? "bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/25 hover:shadow-lg hover:from-primary-400 hover:to-primary-500"
                  : "bg-white/10 text-white/40 cursor-not-allowed"
              )}
            >
              Send
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}