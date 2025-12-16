import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCharacterStore } from '@/stores/characterStore';
import { useConversationStore } from '@/stores/conversationStore';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import { commands } from '@/lib/commands';

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

    const sortedCharacters = useMemo(() => {
        return [...characters]
            .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => {
                const aConv = conversations.find(c => c.characters?.some(char => char.id === a.id));
                const bConv = conversations.find(c => c.characters?.some(char => char.id === b.id));
                if (aConv && !bConv) return -1;
                if (!aConv && bConv) return 1;
                return a.name.localeCompare(b.name);
            });
    }, [characters, conversations, searchQuery]);

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
            <div className="px-5 py-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
                        <span className="text-white font-bold text-lg font-display">G</span>
                    </div>
                    <span className="font-bold text-xl text-white font-display tracking-tight">Glee</span>
                </div>
            </div>

            {/* AI Characters Section */}
            <div className="px-5 pt-5 pb-3">
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                    AI Characters
                </h3>
            </div>

            {/* Character List */}
            <div className="flex-1 overflow-y-auto px-3 py-1 no-scrollbar space-y-0.5">
                {sortedCharacters.map((character, index) => {
                    const conv = conversations.find(c => c.characters?.some(char => char.id === character.id));
                    const isActive = conv && currentConversationId === conv.id;
                    const isLoading = isStartingChat === character.id;
                    const personality = character.personality?.split(',')[0]?.trim() || character.tags?.[0] || 'Creative';

                    return (
                        <motion.div
                            key={character.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03, duration: 0.2 }}
                            onClick={() => handleCharacterClick(character.id)}
                            className={cn(
                                'group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 cursor-pointer',
                                'border border-transparent',
                                'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary-500/10',
                                isActive
                                    ? 'bg-white/15 border-white/20 shadow-sm'
                                    : 'hover:bg-white/8',
                                isLoading && 'opacity-50 pointer-events-none'
                            )}
                        >
                            <Avatar
                                src={character.avatarPath}
                                fallback={character.name}
                                size="md"
                                className={cn(
                                    'ring-2 ring-transparent transition-all',
                                    isActive && 'ring-white/30'
                                )}
                            />
                            <div className="flex-1 min-w-0">
                                <div className={cn(
                                    'font-medium text-sm truncate transition-colors',
                                    isActive ? 'text-white' : 'text-white/85 group-hover:text-white'
                                )}>
                                    {character.name}
                                </div>
                                <div className="text-xs text-white/40 truncate">
                                    {personality}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}

                {sortedCharacters.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-12 px-4 text-center"
                    >
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <h3 className="text-white/70 font-medium mb-1">No characters yet</h3>
                        <p className="text-white/40 text-sm mb-4">Create your first AI companion</p>
                        <button
                            onClick={() => navigate('/characters/new')}
                            className="text-primary-400 text-sm font-medium hover:text-primary-300 transition-colors"
                        >
                            + Create Character
                        </button>
                    </motion.div>
                )}
            </div>

            {/* New Character Button */}
            <div className="px-4 py-4 border-t border-white/5">
                <button
                    onClick={() => navigate('/characters/new')}
                    className={cn(
                        'w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-150',
                        'bg-white/8 hover:bg-white/12 border border-white/10 hover:border-white/20',
                        'text-white/90 hover:text-white',
                        'flex items-center justify-center gap-2',
                        'active:scale-[0.98]'
                    )}
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