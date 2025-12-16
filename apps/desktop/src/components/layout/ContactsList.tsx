import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCharacterStore } from '@/stores/characterStore';
import { useConversationStore } from '@/stores/conversationStore';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import { commands } from '@/lib/commands';

const STATUS_LIST = ['Online', 'Away', 'Active', 'Idle'] as const;
type CharacterStatus = typeof STATUS_LIST[number];

function getRandomStatus(id: string): CharacterStatus {
    const hash = id.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
    return STATUS_LIST[Math.abs(hash) % STATUS_LIST.length];
}

function getStatusColor(status: CharacterStatus): string {
    switch (status) {
        case 'Online': return 'bg-green-400';
        case 'Away': return 'bg-yellow-400';
        case 'Active': return 'bg-primary-300';
        case 'Idle': return 'bg-white/50';
    }
}

export function ContactsList() {
    const navigate = useNavigate();
    const location = useLocation();
    const { characters } = useCharacterStore();
    const { conversations } = useConversationStore();
    const [isStartingChat, setIsStartingChat] = useState<string | null>(null);
    const [searchQuery, _setSearchQuery] = useState('');

    const currentConversationId = location.pathname.startsWith('/chat/')
        ? location.pathname.split('/chat/')[1]
        : null;

    const characterStatuses = useMemo(() => {
        const statuses: Record<string, CharacterStatus> = {};
        characters.forEach(c => {
            statuses[c.id] = getRandomStatus(c.id);
        });
        return statuses;
    }, [characters]);

    const sortedCharacters = [...characters]
        .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => {
            const aConv = conversations.find(c => c.characters?.some(char => char.id === a.id));
            const bConv = conversations.find(c => c.characters?.some(char => char.id === b.id));
            if (aConv && !bConv) return -1;
            if (!aConv && bConv) return 1;
            return a.name.localeCompare(b.name);
        });

    const handleCharacterClick = async (characterId: string) => {
        if (isStartingChat) return;

        setIsStartingChat(characterId);
        try {
            const existing = await commands.findConversationByCharacter(characterId);

            if (existing) {
                navigate(`/chat/${existing.id}`);
            } else {
                const conversation = await commands.createConversation({
                    characterIds: [characterId],
                });
                navigate(`/chat/${conversation.id}`);
            }
        } catch (e) {
            console.error('Failed to start conversation:', e);
        } finally {
            setIsStartingChat(null);
        }
    };

    return (
        <div className="w-64 flex flex-col panel rounded-2xl h-full overflow-hidden">
            {/* Header with Logo */}
            <div className="px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-lg font-display">G</span>
                    </div>
                    <span className="font-bold text-xl text-white font-display tracking-tight">Glee</span>
                </div>
            </div>

            {/* AI Characters Section */}
            <div className="px-5 pt-5 pb-3">
                <h3 className="text-sm font-semibold text-white/80 tracking-wide">AI Characters</h3>
            </div>

            {/* Character List */}
            <div className="flex-1 overflow-y-auto px-3 py-1 no-scrollbar space-y-1">
                {sortedCharacters.map((character) => {
                    const conv = conversations.find(c => c.characters?.some(char => char.id === character.id));
                    const isActive = conv && currentConversationId === conv.id;
                    const isLoading = isStartingChat === character.id;
                    const status = characterStatuses[character.id];
                    const personality = character.personality?.split(',')[0]?.trim() || character.tags?.[0] || 'Creative';

                    return (
                        <div
                            key={character.id}
                            onClick={() => handleCharacterClick(character.id)}
                            className={cn(
                                'group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer',
                                isActive
                                    ? 'bg-white/20 border border-white/30'
                                    : 'hover:bg-white/10 border border-transparent',
                                isLoading && 'opacity-50 pointer-events-none'
                            )}
                        >
                            <div className="relative flex-shrink-0">
                                <Avatar
                                    src={character.avatarPath}
                                    fallback={character.name}
                                    size="md"
                                    className={cn(
                                        'ring-2 ring-white/30',
                                        isActive && 'ring-white/50'
                                    )}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className={cn(
                                    'font-semibold text-sm truncate',
                                    isActive ? 'text-white' : 'text-white/90'
                                )}>
                                    {character.name}
                                </div>
                                <div className="text-xs text-white/60 truncate">
                                    {personality}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* New Character Button */}
            <div className="px-4 py-4 border-t border-white/10">
                <button
                    onClick={() => navigate('/characters/new')}
                    className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Character
                </button>
            </div>
        </div>
    );
}