import { useState } from 'react';
import { open, save } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
import { commands } from '@/lib/commands';
import { useUIStore } from '@/stores/uiStore';
import { useCharacterStore } from '@/stores/characterStore';
import { useConversationStore } from '@/stores/conversationStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

export function DataSettings() {
  const { addToast } = useUIStore();
  const { fetchCharacters } = useCharacterStore();
  const { fetchConversations } = useConversationStore();

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importFile, setImportFile] = useState<string | null>(null);

  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      const data = await commands.exportAllData();

      const filePath = await save({
        defaultPath: `glee-backup-${new Date().toISOString().split('T')[0]}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });

      if (filePath) {
        await writeTextFile(filePath, data);
        addToast({ type: 'success', message: 'Data exported successfully!' });
      }
    } catch (e) {
      addToast({ type: 'error', message: `Export failed: ${e}` });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportSelect = async () => {
    try {
      const filePath = await open({
        filters: [{ name: 'JSON', extensions: ['json'] }],
        multiple: false,
      });

      if (filePath && typeof filePath === 'string') {
        setImportFile(filePath);
        setShowImportConfirm(true);
      }
    } catch (e) {
      addToast({ type: 'error', message: `Failed to select file: ${e}` });
    }
  };

  const handleImportConfirm = async () => {
    if (!importFile) return;

    setIsImporting(true);
    try {
      const data = await readTextFile(importFile);
      const result = await commands.importData(data);

      // Refresh stores
      await fetchCharacters();
      await fetchConversations();

      addToast({ type: 'success', message: result });
      setShowImportConfirm(false);
      setImportFile(null);
    } catch (e) {
      addToast({ type: 'error', message: `Import failed: ${e}` });
    } finally {
      setIsImporting(false);
    }
  };


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-surface-100 mb-2">Data Management</h2>
        <p className="text-surface-400 text-sm">
          Export and import your data. Your data is always stored locally.
        </p>
      </div>

      {/* Export */}
      <Card>
        <h3 className="text-sm font-medium text-surface-300 mb-4">Export Data</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-surface-700/50 rounded-lg">
            <div>
              <p className="font-medium text-surface-200">Export All Data</p>
              <p className="text-sm text-surface-500">
                Characters, conversations, personas, lorebooks, and settings
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={handleExportAll}
              isLoading={isExporting}
            >
              Export
            </Button>
          </div>
        </div>
      </Card>

      {/* Import */}
      <Card>
        <h3 className="text-sm font-medium text-surface-300 mb-4">Import Data</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-surface-700/50 rounded-lg">
            <div>
              <p className="font-medium text-surface-200">Import Backup</p>
              <p className="text-sm text-surface-500">
                Restore data from a Glee backup file
              </p>
            </div>
            <Button variant="secondary" onClick={handleImportSelect}>
              Select File
            </Button>
          </div>
        </div>

        <p className="text-xs text-surface-500 mt-4">
          Importing will add to your existing data. Duplicate entries may be created.
        </p>
      </Card>

      {/* Data Location */}
      <Card>
        <h3 className="text-sm font-medium text-surface-300 mb-4">Data Location</h3>

        <p className="text-sm text-surface-400 mb-3">
          All your data is stored locally on your device. Nothing is sent to the cloud.
        </p>

        <div className="p-3 bg-surface-700/50 rounded-lg">
          <p className="text-xs text-surface-500 mb-1">Data directory:</p>
          <p className="text-sm text-surface-300 font-mono break-all">
            {/* This would be populated from app info */}
            ~/Library/Application Support/Glee (macOS)
            <br />
            %APPDATA%\Glee (Windows)
            <br />
            ~/.local/share/glee (Linux)
          </p>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-900/50">
        <h3 className="text-sm font-medium text-red-400 mb-4">Danger Zone</h3>

        <div className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg">
          <div>
            <p className="font-medium text-surface-200">Reset All Data</p>
            <p className="text-sm text-surface-500">
              Delete all characters, conversations, and settings
            </p>
          </div>
          <Button variant="danger" disabled>
            Reset (Coming Soon)
          </Button>
        </div>
      </Card>

      {/* Import Confirmation Modal */}
      <Modal
        isOpen={showImportConfirm}
        onClose={() => setShowImportConfirm(false)}
        title="Confirm Import"
        size="sm"
      >
        <p className="text-surface-300 mb-4">
          Are you sure you want to import data from this file?
        </p>
        <p className="text-sm text-surface-500 mb-6">
          This will add characters, conversations, personas, and lorebooks to your existing data.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowImportConfirm(false)}>
            Cancel
          </Button>
          <Button onClick={handleImportConfirm} isLoading={isImporting}>
            Import
          </Button>
        </div>
      </Modal>
    </div>
  );
}
