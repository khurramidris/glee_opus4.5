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
    loading: { color: 'warning', label: 'Loading...' },
    ready: { color: 'success', label: 'Ready' },
    error: { color: 'danger', label: 'Error' },
    not_found: { color: 'default', label: 'Not Loaded' },
  } as const;

  const currentStatus = statusConfig[status as keyof typeof statusConfig] || statusConfig.not_found;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-surface-900 mb-2">Model Settings</h2>
        <p className="text-surface-500 text-sm">
          Configure and manage the AI model.
        </p>
      </div>

      {/* Current Model Status */}
      <Card>
        <h3 className="text-sm font-medium text-surface-700 mb-4">Model Status</h3>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isLoading ? (
                <Spinner size="sm" />
              ) : (
                <Badge variant={currentStatus.color}>{currentStatus.label}</Badge>
              )}
            </div>

            <div className="flex gap-2">
              {isLoaded ? (
                <Button variant="secondary" onClick={handleStopModel} disabled={isLoading}>
                  Unload Model
                </Button>
              ) : (
                <Button onClick={handleStartModel} disabled={isLoading}>
                  Load Model
                </Button>
              )}
            </div>
          </div>

          {/* Path Display & Change Button */}
          <div className="flex items-center gap-2 p-3 bg-surface-100 rounded border border-surface-200">
            <div className="flex-1 text-sm text-surface-600 font-mono truncate">
              {modelPath || settings?.model.path || "No model selected"}
            </div>
            <Button size="sm" variant="secondary" onClick={handleBrowse}>
              Change Model
            </Button>
          </div>
        </div>
      </Card>

      {/* GPU Settings */}
      <Card>
        <h3 className="text-sm font-medium text-surface-700 mb-4">GPU Acceleration</h3>
        <div className="space-y-4">
          <Input
            label="GPU Layers"
            type="number"
            min={0}
            max={100}
            value={gpuLayers}
            onChange={(e) => setGpuLayers(parseInt(e.target.value) || 0)}
          />
          <Button variant="secondary" onClick={handleSaveGpuLayers} isLoading={isSaving}>
            Save GPU Settings
          </Button>
        </div>
      </Card>
    </div>
  );
}