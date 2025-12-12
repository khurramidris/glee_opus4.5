import { useNavigate, useParams } from 'react-router-dom';
import type { Character } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { useChatStore } from '@/stores/chatStore';

interface CharacterInfoPanelProps {
    character: Character;
}

export function CharacterInfoPanel({ character }: CharacterInfoPanelProps) {
    const navigate = useNavigate();
    const { conversationId } = useParams<{ conversationId: string }>();
    const clearMessages = useChatStore((s) => s.clearMessages);

    const handleEditCharacter = () => {
        navigate(`/characters/${character.id}/edit`);
    };

    const handleViewHistory = () => {
        // TODO: Implement view history
    };

    const handleClearChat = async () => {
        if (!conversationId) return;
        if (confirm('Are you sure you want to clear this chat?')) {
            clearMessages(conversationId);
        }
    };

    return (
        <div className="w-72 flex flex-col bg-panel rounded-2xl h-full overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/10">
                <h2 className="text-base font-semibold text-white font-display">Character Details: {character.name}</h2>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar">
                {/* Character Avatar */}
                <div className="flex flex-col items-center pt-6 pb-5 px-5">
                    <div className="relative">
                        <div className="absolute -inset-3 bg-gradient-to-tr from-white/20 to-white/10 rounded-full blur-lg"></div>
                        <Avatar
                            src={character.avatarPath}
                            fallback={character.name}
                            size="xl"
                            className="w-28 h-28 text-2xl relative ring-4 ring-white/30"
                        />
                    </div>
                </div>

                {/* Info Sections */}
                <div className="px-5 space-y-3.5">
                    {/* Description */}
                    {character.description && (
                        <div className="text-sm">
                            <span className="font-semibold text-white">Description: </span>
                            <span className="text-white/70">{character.description}</span>
                        </div>
                    )}

                    {/* Scenario */}
                    {character.scenario && (
                        <div className="text-sm">
                            <span className="font-semibold text-white">Scenario: </span>
                            <span className="text-white/70">{character.scenario}</span>
                        </div>
                    )}

                    {/* Backstory */}
                    {character.backstory && (
                        <div className="text-sm">
                            <span className="font-semibold text-white">Backstory: </span>
                            <span className="text-white/70">{character.backstory}</span>
                        </div>
                    )}

                    {/* Personality */}
                    {character.personality && (
                        <div className="text-sm">
                            <span className="font-semibold text-white">Personality: </span>
                            <span className="text-white/70">{character.personality}</span>
                        </div>
                    )}

                    {/* Likes */}
                    {character.likes && character.likes.length > 0 && (
                        <div className="text-sm">
                            <span className="font-semibold text-white">Likes: </span>
                            <span className="text-white/70">{character.likes.join(', ')}</span>
                        </div>
                    )}

                    {/* Dislikes */}
                    {character.dislikes && character.dislikes.length > 0 && (
                        <div className="text-sm">
                            <span className="font-semibold text-white">Dislikes: </span>
                            <span className="text-white/70">{character.dislikes.join(', ')}</span>
                        </div>
                    )}

                    {/* Physical Traits */}
                    {character.physicalTraits && (
                        <div className="text-sm">
                            <span className="font-semibold text-white">Physical Traits: </span>
                            <span className="text-white/70">{character.physicalTraits}</span>
                        </div>
                    )}

                    {/* Speech Patterns */}
                    {character.speechPatterns && (
                        <div className="text-sm">
                            <span className="font-semibold text-white">Speech Patterns: </span>
                            <span className="text-white/70">{character.speechPatterns}</span>
                        </div>
                    )}

                    {/* Tags */}
                    {character.tags && character.tags.length > 0 && (
                        <div className="text-sm">
                            <span className="font-semibold text-white">Tags: </span>
                            <span className="text-white/70">{character.tags.join(', ')}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="px-5 py-4 border-t border-white/10 space-y-2">
                <button
                    onClick={handleEditCharacter}
                    className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-medium text-sm transition-all duration-200"
                >
                    Edit Character
                </button>
                <button
                    onClick={handleViewHistory}
                    className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-medium text-sm transition-all duration-200"
                >
                    View History
                </button>
                <button
                    onClick={handleClearChat}
                    className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-medium text-sm transition-all duration-200"
                >
                    Clear Chat
                </button>
            </div>
        </div>
    );
}