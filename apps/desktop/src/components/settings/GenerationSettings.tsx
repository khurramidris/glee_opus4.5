import { useState, useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { useUIStore } from '@/stores/uiStore';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { GENERATION_DEFAULTS } from '@/lib/constants';
import { commands } from '@/lib/commands';

export function GenerationSettings() {
  const { settings, fetchSettings } = useSettings();
  const { addToast } = useUIStore();

  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<{
    temperature: number;
    maxTokens: number;
    topP: number;
    contextSize: number;
  }>({
    temperature: GENERATION_DEFAULTS.temperature,
    maxTokens: GENERATION_DEFAULTS.maxTokens,
    topP: GENERATION_DEFAULTS.topP,
    contextSize: GENERATION_DEFAULTS.contextSize,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        temperature: settings.generation.temperature,
        maxTokens: settings.generation.maxTokens,
        topP: settings.generation.topP,
        contextSize: settings.generation.contextSize,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await commands.updateSettingsBatch([
        ['generation.temperature', formData.temperature.toString()],
        ['generation.max_tokens', formData.maxTokens.toString()],
        ['generation.top_p', formData.topP.toString()],
        ['generation.context_size', formData.contextSize.toString()]
      ]);

      await fetchSettings();
      addToast({ type: 'success', message: 'Settings saved!' });
    } catch (e) {
      addToast({ type: 'error', message: `Failed to save settings: ${e}` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFormData({
      temperature: GENERATION_DEFAULTS.temperature,
      maxTokens: GENERATION_DEFAULTS.maxTokens,
      topP: GENERATION_DEFAULTS.topP,
      contextSize: GENERATION_DEFAULTS.contextSize,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-surface-900 mb-2">Generation Settings</h2>
        <p className="text-surface-500 text-sm">
          Configure how the AI generates responses.
        </p>
      </div>

      <Card>
        <div className="space-y-6">
          {/* Temperature */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-surface-700">
                Temperature
              </label>
              <span className="text-sm text-surface-700">{formData.temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={formData.temperature}
              onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
              className="w-full accent-primary-500 h-2 bg-surface-200 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-surface-500 mt-1">
              Higher values make output more random, lower values more deterministic.
            </p>
          </div>

          {/* Max Tokens */}
          <Input
            label="Max Response Tokens"
            type="number"
            min={64}
            max={4096}
            value={formData.maxTokens}
            onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) || 512 })}
          />
          <p className="text-xs text-surface-500 -mt-4">
            Maximum length of generated responses. ~4 characters per token.
          </p>

          {/* Top P */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-surface-700">
                Top P (Nucleus Sampling)
              </label>
              <span className="text-sm text-surface-700">{formData.topP}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={formData.topP}
              onChange={(e) => setFormData({ ...formData, topP: parseFloat(e.target.value) })}
              className="w-full accent-primary-500 h-2 bg-surface-200 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-surface-500 mt-1">
              Consider only tokens with cumulative probability above this threshold.
            </p>
          </div>

          {/* Context Size */}
          <Input
            label="Context Size"
            type="number"
            min={1024}
            max={32768}
            step={1024}
            value={formData.contextSize}
            onChange={(e) => setFormData({ ...formData, contextSize: parseInt(e.target.value) || 8192 })}
          />
          <p className="text-xs text-surface-500 -mt-4">
            Maximum context window size. Larger values use more memory (RAM/VRAM).
          </p>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-surface-200">
          <Button variant="secondary" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} isLoading={isSaving}>
            Save Changes
          </Button>
        </div>
      </Card>
    </div>
  );
}