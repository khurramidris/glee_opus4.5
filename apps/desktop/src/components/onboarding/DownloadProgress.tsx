import { useEffect, useRef } from 'react';
import { useDownload } from '@/hooks/useDownload';
import { useUIStore } from '@/stores/uiStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { formatBytes, formatSpeed } from '@/lib/format';
import { DEFAULT_MODEL_URL } from '@/lib/constants';

interface DownloadProgressProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function DownloadProgress({ onComplete, onSkip }: DownloadProgressProps) {
  const {
    currentDownload,
    progress,
    isDownloading,
    error,
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    setComplete,
  } = useDownload();
  const { addToast } = useUIStore();

  // Use a ref to track if we've initiated the download to prevent React StrictMode double-fire
  const downloadInitiated = useRef(false);

  useEffect(() => {
    if (!downloadInitiated.current) {
      downloadInitiated.current = true;
      startDownload({ url: DEFAULT_MODEL_URL }).catch((e) => {
        addToast({ type: 'error', message: `Failed to start download: ${e}` });
      });
    }
  }, [startDownload, addToast]);

  useEffect(() => {
    if (currentDownload?.status === 'completed') {
      setComplete();
      onComplete();
    }
  }, [currentDownload?.status, onComplete, setComplete]);

  const percentage = progress
    ? Math.round((progress.downloadedBytes / Math.max(progress.totalBytes, 1)) * 100)
    : 0;

  const handlePauseResume = () => {
    if (isDownloading) {
      pauseDownload();
    } else {
      resumeDownload();
    }
  };

  const handleCancel = () => {
    cancelDownload();
    onSkip();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 p-8">
      <Card className="max-w-lg w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-surface-900 mb-2">
            Downloading AI Model
          </h1>
          <p className="text-surface-600">
            This is a one-time download. Glee works offline after this.
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-4 mb-6">
          <Progress value={percentage} size="lg" showLabel />

          {progress && (
            <div className="flex justify-between text-sm text-surface-500">
              <span>
                {formatBytes(progress.downloadedBytes)} / {formatBytes(progress.totalBytes)}
              </span>
              <span>{formatSpeed(progress.speedBps)}</span>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}
        </div>

        {/* Status */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {isDownloading ? (
            <>
              <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
              <span className="text-surface-600">Downloading...</span>
            </>
          ) : currentDownload?.status === 'paused' ? (
            <>
              <div className="w-2 h-2 bg-yellow-400 rounded-full" />
              <span className="text-surface-600">Paused</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-surface-300 rounded-full" />
              <span className="text-surface-400">Waiting...</span>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={handlePauseResume}
            className="flex-1"
          >
            {isDownloading ? 'Pause' : 'Resume'}
          </Button>
        </div>

        {/* Tips */}
        <div className="mt-6 p-4 bg-surface-100 rounded-lg border border-surface-200">
          <h4 className="text-sm font-medium text-surface-700 mb-2">While you wait...</h4>
          <ul className="text-sm text-surface-500 space-y-1">
            <li>• The download will resume if interrupted</li>
            <li>• You can browse characters while downloading</li>
            <li>• Larger models = better quality but slower</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}