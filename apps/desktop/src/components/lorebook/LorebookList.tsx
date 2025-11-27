import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLorebooks } from '@/hooks/useLorebooks';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Toggle } from '@/components/ui/Toggle';
import { Spinner } from '@/components/ui/Spinner';
import { useUIStore } from '@/stores/uiStore';
import type { CreateLorebookInput } from '@/types';

export function LorebookList() {
  const navigate = useNavigate();
  const { lorebooks, isLoading, createLorebook, deleteLorebook } = useLorebooks();
  const { addToast } = useUIStore();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateLorebookInput>({
    name: '',
    description: '',
    isGlobal: false,
  });

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      addToast({ type: 'error', message: 'Name is required' });
      return;
    }

    setIsSubmitting(true);
    try {
      const lorebook = await createLorebook(formData);
      addToast({ type: 'success', message: 'Lorebook created!' });
      setShowCreateModal(false);
      setFormData({ name: '', description: '', isGlobal: false });
      navigate(`/lorebooks/${lorebook.id}`);
    } catch (e) {
      addToast({ type: 'error', message: `Failed to create lorebook: ${e}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteLorebook(id);
    setDeleteConfirm(null);
    addToast({ type: 'success', message: 'Lorebook deleted' });
  };

  if (isLoading) {
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
        <div>
          <h2 className="text-lg font-semibold text-surface-100">Lorebooks</h2>
          <p className="text-sm text-surface-400">
            World-building knowledge that gets injected into conversations
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Lorebook
        </Button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4">
        {lorebooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 mb-4 text-surface-600">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-surface-300 mb-2">
              No lorebooks yet
            </h3>
            <p className="text-surface-500 mb-4 max-w-md">
              Lorebooks contain world-building information that gets automatically
              injected into conversations when keywords are detected.
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              Create Lorebook
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lorebooks.map((lorebook) => (
              <Card
                key={lorebook.id}
                padding="none"
                hoverable
                onClick={() => navigate(`/lorebooks/${lorebook.id}`)}
                className="cursor-pointer"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-surface-100">
                      {lorebook.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      {lorebook.isGlobal && (
                        <Badge variant="primary" size="sm">Global</Badge>
                      )}
                      {!lorebook.isEnabled && (
                        <Badge variant="warning" size="sm">Disabled</Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-surface-400 line-clamp-2 mb-3">
                    {lorebook.description || 'No description'}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-surface-500">
                    <span>{lorebook.entries.length} entries</span>
                  </div>
                </div>
                
                <div className="flex border-t border-surface-700">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/lorebooks/${lorebook.id}`);
                    }}
                    className="flex-1 px-4 py-2.5 text-sm text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-colors"
                  >
                    Edit
                  </button>
                  <div className="w-px bg-surface-700" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(lorebook.id);
                    }}
                    className="px-4 py-2.5 text-surface-400 hover:text-red-400 hover:bg-surface-700 transition-colors"
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

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Lorebook"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            placeholder="Lorebook name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <TextArea
            label="Description"
            placeholder="What is this lorebook about?"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
          />
          <Toggle
            checked={formData.isGlobal || false}
            onChange={(checked) => setFormData({ ...formData, isGlobal: checked })}
            label="Global lorebook (applies to all conversations)"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} isLoading={isSubmitting}>
              Create
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Lorebook"
        size="sm"
      >
        <p className="text-surface-300 mb-6">
          Are you sure you want to delete this lorebook? All entries will be lost.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
