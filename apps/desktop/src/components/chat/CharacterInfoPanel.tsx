import type { Character } from '@/types';
import { Avatar } from '@/components/ui/Avatar';

interface CharacterInfoPanelProps {
    character: Character;
}

export function CharacterInfoPanel({ character }: CharacterInfoPanelProps) {
    return (
        <div className="w-72 flex flex-col bg-surface-50 border-l border-surface-200 h-full overflow-y-auto">
            {/* Header with back button and actions */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200">
                <button className="p-1.5 text-surface-500 hover:text-surface-700 hover:bg-surface-100 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div className="flex items-center gap-2">
                    <button className="p-1.5 text-surface-500 hover:text-surface-700 hover:bg-surface-100 rounded-lg transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </button>
                    <button className="p-1.5 text-surface-500 hover:text-surface-700 hover:bg-surface-100 rounded-lg transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <button className="p-1.5 text-surface-500 hover:text-surface-700 hover:bg-surface-100 rounded-lg transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Character Avatar */}
            <div className="flex flex-col items-center pt-6 pb-4 px-4">
                <div className="relative">
                    <Avatar
                        src={character.avatarPath}
                        fallback={character.name}
                        size="xl"
                        className="w-24 h-24 text-2xl"
                    />
                    {/* Online indicator */}
                    <div className="absolute bottom-1 right-1 w-6 h-6 bg-accent-green rounded-full border-2 border-surface-50 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    </div>
                </div>

                {/* Character Name */}
                <h2 className="mt-4 text-xl font-bold text-surface-900">{character.name}</h2>

                {/* Description */}
                <p className="mt-2 text-sm text-surface-500 text-center leading-relaxed px-2">
                    {character.description || 'No description available.'}
                </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 px-4 pb-4 justify-center">
                <button className="px-4 py-1.5 bg-primary-500 text-white text-sm font-medium rounded-full hover:bg-primary-600 transition-colors">
                    Key Traits
                </button>
                <button className="px-4 py-1.5 bg-accent-coral text-white text-sm font-medium rounded-full hover:opacity-90 transition-opacity">
                    Profiled
                </button>
                <button className="px-4 py-1.5 bg-surface-200 text-surface-700 text-sm font-medium rounded-full hover:bg-surface-300 transition-colors">
                    Artenceclow
                </button>
                <button className="px-4 py-1.5 bg-primary-500 text-white text-sm font-medium rounded-full hover:bg-primary-600 transition-colors">
                    Key Evatts
                </button>
            </div>

            {/* Behavior Section */}
            <div className="px-4 py-4 border-t border-surface-200">
                <h3 className="font-semibold text-surface-900 mb-3">Behavior</h3>
                <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-surface-100 rounded-xl">
                        <span className="text-sm text-surface-700">Ket niage</span>
                        <svg className="w-4 h-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-surface-100 rounded-xl">
                        <span className="text-sm text-surface-700">Dass Gunge</span>
                        <svg className="w-4 h-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Preferences Section */}
            <div className="px-4 py-4 border-t border-surface-200">
                <h3 className="font-semibold text-surface-900 mb-3">Preferences</h3>
                <div className="p-3 bg-primary-50 rounded-xl border border-primary-200">
                    <p className="text-sm text-surface-600 leading-relaxed">
                        {character.systemPrompt
                            ? character.systemPrompt.slice(0, 150) + (character.systemPrompt.length > 150 ? '...' : '')
                            : 'This a\'chat raw a utren in your amply allerait nand early thing gele. Zot on do a hoot an yoan threck e cleer t singhen po ur your aange.'
                        }
                    </p>
                </div>
            </div>
        </div>
    );
}
