import { Avatar } from '@/components/ui/Avatar';

interface TypingIndicatorProps {
  characterName: string;
  onStop: () => void;
}

export function TypingIndicator({ characterName, onStop: _onStop }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-3">
      <Avatar
        fallback={characterName}
        size="md"
        className="bg-gradient-to-br from-primary-500 to-primary-700 ring-2 ring-primary-300/50"
      />
      <div className="bg-surface-100 text-surface-800 px-4 py-2.5 rounded-2xl rounded-tl-sm shadow-sm border border-surface-200">
        <span className="text-sm font-medium">{characterName} is typing</span>
        <span className="inline-flex ml-1.5">
          <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce ml-0.5" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce ml-0.5" style={{ animationDelay: '300ms' }} />
        </span>
      </div>
    </div>
  );
}