import { Avatar } from '@/components/ui/Avatar';
import { parseResponse } from '@/lib/utils';

interface StreamingMessageProps {
  content: string;
  characterName?: string;
}

export function StreamingMessage({
  content,
  characterName = 'AI',
}: StreamingMessageProps) {
  return (
    <div className="flex gap-4 py-4 w-full animate-fade-in">
      <Avatar
        fallback={characterName}
        size="md"
        className="flex-shrink-0 ring-2 ring-primary-500/30 glow-primary-sm"
      />

      <div className="flex flex-col max-w-[75%] items-start">
        <div className="relative bubble-ai">
          <div className="text-xs font-semibold mb-2 text-primary-400">
            {characterName}
          </div>
          <p className="whitespace-pre-wrap break-words leading-relaxed">
            {parseResponse(content)}
            <span className="inline-block w-2 h-4 ml-1 align-middle bg-primary-500 animate-blink rounded-sm" />
          </p>
        </div>
      </div>
    </div>
  );
}