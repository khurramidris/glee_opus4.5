import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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

    // Get current chat conversation ID from URL
    const currentConversationId = location.pathname.startsWith('/chat/')
        ? location.pathname.split('/chat/')[1]
        : null;

    // Sort characters - those with recent conversations first
    const sortedCharacters = [...characters].sort((a, b) => {
        const aConv = conversations.find(c => c.characters?.some(char => char.id === a.id));
        const bConv = conversations.find(c => c.characters?.some(char => char.id === b.id));
        if (aConv && !bConv) return -1;
        if (!aConv && bConv) return 1;
        return a.name.localeCompare(b.name);
    });

    const handleCharacterClick = async (characterId: string) => {
        if (isStartingChat) return; // Prevent double-clicks

        setIsStartingChat(characterId);
        try {
            // Use the same approach as CharacterBrowser
            const existing = await commands.findConversationByCharacter(characterId);

            if (existing) {
                navigate(`/chat/${existing.id}`);
            } else {
                // Create a new conversation
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
        <div className="w-56 flex flex-col bg-surface-50 border-r border-surface-200 h-full">
            {/* Header */}
            <div className="px-4 py-3 border-b border-surface-200">
                <div className="flex items-center gap-2">
                    <Avatar
                        fallback="M"
                        size="sm"
                        className="bg-gradient-to-br from-teal-400 to-teal-500"
                    />
                    <span className="font-medium text-surface-800">Mear</span>
                </div>
            </div>

            {/* Search (optional) */}
            <div className="px-3 py-2">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full px-3 py-1.5 pl-8 text-sm bg-surface-100 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 text-surface-700 placeholder-surface-400"
                    />
                    <svg className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            {/* Character List */}
            <div className="flex-1 overflow-y-auto px-2 py-1 no-scrollbar">
                {sortedCharacters.map((character) => {
                    const conv = conversations.find(c => c.characters?.some(char => char.id === character.id));
                    const isActive = conv && currentConversationId === conv.id;
                    const isLoading = isStartingChat === character.id;

                    return (
                        <div
                            key={character.id}
                            onClick={() => handleCharacterClick(character.id)}
                            className={cn(
                                'contact-item group',
                                isActive && 'active bg-surface-100',
                                isLoading && 'opacity-50 pointer-events-none'
                            )}
                        >
                            <Avatar
                                src={character.avatarPath}
                                fallback={character.name}
                                size="md"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-surface-800 truncate text-sm">
                                        {character.name}
                                    </span>
                                    <svg className="w-4 h-4 text-surface-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Settings Link */}
            <div className="border-t border-surface-200">
                <div
                    onClick={() => navigate('/settings')}
                    className="contact-item mx-2 my-2"
                >
                    <div className="w-10 h-10 rounded-full bg-surface-200 flex items-center justify-center">
                        <svg className="w-5 h-5 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <span className="font-medium text-surface-700 text-sm">Settings</span>
                    {/* Notification badge */}
                    <span className="w-5 h-5 rounded-full bg-accent-coral text-white text-xs flex items-center justify-center ml-auto">
                        2
                    </span>
                </div>
            </div>

            {/* Current User/Persona */}
            <div className="border-t border-surface-200 px-3 py-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <span className="text-sm font-medium text-surface-700">Tarsh</span>
                </div>
            </div>
        </div>
    );
}
