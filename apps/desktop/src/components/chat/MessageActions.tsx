import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';

interface MessageActionsProps {
  visible: boolean;
  isUser: boolean;
  content: string;
  onEdit: () => void;
  onRegenerate: () => void;
}

export function MessageActions({
  visible,
  isUser,
  content,
  onEdit,
  onRegenerate,
}: MessageActionsProps) {
  const { addToast } = useUIStore();

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      addToast({ type: 'success', message: 'Copied to clipboard' });
    } catch (e) {
      console.error(e);
      addToast({ type: 'error', message: 'Failed to copy text' });
    }
  }, [content, addToast]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className={cn(
            'flex items-center gap-1 mt-1',
            isUser ? 'justify-end' : 'justify-start'
          )}
        >
          <button
            onClick={onEdit}
            className="p-1.5 text-surface-500 hover:text-surface-300 hover:bg-surface-700 rounded transition-colors"
            title="Edit message"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          
          {!isUser && (
            <button
              onClick={onRegenerate}
              className="p-1.5 text-surface-500 hover:text-surface-300 hover:bg-surface-700 rounded transition-colors"
              title="Regenerate response"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
          
          <button
            onClick={handleCopy}
            className="p-1.5 text-surface-500 hover:text-surface-300 hover:bg-surface-700 rounded transition-colors"
            title="Copy message"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}