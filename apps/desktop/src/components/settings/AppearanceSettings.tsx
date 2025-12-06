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

  // Apply theme immediately for preview
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark', 'theme-system');

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
    } else {
      root.classList.add(`theme-${theme}`);
    }
  }, [theme]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Just save string directly, backend handles quotes if needed or frontend sends raw string
      await updateSetting('app.theme', theme);
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
    { id: 'light', label: 'Light', description: 'Clean light theme' },
    { id: 'system', label: 'System', description: 'Match system preference' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-surface-900 mb-2">Appearance</h2>
        <p className="text-surface-500 text-sm">
          Customize how Glee looks.
        </p>
      </div>

      <Card>
        <h3 className="text-sm font-medium text-surface-700 mb-4">Theme</h3>

        <div className="grid grid-cols-3 gap-3">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={cn(
                'p-4 rounded-lg border text-left transition-colors',
                theme === t.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-surface-200 hover:border-surface-300'
              )}
            >
              <p className={cn("font-medium", theme === t.id ? "text-primary-700" : "text-surface-900")}>{t.label}</p>
              <p className={cn("text-xs mt-1", theme === t.id ? "text-primary-600" : "text-surface-500")}>{t.description}</p>
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
        <h3 className="text-sm font-medium text-surface-700 mb-4">Preview</h3>

        <div className="bg-surface-100 rounded-lg p-4 space-y-3 border border-surface-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shrink-0" />
            <div>
              <p className="font-medium text-surface-900">Character Name</p>
              <p className="text-sm text-surface-600">Sample message preview for the selected theme.</p>
            </div>
          </div>
          <div className="flex justify-end">
            <div className="bg-primary-500 text-white px-4 py-2 rounded-2xl rounded-br-md shadow-sm">
              Your message
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}