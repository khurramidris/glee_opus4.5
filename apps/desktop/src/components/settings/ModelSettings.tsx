import { useState } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { useModelStatus } from '@/hooks/useModelStatus';
import { useUIStore } from '@/stores/uiStore';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { open } from '@tauri-apps/plugin-dialog';
import { cn } from '@/lib/utils';

export function ModelSettings() {
  const { settings, updateSetting, fetchSettings } = useSettings();
  const { status, isLoaded, modelPath, startSidecar, stopSidecar, isLoading } = useModelStatus();
  const { addToast } = useUIStore();

  const [gpuLayers, setGpuLayers] = useState(settings?.model.gpuLayers ?? 99);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveGpuLayers = async () => {
    setIsSaving(true);
    try {
      await updateSetting('model.gpu_layers', gpuLayers.toString());
      await fetchSettings();
      addToast({ type: 'success', message: 'GPU layers setting saved!' });
    } catch (e) {
      addToast({ type: 'error', message: `Failed to save: ${e}` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBrowse = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'GGUF Models', extensions: ['gguf'] }],
      });

      if (selected && typeof selected === 'string') {
        await updateSetting('model.path', selected);
        await fetchSettings();
        addToast({ type: 'success', message: 'Model path updated. Click Load Model.' });
      }
    } catch (e) {
      addToast({ type: 'error', message: `Failed to select model: ${e}` });
    }
  };

  const handleStartModel = async () => {
    try {
      await startSidecar();
      addToast({ type: 'success', message: 'Model loaded successfully!' });
    } catch (e) {
      addToast({ type: 'error', message: `Failed to load model: ${e}` });
    }
  };

  const handleStopModel = async () => {
    try {
      await stopSidecar();
      addToast({ type: 'info', message: 'Model unloaded' });
    } catch (e) {
      addToast({ type: 'error', message: `Failed to unload model: ${e}` });
    }
  };

  const statusConfig = {
    loading: { variant: 'warning' as const, label: 'Loading...', dot: true },
    ready: { variant: 'success' as const, label: 'Ready', dot: true },
    error: { variant: 'danger' as const, label: 'Error', dot: true },
    not_found: { variant: 'default' as const, label: 'Not Loaded', dot: false },
  };

  const currentStatus = statusConfig[status as keyof typeof statusConfig] || statusConfig.not_found;

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div>
        <h2 className="text-xl font-semibold text-surface-900 font-display">Model Settings</h2>
        <p className="text-surface-500 text-sm mt-1">
          Configure and manage the AI model for character conversations.
        </p>
      </div>

      {/* Current Model Status */}
      <Card padding="lg">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-surface-800">Model Status</h3>
            <div className="flex items-center gap-3">
              {isLoading ? (
                <Spinner size="sm" />
              ) : (
                <Badge variant={currentStatus.variant} dot={currentStatus.dot}>
                  {currentStatus.label}
                </Badge>
              )}

              {isLoaded ? (
                <Button variant="secondary" size="sm" onClick={handleStopModel} disabled={isLoading}>
                  Unload Model
                </Button>
              ) : (
                <Button size="sm" onClick={handleStartModel} disabled={isLoading}>
                  Load Model
                </Button>
              )}
            </div>
          </div>

          {/* Path Display & Change Button */}
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-lg",
            "bg-surface-100 border border-surface-200"
          )}>
            <div className="flex-1 text-sm text-surface-600 font-mono truncate">
              {modelPath || settings?.model.path || "No model selected"}
            </div>
            <Button size="sm" variant="secondary" onClick={handleBrowse}>
              Change
            </Button>
          </div>
        </div>
      </Card>

      {/* GPU Settings */}
      <Card padding="lg">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-surface-800">GPU Acceleration</h3>
            <p className="text-xs text-surface-500 mt-0.5">
              Set the number of layers to offload to GPU for faster inference.
            </p>
          </div>

          <Input
            label="GPU Layers"
            type="number"
            min={0}
            max={100}
            value={gpuLayers}
            onChange={(e) => setGpuLayers(parseInt(e.target.value) || 0)}
            hint="Higher values use more GPU memory but improve speed. Use 0 for CPU-only."
          />

          <div className="flex justify-end">
            <Button variant="secondary" onClick={handleSaveGpuLayers} isLoading={isSaving}>
              Save GPU Settings
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}