import { Avatar } from '@/components/ui/Avatar';

interface StreamingMessageProps {
  content: string;
  characterName?: string;
}

export function StreamingMessage({
  content,
  characterName = 'AI',
}: StreamingMessageProps) {
  return (
    <div className="flex gap-3 py-3">
      <Avatar fallback={characterName} size="md" className="flex-shrink-0" />
      
      <div className="flex flex-col max-w-[70%]">
        <span className="text-sm font-medium text-surface-300 mb-1">
          {characterName}
        </span>
        
        <div className="px-4 py-2.5 rounded-2xl rounded-bl-md bg-surface-700 text-surface-100">
          <p className="whitespace-pre-wrap break-words">
            {content}
            <span className="inline-block w-2 h-4 ml-1 bg-primary-400 animate-pulse" />
          </p>
        </div>
      </div>
    </div>
  );
}
