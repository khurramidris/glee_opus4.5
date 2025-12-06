import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '@/stores/characterStore';
import { useUIStore } from '@/stores/uiStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { AvatarUploader } from './AvatarUploader';
import type { CreateCharacterInput } from '@/types';

export function CharacterCreator() {
  const navigate = useNavigate();
  const { createCharacter } = useCharacterStore();
  const { addToast } = useUIStore();

  const [activeTab, setActiveTab] = useState('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateCharacterInput>({
    name: '',
    description: '',
    personality: '',
    systemPrompt: '',
    firstMessage: '',
    exampleDialogues: '',
    avatarPath: undefined,
    tags: [],
  });
  const [tagInput, setTagInput] = useState('');

  const tabs = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'personality', label: 'Personality' },
    { id: 'advanced', label: 'Advanced' },
  ];

  const handleChange = (field: keyof CreateCharacterInput, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      handleChange('tags', [...(formData.tags || []), tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    handleChange('tags', formData.tags?.filter((t) => t !== tag) || []);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      addToast({ type: 'error', message: 'Name is required' });
      return;
    }

    setIsSubmitting(true);
    try {
      await createCharacter(formData);
      addToast({ type: 'success', message: 'Character created!' });
      navigate('/characters');
    } catch (e) {
      addToast({ type: 'error', message: `Failed to create character: ${e}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-surface-100">
      <div className="max-w-3xl mx-auto p-6">
        <Card>
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

          <div className="p-6 space-y-6">
            {activeTab === 'basic' && (
              <>
                <div className="flex gap-6">
                  <AvatarUploader
                    currentPath={formData.avatarPath}
                    onUpload={(path) => handleChange('avatarPath', path)}
                  />
                  <div className="flex-1 space-y-4">
                    <Input
                      label="Name"
                      placeholder="Character name"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      required
                    />
                    <TextArea
                      label="Description"
                      placeholder="Who is this character? Background, role, etc."
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>

                <TextArea
                  label="First Message"
                  placeholder="How does the character greet the user?"
                  value={formData.firstMessage}
                  onChange={(e) => handleChange('firstMessage', e.target.value)}
                  rows={3}
                />

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">
                    Tags
                  </label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Add tag..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    />
                    <Button variant="secondary" onClick={handleAddTag}>
                      Add
                    </Button>
                  </div>
                  {formData.tags && formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-surface-200 text-surface-700 rounded-lg text-sm"
                        >
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="text-surface-400 hover:text-surface-600"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'personality' && (
              <>
                <TextArea
                  label="Personality"
                  placeholder="How does this character behave? What are their traits, mannerisms, speaking style?"
                  value={formData.personality}
                  onChange={(e) => handleChange('personality', e.target.value)}
                  rows={6}
                />

                <TextArea
                  label="Example Dialogues"
                  placeholder="Example conversations showing how the character speaks and responds..."
                  value={formData.exampleDialogues}
                  onChange={(e) => handleChange('exampleDialogues', e.target.value)}
                  rows={8}
                />
              </>
            )}

            {activeTab === 'advanced' && (
              <>
                <TextArea
                  label="System Prompt"
                  placeholder="Direct instructions for the AI (optional - leave blank to auto-generate from description and personality)"
                  value={formData.systemPrompt}
                  onChange={(e) => handleChange('systemPrompt', e.target.value)}
                  rows={8}
                />
                <p className="text-sm text-surface-500">
                  The system prompt gives direct instructions to the AI. If left blank,
                  Glee will construct one from the character's description and personality.
                </p>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 p-6 border-t border-surface-200">
            <Button variant="secondary" onClick={() => navigate('/characters')}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} isLoading={isSubmitting}>
              Create Character
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
