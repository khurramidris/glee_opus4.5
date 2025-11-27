import { useState, useCallback } from 'react';
import type { Message } from '@/types';
import { commands } from '@/lib/commands';

export function useBranching(messageId: string) {
  const [siblings, setSiblings] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const loadSiblings = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await commands.getBranchSiblings(messageId);
      setSiblings(result);
    } finally {
      setIsLoading(false);
    }
  }, [messageId]);
  
  const switchToBranch = useCallback(async (targetMessageId: string) => {
    await commands.switchBranch(targetMessageId);
  }, []);
  
  const currentIndex = siblings.findIndex((m) => m.id === messageId);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < siblings.length - 1;
  
  const goToPrevious = useCallback(async () => {
    if (hasPrevious) {
      await switchToBranch(siblings[currentIndex - 1].id);
    }
  }, [hasPrevious, currentIndex, siblings, switchToBranch]);
  
  const goToNext = useCallback(async () => {
    if (hasNext) {
      await switchToBranch(siblings[currentIndex + 1].id);
    }
  }, [hasNext, currentIndex, siblings, switchToBranch]);
  
  return {
    siblings,
    currentIndex,
    hasPrevious,
    hasNext,
    goToPrevious,
    goToNext,
    loadSiblings,
    isLoading,
  };
}
