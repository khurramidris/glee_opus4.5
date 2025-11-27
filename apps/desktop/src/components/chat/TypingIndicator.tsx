import { Button } from '@/components/ui/Button';

interface TypingIndicatorProps {
  characterName: string;
  onStop: () => void;
}

export function TypingIndicator({ characterName, onStop }: TypingIndicatorProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-surface-400">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span>{characterName} is typing...</span>
      </div>
      
      <Button variant="ghost" size="sm" onClick={onStop}>
        Stop
      </Button>
    </div>
  );
}
