import { useState, useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { useUIStore } from '@/stores/uiStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export function AppearanceSettings() {
  const { settings, updateSetting, fetchSettings } = useSettings();
  const { addToast } = useUIStore();
  
  const [theme, setTheme] = useState('dark');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setTheme(settings.app.theme);
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSetting('app.theme', JSON.stringify(theme));
      await fetchSettings();
      addToast({ type: 'success', message: 'Appearance settings saved!' });
    } catch (e) {
      addToast({ type: 'error', message: `Failed to save: ${e}` });
    } finally {
      setIsSaving(false);
    }
  };

  const themes = [
    { id: 'dark', label: 'Dark', description: 'Default dark theme' },
    { id: 'light', label: 'Light', description: 'Light theme (coming soon)', disabled: true },
    { id: 'system', label: 'System', description: 'Match system preference (coming soon)', disabled: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-surface-100 mb-2">Appearance</h2>
        <p className="text-surface-400 text-sm">
          Customize how Glee looks.
        </p>
      </div>

      <Card>
        <h3 className="text-sm font-medium text-surface-300 mb-4">Theme</h3>
        
        <div className="grid grid-cols-3 gap-3">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => !t.disabled && setTheme(t.id)}
              disabled={t.disabled}
              className={cn(
                'p-4 rounded-lg border text-left transition-colors',
                theme === t.id
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-surface-600 hover:border-surface-500',
                t.disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <p className="font-medium text-surface-100">{t.label}</p>
              <p className="text-xs text-surface-500 mt-1">{t.description}</p>
            </button>
          ))}
        </div>

        <div className="flex justify-end mt-6">
          <Button onClick={handleSave} isLoading={isSaving}>
            Save Changes
          </Button>
        </div>
      </Card>

      {/* Preview */}
      <Card>
        <h3 className="text-sm font-medium text-surface-300 mb-4">Preview</h3>
        
        <div className="bg-surface-700 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-600" />
            <div>
              <p className="font-medium text-surface-100">Character Name</p>
              <p className="text-sm text-surface-400">Sample message preview</p>
            </div>
          </div>
          <div className="flex justify-end">
            <div className="bg-primary-600 text-white px-4 py-2 rounded-2xl rounded-br-md">
              Your message
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
