import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCharacter } from '@/hooks/useCharacters';
import { useCharacterStore } from '@/stores/characterStore';
import { useUIStore } from '@/stores/uiStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { Spinner } from '@/components/ui/Spinner';
import { ArrayInput } from '@/components/ui/ArrayInput';
import { AvatarUploader } from './AvatarUploader';
import { GreetingEditor } from './GreetingEditor';
import type { UpdateCharacterInput } from '@/types';

type POVType = 'any' | 'first' | 'second' | 'third';
type RatingType = 'sfw' | 'nsfw' | 'limitless';

const POV_OPTIONS: { value: POVType; label: string }[] = [
  { value: 'any', label: 'Any POV' },
  { value: 'first', label: 'First Person' },
  { value: 'second', label: 'Second Person' },
  { value: 'third', label: 'Third Person' },
];

const RATING_OPTIONS: { value: RatingType; label: string; color: string }[] = [
  { value: 'sfw', label: 'SFW', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'nsfw', label: 'NSFW', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'limitless', label: 'Limitless', color: 'bg-red-100 text-red-700 border-red-300' },
];

const GENRE_SUGGESTIONS = [
  'Romance', 'Comedy', 'Drama', 'Fantasy', 'Sci-Fi', 'Horror',
  'Slice of Life', 'Action', 'Mystery', 'Adventure', 'Fluff'
];

