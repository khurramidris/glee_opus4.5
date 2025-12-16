import { useModelStatus } from '@/hooks/useModelStatus';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';

export function StatusBar() {
  const { status, modelPath } = useModelStatus();

  const statusConfig = {
    loading: {
      dotClass: 'bg-amber-400 animate-pulse',
      textClass: 'text-amber-400',
      label: 'Loading model...',
    },
    ready: {
      dotClass: 'bg-emerald-400',
      textClass: 'text-emerald-400',
      label: 'Model ready',
    },
    error: {
      dotClass: 'bg-red-400',
      textClass: 'text-red-400',
      label: 'Model error',
    },
    not_found: {
      dotClass: 'bg-surface-400',
      textClass: 'text-surface-500',
      label: 'No model loaded',
    },
    not_loaded: {
      dotClass: 'bg-surface-400',
      textClass: 'text-surface-500',
      label: 'Model not loaded',
    },
  };

  const config = statusConfig[status] || statusConfig.not_found;

  // Get just the filename from path
  const modelName = modelPath ? modelPath.split(/[/\\]/).pop() : null;

  return (
    <footer className={cn(
      "h-8 flex items-center justify-between px-4",
      "border-t border-surface-200/50",
      "bg-surface-50/80 backdrop-blur-sm",
      "text-xs"
    )}>
      <div className="flex items-center gap-4">
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          {status === 'loading' ? (
            <Spinner size="sm" className={config.textClass} />
          ) : (
            <span className={cn('w-1.5 h-1.5 rounded-full', config.dotClass)} />
          )}
          <span className={cn('font-medium', config.textClass)}>
            {config.label}
          </span>
        </div>

        {/* Model name */}
        {modelName && (
          <span className="text-surface-400 truncate max-w-xs font-mono text-[11px]">
            {modelName}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 text-surface-400">
        <span className="font-medium">v0.1.0</span>
      </div>
    </footer>
  );
}
