import { useEffect, useRef, useState } from 'react';
import { useDownload } from '@/hooks/useDownload';
import { useUIStore } from '@/stores/uiStore';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { formatBytes, formatSpeed } from '@/lib/format';
import { getBinaryUrl, getModelUrl } from '@/config/downloads';
import type { SetupStatus } from '@/hooks/useSmartSetup';

interface DownloadProgressProps {
  status: SetupStatus | null;
  onComplete: () => void;
  onSkip: () => void;
}

export function DownloadProgress({ status, onComplete, onSkip }: DownloadProgressProps) {
  const {
    currentDownload,
    progress,
    isDownloading,
    isVerifying,
    error,
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    setComplete,
  } = useDownload();
  const { addToast } = useUIStore();

  const [phase, setPhase] = useState<'binary' | 'model'>('binary');
  const downloadInitiated = useRef(false);

  useEffect(() => {
    if (!downloadInitiated.current) {
      downloadInitiated.current = true;

      if (status?.missing_binary === false) {
        console.log('[DownloadProgress] Binary already present, skipping to model');
        startModelDownload();
      } else {
        startBinaryDownload();
      }
    }
  }, []);

  const startBinaryDownload = async () => {
    setPhase('binary');
    const variant = status?.recommended_variant || 'cpu';
    // Use config helper to get the correct URL for the variant
    const validVariant = (variant === 'cuda' || variant === 'rocm' || variant === 'cpu') ? variant : 'cpu';
    const url = getBinaryUrl(validVariant);

    console.log('[DownloadProgress] Starting binary download');
    console.log('[DownloadProgress] Variant received:', variant);
    console.log('[DownloadProgress] Valid variant used:', validVariant);
    console.log('[DownloadProgress] Download URL:', url);

    try {
      await startDownload({ url, downloadType: 'binary' });
      console.log('[DownloadProgress] Binary download started successfully');
    } catch (e) {
      console.error('[DownloadProgress] Binary download failed:', e);
      addToast({ type: 'error', message: `Failed to download engine: ${e}` });
    }
  };

  const startModelDownload = async () => {
    setPhase('model');
    const url = getModelUrl();

    console.log('[DownloadProgress] Starting model download');
    console.log('[DownloadProgress] Model URL:', url);

    try {
      await startDownload({ url, downloadType: 'model' });
      console.log('[DownloadProgress] Model download started successfully');
    } catch (e) {
      console.error('[DownloadProgress] Model download failed:', e);
      addToast({ type: 'error', message: `Failed to download model: ${e}` });
    }
  };

  useEffect(() => {
    if (currentDownload?.status === 'completed') {
      if (phase === 'binary') {
        // Binary done, start model
        // Small delay for UX
        setTimeout(() => {
          startModelDownload();
        }, 1000);
      } else {
        // Model done, all done
        setComplete();
        onComplete();
      }
    }
  }, [currentDownload?.status]);

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
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-lg w-full panel rounded-2xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-2 font-display">
            {phase === 'binary' ? 'Setting up Engine' : 'Downloading Brain'}
          </h1>
          <p className="text-white/60">
            {phase === 'binary'
              ? `Installing optimized AI engine for your ${(status?.recommended_variant || 'CPU').toUpperCase()}...`
              : 'Downloading the AI model...'}
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-4 mb-6">
          <Progress value={percentage} size="lg" showLabel />

          {progress && (
            <div className="flex justify-between text-sm text-white/50">
              <span>
                {formatBytes(progress.downloadedBytes)} / {formatBytes(progress.totalBytes)}
              </span>
              <span>{formatSpeed(progress.speedBps)}</span>
            </div>
          )}

          {error && (
            <div className="text-center space-y-3">
              <p className="text-sm text-red-400">{error}</p>
              {!isDownloading && (
                <Button
                  variant="primary"
                  onClick={() => {
                    phase === 'binary' ? startBinaryDownload() : startModelDownload();
                  }}
                  className="w-full"
                >
                  Retry Download
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Status */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {isDownloading ? (
            <>
              <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
              <span className="text-white/60">
                {phase === 'binary' ? 'Downloading Engine...' : 'Downloading Model...'}
              </span>
            </>
          ) : isVerifying ? (
            <>
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-spin" />
              <span className="text-white/60">Verifying Download...</span>
            </>
          ) : currentDownload?.status === 'paused' ? (
            <>
              <div className="w-2 h-2 bg-white/50 rounded-full" />
              <span className="text-white/60">Paused</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-white/30 rounded-full" />
              <span className="text-white/40">Waiting...</span>
            </>
          )}
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-6 text-sm">
          <span className={phase === 'binary' ? "font-bold text-primary-400" : "text-white/40"}>1. Engine</span>
          <span className="text-white/30">→</span>
          <span className={phase === 'model' ? "font-bold text-primary-400" : "text-white/40"}>2. Model</span>
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
      </div>
    </div>
  );
}