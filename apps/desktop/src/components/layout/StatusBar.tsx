import { useModelStatus } from '@/hooks/useModelStatus';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';

export function StatusBar() {
  const { status, modelPath } = useModelStatus();

  const statusConfig = {
    loading: {
      color: 'text-amber-600',
      bg: 'bg-amber-500',
      label: 'Loading model...',
    },
    ready: {
      color: 'text-emerald-600',
      bg: 'bg-emerald-500',
      label: 'Model ready',
    },
    error: {
      color: 'text-red-600',
      bg: 'bg-red-500',
      label: 'Model error',
    },
    not_found: {
      color: 'text-surface-500',
      bg: 'bg-surface-400',
      label: 'No model loaded',
    },
    not_loaded: {
      color: 'text-surface-500',
      bg: 'bg-surface-400',
      label: 'Model not loaded',
    },
  };

  const config = statusConfig[status] || statusConfig.not_found;

  return (
    <footer className="h-8 flex items-center justify-between px-4 border-t border-surface-200 bg-surface-50 text-xs">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {status === 'loading' ? (
            <Spinner size="sm" className={config.color} />
          ) : (
            <span className={cn('w-2 h-2 rounded-full', config.bg)} />
          )}
          <span className={config.color}>{config.label}</span>
        </div>

        {modelPath && (
          <span className="text-surface-500 truncate max-w-xs">
            {modelPath.split('/').pop()}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 text-surface-500">
        <span>v0.1.0</span>
      </div>
    </footer>
  );
}
