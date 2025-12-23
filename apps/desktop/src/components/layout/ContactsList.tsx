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
    const [searchQuery, setSearchQuery] = useState('');

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
            {/* Header with Search */}
            <div className="px-4 py-4 border-b border-white/5 bg-white/2">
                <div className="relative group">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-white/30 group-focus-within:text-primary-400 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search characters..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={cn(
                            "w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder:text-white/20",
                            "focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/30",
                            "transition-all duration-200"
                        )}
                    />
                </div>
            </div>

            {/* AI Characters Section Label */}
            <div className="px-5 pt-4 pb-2">
                <h3 className="text-xs font-semibold text-white/20 uppercase tracking-widest">
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
                                isActive
                                    ? 'bg-white/10 border-white/10 shadow-sm'
                                    : 'hover:bg-white/5',
                                isLoading && 'opacity-50 pointer-events-none'
                            )}
                        >
                            <Avatar
                                src={character.avatarPath}
                                fallback={character.name}
                                size="md"
                                className={cn(
                                    'ring-2 ring-transparent transition-all duration-300 group-hover:scale-110 group-hover:ring-primary-500/30',
                                    isActive && 'ring-primary-500/30 glow-primary-sm'
                                )}
                            />
                            <div className="flex-1 min-w-0">
                                <div className={cn(
                                    'font-medium text-sm truncate transition-colors',
                                    isActive ? 'text-white' : 'text-white/85 group-hover:text-white'
                                )}>
                                    {character.name}
                                </div>
                                <div className="text-xs text-white/30 truncate">
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

            {/* Footer Navigation and Actions */}
            <div className="px-4 py-4 border-t border-white/5 flex flex-col gap-3 bg-white/2">
                <button
                    onClick={() => navigate('/characters/new')}
                    className={cn(
                        'w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-150',
                        'bg-primary-500 hover:bg-primary-600 shadow-lg shadow-primary-500/20',
                        'text-white',
                        'flex items-center justify-center gap-2',
                        'active:scale-[0.98]'
                    )}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    New Character
                </button>

                <div className="flex items-center justify-around px-2 pt-1">
                    <button
                        onClick={() => navigate('/characters')}
                        title="Characters"
                        className={cn(
                            'p-2 rounded-xl transition-all duration-200',
                            location.pathname === '/characters'
                                ? 'bg-white/10 text-primary-400 shadow-inner'
                                : 'text-white/40 hover:text-white hover:bg-white/5'
                        )}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </button>

                    <button
                        onClick={() => navigate('/settings')}
                        title="Settings"
                        className={cn(
                            'p-2 rounded-xl transition-all duration-200',
                            location.pathname === '/settings'
                                ? 'bg-white/10 text-primary-400 shadow-inner'
                                : 'text-white/40 hover:text-white hover:bg-white/5'
                        )}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>

                    <button
                        onClick={() => navigate('/personas')}
                        title="Profile"
                        className={cn(
                            'p-2 rounded-xl transition-all duration-200',
                            location.pathname === '/personas'
                                ? 'bg-white/10 text-primary-400 shadow-inner'
                                : 'text-white/40 hover:text-white hover:bg-white/5'
                        )}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}