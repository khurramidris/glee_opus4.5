import { useState } from 'react';
import { Button } from '../ui/Button';
import { TextArea } from '../ui/TextArea';

interface GreetingEditorProps {
    firstMessage: string;
    alternateGreetings: string[];
    onFirstMessageChange: (value: string) => void;
    onAlternateGreetingsChange: (values: string[]) => void;
}

export function GreetingEditor({
    firstMessage,
    alternateGreetings,
    onFirstMessageChange,
    onAlternateGreetingsChange,
}: GreetingEditorProps) {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [editingText, setEditingText] = useState('');

    const handleAddGreeting = () => {
        onAlternateGreetingsChange([...alternateGreetings, '']);
        setSelectedIndex(alternateGreetings.length);
        setEditingText('');
    };

    const handleDeleteGreeting = (index: number) => {
        const updated = alternateGreetings.filter((_, i) => i !== index);
        onAlternateGreetingsChange(updated);
        if (selectedIndex === index) {
            setSelectedIndex(null);
            setEditingText('');
        } else if (selectedIndex !== null && selectedIndex > index) {
            setSelectedIndex(selectedIndex - 1);
        }
    };

    const handleSelectGreeting = (index: number) => {
        setSelectedIndex(index);
        setEditingText(alternateGreetings[index]);
    };

    const handleSaveGreeting = () => {
        if (selectedIndex !== null) {
            const updated = [...alternateGreetings];
            updated[selectedIndex] = editingText;
            onAlternateGreetingsChange(updated);
            setSelectedIndex(null);
            setEditingText('');
        }
    };

    const handleCancelEdit = () => {
        setSelectedIndex(null);
        setEditingText('');
    };

    return (
        <div className="space-y-6">
            {/* Primary First Message */}
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-surface-700">
                        Primary Greeting
                    </label>
                    <span className="text-xs text-surface-500">Always shown first</span>
                </div>
                <TextArea
                    placeholder="How does the character greet the user? This is the first thing they'll see."
                    value={firstMessage}
                    onChange={(e) => onFirstMessageChange(e.target.value)}
                    rows={4}
                />
            </div>

            {/* Alternate Greetings */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-surface-700">
                        Alternate Greetings ({alternateGreetings.length})
                    </label>
                    <Button variant="secondary" size="sm" onClick={handleAddGreeting}>
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Greeting
                    </Button>
                </div>

                {alternateGreetings.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-surface-200 rounded-xl">
                        <p className="text-surface-500 text-sm">
                            No alternate greetings yet. Add variety to your character's first impressions!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {alternateGreetings.map((greeting, index) => (
                            <div
                                key={index}
                                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedIndex === index
                                        ? 'border-amber-400 bg-amber-50'
                                        : 'border-surface-200 bg-surface-50 hover:border-surface-300'
                                    }`}
                                onClick={() => handleSelectGreeting(index)}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-semibold text-surface-500 uppercase">
                                                Greeting #{index + 1}
                                            </span>
                                        </div>
                                        {selectedIndex === index ? (
                                            <div className="space-y-3">
                                                <TextArea
                                                    value={editingText}
                                                    onChange={(e) => setEditingText(e.target.value)}
                                                    rows={4}
                                                    placeholder="Enter the alternate greeting..."
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <div className="flex gap-2">
                                                    <Button size="sm" onClick={handleSaveGreeting}>
                                                        Save
                                                    </Button>
                                                    <Button variant="secondary" size="sm" onClick={handleCancelEdit}>
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-surface-700 text-sm line-clamp-2">
                                                {greeting || <span className="italic text-surface-400">Empty greeting - click to edit</span>}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteGreeting(index);
                                        }}
                                        className="p-1.5 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
