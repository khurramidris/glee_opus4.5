import { useState, useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { useUIStore } from '@/stores/uiStore';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { GENERATION_DEFAULTS } from '@/lib/constants';
import { commands } from '@/lib/commands';

export function MemorySettings() {
    const { settings, fetchSettings } = useSettings();
    const { addToast } = useUIStore();

    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<{
        summaryBudget: number;
        memoryBudget: number;
        lorebookBudget: number;
        exampleDialogueBudget: number;
        responseReserve: number;
    }>({
        summaryBudget: GENERATION_DEFAULTS.summaryBudget,
        memoryBudget: GENERATION_DEFAULTS.memoryBudget,
        lorebookBudget: GENERATION_DEFAULTS.lorebookBudget,
        exampleDialogueBudget: GENERATION_DEFAULTS.exampleDialogueBudget,
        responseReserve: GENERATION_DEFAULTS.responseReserve,
    });

    useEffect(() => {
        if (settings) {
            setFormData({
                summaryBudget: settings.generation.summaryBudget ?? GENERATION_DEFAULTS.summaryBudget,
                memoryBudget: settings.generation.memoryBudget ?? GENERATION_DEFAULTS.memoryBudget,
                lorebookBudget: settings.generation.lorebookBudget ?? GENERATION_DEFAULTS.lorebookBudget,
                exampleDialogueBudget: settings.generation.exampleDialogueBudget ?? GENERATION_DEFAULTS.exampleDialogueBudget,
                responseReserve: settings.generation.responseReserve ?? GENERATION_DEFAULTS.responseReserve,
            });
        }
    }, [settings]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Note: The backend expects keys like 'generation.summary_budget' (snake_case)
            // mapped from our camelCase state.
            await commands.updateSettingsBatch([
                ['generation.summary_budget', formData.summaryBudget.toString()],
                ['generation.memory_budget', formData.memoryBudget.toString()],
                ['generation.lorebook_budget', formData.lorebookBudget.toString()],
                ['generation.example_dialogue_budget', formData.exampleDialogueBudget.toString()],
                ['generation.response_reserve', formData.responseReserve.toString()],
            ]);

            await fetchSettings();
            addToast({ type: 'success', message: 'Memory settings saved!' });
        } catch (e) {
            addToast({ type: 'error', message: `Failed to save settings: ${e}` });
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        setFormData({
            summaryBudget: GENERATION_DEFAULTS.summaryBudget,
            memoryBudget: GENERATION_DEFAULTS.memoryBudget,
            lorebookBudget: GENERATION_DEFAULTS.lorebookBudget,
            exampleDialogueBudget: GENERATION_DEFAULTS.exampleDialogueBudget,
            responseReserve: GENERATION_DEFAULTS.responseReserve,
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-surface-900 mb-2">Memory & Context</h2>
                <p className="text-surface-500 text-sm">
                    Configure how many tokens are allocated to different types of memory.
                    Total context usage is the sum of these plus the active conversation history.
                </p>
            </div>

            <Card>
                <div className="space-y-6">
                    <div>
                        <Input
                            label="Summary Budget (Tier 2)"
                            type="number"
                            min={100}
                            max={2000}
                            step={50}
                            value={formData.summaryBudget}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, summaryBudget: parseInt(e.target.value) || 0 })}
                        />
                        <p className="text-xs text-surface-500 mt-1">
                            Tokens reserved for conversation summaries.
                        </p>
                    </div>

                    <div>
                        <Input
                            label="Vector Memory Budget (Tier 3)"
                            type="number"
                            min={0}
                            max={4000}
                            step={50}
                            value={formData.memoryBudget}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, memoryBudget: parseInt(e.target.value) || 0 })}
                        />
                        <p className="text-xs text-surface-500 mt-1">
                            Tokens for semantically retrieved long-term memories using VectorDB.
                        </p>
                    </div>

                    <div>
                        <Input
                            label="Lorebook Budget (Tier 4)"
                            type="number"
                            min={0}
                            max={4000}
                            step={50}
                            value={formData.lorebookBudget}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, lorebookBudget: parseInt(e.target.value) || 0 })}
                        />
                        <p className="text-xs text-surface-500 mt-1">
                            Tokens for active World Info / Lorebook entries.
                        </p>
                    </div>

                    <div className="pt-4 border-t border-surface-200">
                        <h3 className="text-sm font-medium text-surface-700 mb-4">Advanced Allocation</h3>

                        <div className="space-y-6">
                            <div>
                                <Input
                                    label="Example Dialogue Budget"
                                    type="number"
                                    min={0}
                                    max={2000}
                                    step={50}
                                    value={formData.exampleDialogueBudget}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, exampleDialogueBudget: parseInt(e.target.value) || 0 })}
                                />
                                <p className="text-xs text-surface-500 mt-1">
                                    Tokens for character example dialogue (important for personality).
                                </p>
                            </div>

                            <div>
                                <Input
                                    label="Response Reserve"
                                    type="number"
                                    min={64}
                                    max={4096}
                                    step={64}
                                    value={formData.responseReserve}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, responseReserve: parseInt(e.target.value) || 0 })}
                                />
                                <p className="text-xs text-surface-500 mt-1">
                                    Tokens explicitly reserved for the AI's response to prevent cutoff.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-surface-200">
                    <Button variant="secondary" onClick={handleReset}>
                        Reset to Defaults
                    </Button>
                    <Button onClick={handleSave} isLoading={isSaving}>
                        Save Changes
                    </Button>
                </div>
            </Card>

            <div className="bg-surface-200/50 p-4 rounded-lg text-sm text-surface-600">
                <p className="font-medium mb-1">Total Reserved: {
                    formData.summaryBudget +
                    formData.memoryBudget +
                    formData.lorebookBudget +
                    formData.exampleDialogueBudget +
                    formData.responseReserve
                } tokens</p>
                <p>Ensure this is less than your model's total context size (e.g. 4096 or 8192) to leave room for recent chat history.</p>
            </div>
        </div>
    );
}
