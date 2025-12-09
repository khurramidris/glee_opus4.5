import { useEffect, useRef, useState } from 'react';
import { useDownload } from '@/hooks/useDownload';
import { useUIStore } from '@/stores/uiStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { formatBytes, formatSpeed } from '@/lib/format';

// Placeholder URLs - in production these would come from config/env
// Placeholder URLs - in production these would come from config/env
// Production R2 URLs
// Base: https://pub-bd4eb9ce19dd48f1b73327a44e10e493.r2.dev
const BINARY_URLS = {
  cuda: "https://pub-bd4eb9ce19dd48f1b73327a44e10e493.r2.dev/bin/llama-cuda.zip",
  rocm: "https://pub-bd4eb9ce19dd48f1b73327a44e10e493.r2.dev/bin/llama-rocm.zip",
  cpu: "https://pub-bd4eb9ce19dd48f1b73327a44e10e493.r2.dev/bin/llama-cpu.zip",
};

const MODEL_URL = "https://pub-bd4eb9ce19dd48f1b73327a44e10e493.r2.dev/models/tiny-llm.gguf";

interface DownloadProgressProps {
  variant: string;
  onComplete: () => void;
  onSkip: () => void;
}

export function DownloadProgress({ variant, onComplete, onSkip }: DownloadProgressProps) {
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

  const [phase, setPhase] = useState<'binary' | 'model'>('binary');
  const downloadInitiated = useRef(false);

  useEffect(() => {
    if (!downloadInitiated.current) {
      downloadInitiated.current = true;
      startBinaryDownload();
    }
  }, []);

  const startBinaryDownload = async () => {
    setPhase('binary');
    const url = BINARY_URLS[variant as keyof typeof BINARY_URLS] || BINARY_URLS.cpu;
    // Note: The backend needs to know we are downloading a binary to put it in valid bin dir
    // For now we reuse the startDownload which likely just puts it in default download dir
    // We might need to extend startDownload input to specify 'target_dir' or 'type'

    // Assuming startDownload works generically for now:
    try {
      await startDownload({ url, downloadType: 'binary' });
    } catch (e) {
      addToast({ type: 'error', message: `Failed to download engine: ${e}` });
    }
  };

  const startModelDownload = async () => {
    setPhase('model');
    try {
      await startDownload({ url: MODEL_URL, downloadType: 'model' });
    } catch (e) {
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
    <div className="min-h-screen flex items-center justify-center bg-surface-50 p-8">
      <Card className="max-w-lg w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-surface-900 mb-2">
            {phase === 'binary' ? 'Setting up Engine' : 'Downloading Brain'}
          </h1>
          <p className="text-surface-600">
            {phase === 'binary'
              ? `Installing optimized AI engine for your ${variant.toUpperCase()}...`
              : 'Downloading the AI model (approx 2.5GB)...'}
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
              <span className="text-surface-600">
                {phase === 'binary' ? 'Downloading Engine...' : 'Downloading Model...'}
              </span>
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

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-6 text-sm">
          <span className={phase === 'binary' ? "font-bold text-primary-600" : "text-surface-400"}>1. Engine</span>
          <span className="text-surface-300">→</span>
          <span className={phase === 'model' ? "font-bold text-primary-600" : "text-surface-400"}>2. Model</span>
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
      </Card>
    </div>
  );
}