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
        className="flex-shrink-0 ring-2 ring-primary-300/50 bg-gradient-to-br from-primary-500 to-primary-700"
      />

      <div className="flex flex-col max-w-[70%] items-start">
        <div className="relative px-4 py-3 shadow-sm transition-all duration-200 bg-surface-100 text-surface-800 rounded-2xl rounded-tl-sm border border-surface-200">
          <div className="text-xs font-semibold mb-1.5 text-primary-600">
            {characterName}
          </div>
          <p className="whitespace-pre-wrap break-words leading-relaxed text-sm">
            {content}
            <span className="inline-block w-2 h-4 ml-1 align-middle bg-primary-500 animate-blink rounded-sm" />
          </p>
        </div>
      </div>
    </div>
  );
}