export function CharacterEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { character, isLoading } = useCharacter(id!);
  const { updateCharacter } = useCharacterStore();
  const { addToast } = useUIStore();

  const [activeTab, setActiveTab] = useState('basics');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<UpdateCharacterInput>({});

  const tabs = [
    { id: 'basics', label: 'Basics' },
    { id: 'personality', label: 'Personality' },
    { id: 'greetings', label: 'Greetings' },
    { id: 'examples', label: 'Examples' },
    { id: 'advanced', label: 'Advanced' },
  ];

  useEffect(() => {
    if (character) {
      setFormData({
        name: character.name,
        description: character.description,
        personality: character.personality,
        systemPrompt: character.systemPrompt,
        firstMessage: character.firstMessage,
        exampleDialogues: character.exampleDialogues,
        avatarPath: character.avatarPath || undefined,
        tags: character.tags,

        // Enhanced fields
        scenario: character.scenario,
        backstory: character.backstory,
        likes: character.likes,
        dislikes: character.dislikes,
        physicalTraits: character.physicalTraits,
        speechPatterns: character.speechPatterns,
        alternateGreetings: character.alternateGreetings,

        // Creator info
        creatorName: character.creatorName,
        creatorNotes: character.creatorNotes,
        characterVersion: character.characterVersion,

        // Category tags
        povType: character.povType,
        rating: character.rating,
        genreTags: character.genreTags,
      });
    }
  }, [character]);

  const handleChange = <K extends keyof UpdateCharacterInput>(
    field: K,
    value: UpdateCharacterInput[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name?.trim()) {
      addToast({ type: 'error', message: 'Name is required' });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateCharacter(id!, formData);
      addToast({ type: 'success', message: 'Character updated!' });
      navigate('/characters');
    } catch (e) {
      addToast({ type: 'error', message: `Failed to update character: ${e}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !character) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-surface-100">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-surface-900">Edit Character</h1>
          <p className="text-surface-500 mt-1">Update {character.name}'s details</p>
        </div>

        <Card>
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

          <div className="p-6 space-y-6">
            {/* BASICS TAB */}
            {activeTab === 'basics' && (
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
                      value={formData.name || ''}
                      onChange={(e) => handleChange('name', e.target.value)}
                      required
                    />
                    <TextArea
                      label="Description"
                      placeholder="A short description of who this character is..."
                      value={formData.description || ''}
                      onChange={(e) => handleChange('description', e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>

                <TextArea
                  label="Scenario"
                  placeholder="The context or setting where interactions take place..."
                  value={formData.scenario || ''}
                  onChange={(e) => handleChange('scenario', e.target.value)}
                  rows={2}
                />

                {/* Category Tags */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Rating */}
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-2">Rating</label>
                    <div className="flex gap-2">
                      {RATING_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleChange('rating', option.value)}
                          className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${formData.rating === option.value
                              ? option.color + ' border-current'
                              : 'bg-surface-50 text-surface-600 border-surface-200 hover:border-surface-300'
                            }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* POV */}
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-2">POV Type</label>
                    <select
                      value={formData.povType || 'any'}
                      onChange={(e) => handleChange('povType', e.target.value as POVType)}
                      className="w-full px-4 py-2 rounded-lg border-2 border-surface-200 bg-white text-surface-900 focus:border-amber-400 focus:outline-none"
                    >
                      {POV_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Genre Tags */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">Genre Tags</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {GENRE_SUGGESTIONS.map((genre) => (
                      <button
                        key={genre}
                        onClick={() => {
                          const current = formData.genreTags || [];
                          if (current.includes(genre)) {
                            handleChange('genreTags', current.filter(g => g !== genre));
                          } else {
                            handleChange('genreTags', [...current, genre]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${formData.genreTags?.includes(genre)
                            ? 'bg-amber-500 text-white'
                            : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                          }`}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Tags */}
                <ArrayInput
                  label="Custom Tags"
                  placeholder="Add a custom tag..."
                  values={formData.tags || []}
                  onChange={(values) => handleChange('tags', values)}
                />
              </>
            )}

            {/* PERSONALITY TAB */}
            {activeTab === 'personality' && (
              <>
                <TextArea
                  label="Backstory"
                  placeholder="The character's history, background, and what shaped who they are..."
                  value={formData.backstory || ''}
                  onChange={(e) => handleChange('backstory', e.target.value)}
                  rows={4}
                />

                <TextArea
                  label="Personality Traits"
                  placeholder="How does this character behave? What are their core traits, quirks, and mannerisms?"
                  value={formData.personality || ''}
                  onChange={(e) => handleChange('personality', e.target.value)}
                  rows={4}
                />

                <div className="grid grid-cols-2 gap-4">
                  <ArrayInput
                    label="Likes"
                    placeholder="Add something they like..."
                    values={formData.likes || []}
                    onChange={(values) => handleChange('likes', values)}
                  />
                  <ArrayInput
                    label="Dislikes"
                    placeholder="Add something they dislike..."
                    values={formData.dislikes || []}
                    onChange={(values) => handleChange('dislikes', values)}
                  />
                </div>

                <TextArea
                  label="Physical Behavior"
                  placeholder="Physical mannerisms, gestures, how they carry themselves..."
                  value={formData.physicalTraits || ''}
                  onChange={(e) => handleChange('physicalTraits', e.target.value)}
                  rows={2}
                />

                <TextArea
                  label="Speech Patterns"
                  placeholder="How do they talk? Accent, vocabulary, catchphrases, speaking style..."
                  value={formData.speechPatterns || ''}
                  onChange={(e) => handleChange('speechPatterns', e.target.value)}
                  rows={2}
                />
              </>
            )}

            {/* GREETINGS TAB */}
            {activeTab === 'greetings' && (
              <GreetingEditor
                firstMessage={formData.firstMessage || ''}
                alternateGreetings={formData.alternateGreetings || []}
                onFirstMessageChange={(value) => handleChange('firstMessage', value)}
                onAlternateGreetingsChange={(values) => handleChange('alternateGreetings', values)}
              />
            )}

            {/* EXAMPLES TAB */}
            {activeTab === 'examples' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">
                    Example Dialogues
                  </label>
                  <p className="text-sm text-surface-500 mb-3">
                    Show the AI how your character speaks and responds.
                  </p>
                  <TextArea
                    placeholder={`{{user}}: Hey, what are you up to?
{{char}}: *looks up from their book* Oh, just lost in another world!`}
                    value={formData.exampleDialogues || ''}
                    onChange={(e) => handleChange('exampleDialogues', e.target.value)}
                    rows={12}
                    className="font-mono text-sm"
                  />
                </div>
              </>
            )}

            {/* ADVANCED TAB */}
            {activeTab === 'advanced' && (
              <>
                <TextArea
                  label="System Prompt (Override)"
                  placeholder="Direct instructions for the AI. Leave blank to auto-generate from character details."
                  value={formData.systemPrompt || ''}
                  onChange={(e) => handleChange('systemPrompt', e.target.value)}
                  rows={6}
                />
                <p className="text-sm text-surface-500 -mt-4">
                  ⚠️ If provided, this replaces the auto-generated prompt. Only use if you know what you're doing.
                </p>

                <div className="border-t border-surface-200 pt-6 mt-6">
                  <h3 className="font-semibold text-surface-800 mb-4">Creator Attribution</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Creator Name"
                      placeholder="Your name or username"
                      value={formData.creatorName || ''}
                      onChange={(e) => handleChange('creatorName', e.target.value)}
                    />
                    <Input
                      label="Version"
                      placeholder="1.0"
                      value={formData.characterVersion || ''}
                      onChange={(e) => handleChange('characterVersion', e.target.value)}
                    />
                  </div>
                  <TextArea
                    label="Creator Notes"
                    placeholder="Notes for other users about this character..."
                    value={formData.creatorNotes || ''}
                    onChange={(e) => handleChange('creatorNotes', e.target.value)}
                    rows={3}
                    className="mt-4"
                  />
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center gap-3 p-6 border-t border-surface-200 bg-surface-50">
            <div className="text-sm text-surface-500">
              Editing: {formData.name || character.name}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => navigate('/characters')}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                isLoading={isSubmitting}
                disabled={!formData.name?.trim()}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
