import { useState } from 'react';
import { usePersonas } from '@/hooks/usePersonas';
import { PersonaCard } from './PersonaCard';
import { PersonaEditor } from './PersonaEditor';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';

export function PersonaList() {
  const { personas, isLoading, deletePersona, setDefaultPersona } = usePersonas();
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleEdit = (id: string) => {
    setEditingId(id);
    setShowEditor(true);
  };

  const handleCreate = () => {
    setEditingId(null);
    setShowEditor(true);
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    await deletePersona(id);
    setDeleteConfirm(null);
  };

  const handleSetDefault = async (id: string) => {
    await setDefaultPersona(id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-surface-100">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-surface-100">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-surface-200 bg-surface-50">
        <div>
          <h2 className="text-lg font-semibold text-surface-900">Your Personas</h2>
          <p className="text-sm text-surface-500">
            Personas define who you are in conversations
          </p>
        </div>
        <Button onClick={handleCreate}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Persona
        </Button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4">
        {personas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 mb-4 text-surface-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-surface-700 mb-2">
              No personas yet
            </h3>
            <p className="text-surface-500 mb-4">
              Create a persona to define who you are in conversations
            </p>
            <Button onClick={handleCreate}>Create Persona</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {personas.map((persona) => (
              <PersonaCard
                key={persona.id}
                persona={persona}
                onEdit={() => handleEdit(persona.id)}
                onDelete={() => setDeleteConfirm(persona.id)}
                onSetDefault={() => handleSetDefault(persona.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Editor Modal */}
      <Modal
        isOpen={showEditor}
        onClose={handleCloseEditor}
        title={editingId ? 'Edit Persona' : 'Create Persona'}
        size="md"
      >
        <PersonaEditor
          personaId={editingId}
          onClose={handleCloseEditor}
        />
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Persona"
        size="sm"
      >
        <p className="text-surface-600 mb-6">
          Are you sure you want to delete this persona?
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
