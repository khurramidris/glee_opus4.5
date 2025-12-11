import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '@/stores/characterStore';
import { useUIStore } from '@/stores/uiStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { ArrayInput } from '@/components/ui/ArrayInput';
import { AvatarUploader } from './AvatarUploader';
import { GreetingEditor } from './GreetingEditor';
import type { CreateCharacterInput } from '@/types';

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

export function CharacterCreator() {
  const navigate = useNavigate();
  const { createCharacter } = useCharacterStore();
  const { addToast } = useUIStore();

  const [activeTab, setActiveTab] = useState('basics');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMagicGenerating, setIsMagicGenerating] = useState(false);
  const [magicPrompt, setMagicPrompt] = useState('');
  const [showMagicInput, setShowMagicInput] = useState(false);

  const [formData, setFormData] = useState<CreateCharacterInput>({
    name: '',
    description: '',
    personality: '',
    systemPrompt: '',
    firstMessage: '',
    exampleDialogues: '',
    avatarPath: undefined,
    tags: [],

    // Enhanced fields
    scenario: '',
    backstory: '',
    likes: [],
    dislikes: [],
    physicalTraits: '',
    speechPatterns: '',
    alternateGreetings: [],

    // Creator info
    creatorName: '',
    creatorNotes: '',
    characterVersion: '1.0',

    // Category tags
    povType: 'any',
    rating: 'sfw',
    genreTags: [],
  });

  const tabs = [
    { id: 'basics', label: 'Basics' },
    { id: 'personality', label: 'Personality' },
    { id: 'greetings', label: 'Greetings' },
    { id: 'examples', label: 'Examples' },
    { id: 'advanced', label: 'Advanced' },
  ];

  const handleChange = <K extends keyof CreateCharacterInput>(
    field: K,
    value: CreateCharacterInput[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleMagicGenerate = async () => {
    if (!magicPrompt.trim()) {
      addToast({ type: 'error', message: 'Please enter a character concept first' });
      return;
    }

    setIsMagicGenerating(true);
    try {
      // Call the LLM to generate character details
      const { invoke } = await import('@tauri-apps/api/core');
      const generatedData = await invoke<CreateCharacterInput>('generate_character_from_prompt', {
        concept: magicPrompt.trim(),
      });

      setFormData(prev => ({ ...prev, ...generatedData }));
      setShowMagicInput(false);
      setMagicPrompt('');
      addToast({ type: 'success', message: `✨ Generated "${generatedData.name}"! Feel free to customize.` });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (errorMessage.includes('Model not loaded')) {
        addToast({ type: 'error', message: 'Please load a model first before using AI generation.' });
      } else {
        addToast({ type: 'error', message: `Failed to generate: ${errorMessage}` });
      }
    } finally {
      setIsMagicGenerating(false);
    }
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
      <div className="max-w-4xl mx-auto p-6">
        {/* Header with Magic Button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-surface-900">Create Character</h1>
            <p className="text-surface-500 mt-1">Bring your character to life with rich details</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => setShowMagicInput(!showMagicInput)}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 hover:from-purple-600 hover:to-pink-600"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            ✨ Magic
          </Button>
        </div>

        {/* Magic Generation Panel */}
        {showMagicInput && (
          <Card className="mb-6 border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="p-4">
              <h3 className="font-semibold text-purple-800 mb-2">✨ AI Character Generator</h3>
              <p className="text-sm text-purple-600 mb-3">
                Describe your character concept and let AI fill in the details!
              </p>
              <div className="flex gap-3">
                <Input
                  placeholder="e.g., A sarcastic coffee shop barista who secretly writes romance novels..."
                  value={magicPrompt}
                  onChange={(e) => setMagicPrompt(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleMagicGenerate}
                  isLoading={isMagicGenerating}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Generate
                </Button>
              </div>
            </div>
          </Card>
        )}

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
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      required
                    />
                    <TextArea
                      label="Description"
                      placeholder="A short description of who this character is..."
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>

                <TextArea
                  label="Scenario"
                  placeholder="The context or setting where interactions take place (e.g., 'You meet at a coffee shop...')"
                  value={formData.scenario}
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
                      value={formData.povType}
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
                  value={formData.backstory}
                  onChange={(e) => handleChange('backstory', e.target.value)}
                  rows={4}
                />

                <TextArea
                  label="Personality Traits"
                  placeholder="How does this character behave? What are their core traits, quirks, and mannerisms?"
                  value={formData.personality}
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
                  value={formData.physicalTraits}
                  onChange={(e) => handleChange('physicalTraits', e.target.value)}
                  rows={2}
                />

                <TextArea
                  label="Speech Patterns"
                  placeholder="How do they talk? Accent, vocabulary, catchphrases, speaking style..."
                  value={formData.speechPatterns}
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
                    Show the AI how your character speaks and responds. Use the format below for best results.
                  </p>
                  <TextArea
                    placeholder={`{{user}}: Hey, what are you up to?
{{char}}: *looks up from their book* Oh, just lost in another world! This story is absolutely captivating. Have you ever felt so absorbed in something that time just slips away?

{{user}}: That sounds nice. What's the book about?
{{char}}: *eyes lighting up* It's a fantasy epic about...`}
                    value={formData.exampleDialogues}
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
                  value={formData.systemPrompt}
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
                      value={formData.creatorName}
                      onChange={(e) => handleChange('creatorName', e.target.value)}
                    />
                    <Input
                      label="Version"
                      placeholder="1.0"
                      value={formData.characterVersion}
                      onChange={(e) => handleChange('characterVersion', e.target.value)}
                    />
                  </div>
                  <TextArea
                    label="Creator Notes"
                    placeholder="Notes for other users about this character, tips, recommended models, etc."
                    value={formData.creatorNotes}
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
              {formData.name ? `Creating: ${formData.name}` : 'Fill in the basics to get started'}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => navigate('/characters')}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                isLoading={isSubmitting}
                disabled={!formData.name.trim()}
              >
                Create Character
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
