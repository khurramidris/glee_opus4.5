import { useState, useEffect } from 'react';
import { useLorebookStore } from '@/stores/lorebookStore';
import { useUIStore } from '@/stores/uiStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { KeywordInput } from './KeywordInput';
import type { LorebookEntry, CreateEntryInput, UpdateEntryInput } from '@/types';

interface EntryEditorProps {
  lorebookId: string;
  entry: LorebookEntry | null;
  onClose: () => void;
}

export function EntryEditor({ lorebookId, entry, onClose }: EntryEditorProps) {
  const { createEntry, updateEntry } = useLorebookStore();
  const { addToast } = useUIStore();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    keywords: [] as string[],
    content: '',
    priority: 50,
    isEnabled: true,
    caseSensitive: false,
    matchWholeWord: true,
    insertionPosition: 'after_system',
    tokenBudget: undefined as number | undefined,
  });

  useEffect(() => {
    if (entry) {
      setFormData({
        name: entry.name,
        keywords: entry.keywords,
        content: entry.content,
        priority: entry.priority,
        isEnabled: entry.isEnabled,
        caseSensitive: entry.caseSensitive,
        matchWholeWord: entry.matchWholeWord,
        insertionPosition: entry.insertionPosition,
        tokenBudget: entry.tokenBudget ?? undefined,
      });
    }
  }, [entry]);

  const handleSubmit = async () => {
    if (formData.keywords.length === 0) {
      addToast({ type: 'error', message: 'At least one keyword is required' });
      return;
    }
    if (!formData.content.trim()) {
      addToast({ type: 'error', message: 'Content is required' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (entry) {
        await updateEntry(entry.id, formData as UpdateEntryInput);
        addToast({ type: 'success', message: 'Entry updated!' });
      } else {
        await createEntry({
          lorebookId,
          ...formData,
        } as CreateEntryInput);
        addToast({ type: 'success', message: 'Entry created!' });
      }
      onClose();
    } catch (e) {
      addToast({ type: 'error', message: `Failed to save entry: ${e}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const insertionOptions = [
    { value: 'before_system', label: 'Before System Prompt' },
    { value: 'after_system', label: 'After System Prompt' },
    { value: 'before_history', label: 'Before Conversation History' },
  ];

  return (
    <div className="space-y-4">
      <Input
        label="Name (optional)"
        placeholder="Entry name for reference"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />

      <KeywordInput
        keywords={formData.keywords}
        onChange={(keywords) => setFormData({ ...formData, keywords })}
      />

      <TextArea
        label="Content"
        placeholder="The information that will be injected when keywords match..."
        value={formData.content}
        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
        rows={6}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Priority (0-100)"
          type="number"
          min={0}
          max={100}
          value={formData.priority}
          onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 50 })}
        />
        <Input
          label="Token Budget (optional)"
          type="number"
          min={0}
          placeholder="No limit"
          value={formData.tokenBudget ?? ''}
          onChange={(e) => setFormData({ 
            ...formData, 
            tokenBudget: e.target.value ? parseInt(e.target.value) : undefined 
          })}
        />
      </div>

      <Select
        label="Insertion Position"
        value={formData.insertionPosition}
        onChange={(e) => setFormData({ ...formData, insertionPosition: e.target.value })}
        options={insertionOptions}
      />

      <div className="flex flex-wrap gap-6">
        <Toggle
          checked={formData.isEnabled}
          onChange={(checked) => setFormData({ ...formData, isEnabled: checked })}
          label="Enabled"
        />
        <Toggle
          checked={formData.caseSensitive}
          onChange={(checked) => setFormData({ ...formData, caseSensitive: checked })}
          label="Case sensitive"
        />
        <Toggle
          checked={formData.matchWholeWord}
          onChange={(checked) => setFormData({ ...formData, matchWholeWord: checked })}
          label="Match whole word"
        />
      </div>

      <p className="text-sm text-surface-500">
        Higher priority entries are injected first. Use token budget to limit how much
        space this entry takes in the context.
      </p>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} isLoading={isSubmitting}>
          {entry ? 'Save Entry' : 'Create Entry'}
        </Button>
      </div>
    </div>
  );
}
