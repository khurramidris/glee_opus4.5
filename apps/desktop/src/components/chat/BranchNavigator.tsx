import { useState, useEffect } from 'react';
import type { Message } from '@/types';
import { cn } from '@/lib/utils';

interface BranchNavigatorProps {
  messageId: string;
  onSwitch: (messageId: string) => void;
  getSiblings: (messageId: string) => Promise<Message[]>;
}

export function BranchNavigator({
  messageId,
  onSwitch,
  getSiblings,
}: BranchNavigatorProps) {
  const [siblings, setSiblings] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    getSiblings(messageId)
      .then(setSiblings)
      .finally(() => setIsLoading(false));
  }, [messageId, getSiblings]);

  if (isLoading || siblings.length <= 1) {
    return null;
  }

  const currentIndex = siblings.findIndex((m) => m.id === messageId);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < siblings.length - 1;

  const goToPrevious = () => {
    if (hasPrevious) {
      onSwitch(siblings[currentIndex - 1].id);
    }
  };

  const goToNext = () => {
    if (hasNext) {
      onSwitch(siblings[currentIndex + 1].id);
    }
  };

  return (
    <div className="flex items-center gap-1 mb-1 text-xs text-surface-400">
      <button
        onClick={goToPrevious}
        disabled={!hasPrevious}
        className={cn(
          'p-1 rounded hover:bg-surface-700 transition-colors',
          !hasPrevious && 'opacity-30 cursor-not-allowed'
        )}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <span className="px-1 font-medium">
        {currentIndex + 1}/{siblings.length}
      </span>
      
      <button
        onClick={goToNext}
        disabled={!hasNext}
        className={cn(
          'p-1 rounded hover:bg-surface-700 transition-colors',
          !hasNext && 'opacity-30 cursor-not-allowed'
        )}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
