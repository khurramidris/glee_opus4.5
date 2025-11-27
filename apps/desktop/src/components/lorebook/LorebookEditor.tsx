import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLorebook } from '@/hooks/useLorebooks';
import { useLorebookStore } from '@/stores/lorebookStore';
import { useUIStore } from '@/stores/uiStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Toggle } from '@/components/ui/Toggle';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { EntryEditor } from './EntryEditor';
import type { LorebookEntry, UpdateLorebookInput } from '@/types';

export function LorebookEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lorebook, isLoading } = useLorebook(id!);
  const { updateLorebook, createEntry, deleteEntry } = useLorebookStore();
  const { addToast } = useUIStore();

  const [formData, setFormData] = useState<UpdateLorebookInput>({});
  const [showEntryEditor, setShowEntryEditor] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LorebookEntry | null>(null);
  const [deleteEntryConfirm, setDeleteEntryConfirm] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (lorebook) {
      setFormData({
        name: lorebook.name,
        description: lorebook.description,
        isGlobal: lorebook.isGlobal,
        isEnabled: lorebook.isEnabled,
      });
    }
  }, [lorebook]);

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      addToast({ type: 'error', message: 'Name is required' });
      return;
    }

    setIsSaving(true);
    try {
      await updateLorebook(id!, formData);
      addToast({ type: 'success', message: 'Lorebook saved!' });
    } catch (e) {
      addToast({ type: 'error', message: `Failed to save: ${e}` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditEntry = (entry: LorebookEntry) => {
    setEditingEntry(entry);
    setShowEntryEditor(true);
  };

  const handleCreateEntry = () => {
    setEditingEntry(null);
    setShowEntryEditor(true);
  };

  const handleDeleteEntry = async (entryId: string) => {
    await deleteEntry(entryId, id!);
    setDeleteEntryConfirm(null);
    addToast({ type: 'success', message: 'Entry deleted' });
  };

  if (isLoading || !lorebook) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-surface-700">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/lorebooks')}
            className="p-2 text-surface-400 hover:text-surface-100 hover:bg-surface-700 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="text-lg font-semibold text-surface-100">{lorebook.name}</h2>
            <p className="text-sm text-surface-400">
              {lorebook.entries.length} entries
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleCreateEntry}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Entry
          </Button>
          <Button onClick={handleSave} isLoading={isSaving}>
            Save Changes
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Lorebook Settings */}
          <Card>
            <h3 className="text-sm font-medium text-surface-300 mb-4">Settings</h3>
            <div className="space-y-4">
              <Input
                label="Name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <TextArea
                label="Description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
              <div className="flex gap-6">
                <Toggle
                  checked={formData.isEnabled ?? true}
                  onChange={(checked) => setFormData({ ...formData, isEnabled: checked })}
                  label="Enabled"
                />
                <Toggle
                  checked={formData.isGlobal ?? false}
                  onChange={(checked) => setFormData({ ...formData, isGlobal: checked })}
                  label="Global (all conversations)"
                />
              </div>
            </div>
          </Card>

          {/* Entries */}
          <div>
            <h3 className="text-sm font-medium text-surface-300 mb-3">Entries</h3>
            {lorebook.entries.length === 0 ? (
              <Card className="text-center py-8">
                <p className="text-surface-400 mb-4">No entries yet</p>
                <Button variant="secondary" onClick={handleCreateEntry}>
                  Create First Entry
                </Button>
              </Card>
            ) : (
              <div className="space-y-2">
                {lorebook.entries
                  .sort((a, b) => b.priority - a.priority)
                  .map((entry) => (
                    <Card
                      key={entry.id}
                      padding="sm"
                      hoverable
                      onClick={() => handleEditEntry(entry)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-surface-100">
                              {entry.name || 'Unnamed Entry'}
                            </h4>
                            <Badge size="sm">P{entry.priority}</Badge>
                            {!entry.isEnabled && (
                              <Badge variant="warning" size="sm">Disabled</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {entry.keywords.slice(0, 5).map((kw) => (
                              <span
                                key={kw}
                                className="px-2 py-0.5 bg-surface-700 text-surface-300 rounded text-xs"
                              >
                                {kw}
                              </span>
                            ))}
                            {entry.keywords.length > 5 && (
                              <span className="px-2 py-0.5 text-surface-500 text-xs">
                                +{entry.keywords.length - 5} more
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-surface-400 line-clamp-2">
                            {entry.content}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteEntryConfirm(entry.id);
                          }}
                          className="p-2 text-surface-500 hover:text-red-400 rounded"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Entry Editor Modal */}
      <Modal
        isOpen={showEntryEditor}
        onClose={() => setShowEntryEditor(false)}
        title={editingEntry ? 'Edit Entry' : 'Create Entry'}
        size="lg"
      >
        <EntryEditor
          lorebookId={id!}
          entry={editingEntry}
          onClose={() => setShowEntryEditor(false)}
        />
      </Modal>

      {/* Delete Entry Confirmation */}
      <Modal
        isOpen={!!deleteEntryConfirm}
        onClose={() => setDeleteEntryConfirm(null)}
        title="Delete Entry"
        size="sm"
      >
        <p className="text-surface-300 mb-6">
          Are you sure you want to delete this entry?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteEntryConfirm(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => deleteEntryConfirm && handleDeleteEntry(deleteEntryConfirm)}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
