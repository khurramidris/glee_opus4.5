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
    <div className="flex gap-3 py-2 w-full">
      <Avatar
        fallback={characterName}
        size="md"
        className="flex-shrink-0 bg-gradient-to-br from-amber-400 to-orange-500"
      />

      <div className="flex flex-col max-w-[65%]">
        <div className="px-4 py-2.5 rounded-2xl rounded-bl-md bg-surface-50 text-surface-800 border border-surface-200 shadow-soft">
          <p className="whitespace-pre-wrap break-words leading-relaxed">
            {content}
            <span className="inline-block w-2 h-4 ml-1 align-middle bg-primary-500 animate-blink rounded-sm" />
          </p>
        </div>
      </div>
    </div>
  );
}