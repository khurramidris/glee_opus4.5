import { useState, useEffect } from 'react';
import { usePersonaStore } from '@/stores/personaStore';
import { useUIStore } from '@/stores/uiStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Toggle } from '@/components/ui/Toggle';

interface PersonaEditorProps {
  personaId: string | null;
  onClose: () => void;
}

export function PersonaEditor({ personaId, onClose }: PersonaEditorProps) {
  const { personas, createPersona, updatePersona } = usePersonaStore();
  const { addToast } = useUIStore();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const existingPersona = personaId ? personas.find((p) => p.id === personaId) : null;

  useEffect(() => {
    if (existingPersona) {
      setName(existingPersona.name);
      setDescription(existingPersona.description);
      setIsDefault(existingPersona.isDefault);
    } else {
      setName('');
      setDescription('');
      setIsDefault(false);
    }
  }, [existingPersona]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      addToast({ type: 'error', message: 'Name is required' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (existingPersona) {
        await updatePersona(existingPersona.id, { name, description, isDefault });
        addToast({ type: 'success', message: 'Persona updated!' });
      } else {
        await createPersona({ name, description, isDefault });
        addToast({ type: 'success', message: 'Persona created!' });
      }
      onClose();
    } catch (e) {
      addToast({ type: 'error', message: `Failed to save persona: ${e}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        label="Name"
        placeholder="Your name in conversations"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <TextArea
        label="Description"
        placeholder="Tell characters about yourself... (age, occupation, interests, etc.)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={4}
      />

      <Toggle
        checked={isDefault}
        onChange={setIsDefault}
        label="Set as default persona"
      />

      <p className="text-sm text-surface-500">
        This information will be shared with characters to help them personalize responses.
      </p>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} isLoading={isSubmitting}>
          {existingPersona ? 'Save Changes' : 'Create Persona'}
        </Button>
      </div>
    </div>
  );
}
