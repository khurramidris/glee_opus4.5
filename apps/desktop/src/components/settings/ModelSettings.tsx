import { useState } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { useModelStatus } from '@/hooks/useModelStatus';
import { useUIStore } from '@/stores/uiStore';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

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

  const currentStatus = statusConfig[status] || statusConfig.not_found;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-surface-100 mb-2">Model Settings</h2>
        <p className="text-surface-400 text-sm">
          Configure and manage the AI model.
        </p>
      </div>

      {/* Current Model Status */}
      <Card>
        <h3 className="text-sm font-medium text-surface-300 mb-4">Model Status</h3>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {isLoading ? (
              <Spinner size="sm" />
            ) : (
              <Badge variant={currentStatus.color}>{currentStatus.label}</Badge>
            )}
            {modelPath && (
              <span className="text-sm text-surface-400 truncate max-w-xs">
                {modelPath.split('/').pop()}
              </span>
            )}
          </div>
          
          <div className="flex gap-2">
            {isLoaded ? (
              <Button variant="secondary" onClick={handleStopModel} disabled={isLoading}>
                Unload Model
              </Button>
            ) : (
              <Button onClick={handleStartModel} disabled={isLoading || !modelPath}>
                Load Model
              </Button>
            )}
          </div>
        </div>

        {!modelPath && (
          <p className="text-sm text-surface-500">
            No model file found. Place a GGUF model file in the models directory or use the download feature.
          </p>
        )}
      </Card>

      {/* GPU Settings */}
      <Card>
        <h3 className="text-sm font-medium text-surface-300 mb-4">GPU Acceleration</h3>
        
        <div className="space-y-4">
          <Input
            label="GPU Layers"
            type="number"
            min={0}
            max={100}
            value={gpuLayers}
            onChange={(e) => setGpuLayers(parseInt(e.target.value) || 0)}
          />
          <p className="text-xs text-surface-500">
            Number of model layers to offload to GPU. Set to 0 for CPU only, 
            99+ for full GPU offload. Requires model reload to take effect.
          </p>

          <Button variant="secondary" onClick={handleSaveGpuLayers} isLoading={isSaving}>
            Save GPU Settings
          </Button>
        </div>
      </Card>

      {/* Model Info */}
      <Card>
        <h3 className="text-sm font-medium text-surface-300 mb-4">Recommended Models</h3>
        
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-surface-400">For 8GB RAM:</span>
            <span className="text-surface-200">Llama 3.2 3B Q4_K_M (~2.5GB)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-surface-400">For 16GB RAM:</span>
            <span className="text-surface-200">Llama 3.1 8B Q4_K_M (~4.5GB)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-surface-400">For 32GB RAM:</span>
            <span className="text-surface-200">Llama 3.1 8B Q8_0 (~8GB)</span>
          </div>
        </div>
        
        <p className="text-xs text-surface-500 mt-4">
          Place .gguf model files in the models folder within the app data directory.
        </p>
      </Card>
    </div>
  );
}
