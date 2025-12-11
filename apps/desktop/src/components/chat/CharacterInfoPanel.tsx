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
        console.log('View history clicked');
    };

    const handleClearChat = async () => {
        if (!conversationId) return;
        if (confirm('Are you sure you want to clear this chat?')) {
            clearMessages(conversationId);
        }
    };

    const persona = character.personality?.split(',').slice(0, 3).map(s => s.trim()).join(', ') || 'Creative, Empathetic, Imaginative';
    const specialties = character.tags?.slice(0, 3).join(', ') || 'Storytelling, Brainstorming, Emotional Support';
    const abilities = [
        character.speechPatterns ? 'Text Generation' : null,
        'Image Analysis',
        'Voice Interaction'
    ].filter(Boolean).join(', ') || 'Text Generation, Image Analysis, Voice Interaction';

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
                    {/* Persona */}
                    <div className="text-sm">
                        <span className="font-semibold text-white">Persona: </span>
                        <span className="text-white/70">{persona}.</span>
                    </div>

                    {/* Specialties */}
                    <div className="text-sm">
                        <span className="font-semibold text-white">Specialties: </span>
                        <span className="text-white/70">{specialties}.</span>
                    </div>

                    {/* Abilities */}
                    <div className="text-sm">
                        <span className="font-semibold text-white">Abilities: </span>
                        <span className="text-white/70">{abilities}.</span>
                    </div>

                    {/* Voice Settings */}
                    <div className="text-sm">
                        <span className="font-semibold text-white">Voice Settings: </span>
                        <span className="text-white/70">Soft, Expressive (English).</span>
                    </div>
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