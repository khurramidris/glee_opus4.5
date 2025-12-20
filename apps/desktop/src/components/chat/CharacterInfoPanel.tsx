import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Character } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useChatStore } from '@/stores/chatStore';
import { cn } from '@/lib/utils';

interface CharacterInfoPanelProps {
    character: Character;
}

export function CharacterInfoPanel({ character }: CharacterInfoPanelProps) {
    const navigate = useNavigate();
    const { conversationId } = useParams<{ conversationId: string }>();
    const clearMessages = useChatStore((s) => s.clearMessages);
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);

    const handleEditCharacter = () => {
        navigate(`/characters/${character.id}/edit`);
    };


    const handleClearChat = () => {
        if (!conversationId) return;
        setIsClearModalOpen(true);
    };

    const confirmClear = async () => {
        if (!conversationId) return;
        await clearMessages(conversationId);
        setIsClearModalOpen(false);
    };

    const InfoSection = ({
        label,
        content
    }: {
        label: string;
        content: string | string[] | undefined;
    }) => {
        if (!content || (Array.isArray(content) && content.length === 0)) return null;

        const displayContent = Array.isArray(content) ? content.join(', ') : content;

        return (
            <div className="space-y-1">
                <dt className="text-xs font-medium text-white/40 uppercase tracking-wider">
                    {label}
                </dt>
                <dd className="text-sm text-white/80 leading-relaxed">
                    {displayContent}
                </dd>
            </div>
        );
    };

    return (
        <div className="w-72 flex flex-col panel rounded-2xl h-full overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/5">
                <h2 className="text-sm font-semibold text-white/90 font-display">
                    Character Details
                </h2>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar">
                {/* Character Avatar & Name */}
                <div className="flex flex-col items-center pt-6 pb-5 px-5">
                    <div className="relative mb-4">
                        <div className="absolute -inset-3 bg-gradient-to-tr from-primary-500/30 to-secondary-500/20 rounded-full blur-xl" />
                        <Avatar
                            src={character.avatarPath}
                            fallback={character.name}
                            size="2xl"
                            className="relative ring-4 ring-white/20"
                        />
                    </div>
                    <h3 className="text-lg font-semibold text-white font-display text-center">
                        {character.name}
                    </h3>

                    {/* Tags */}
                    {character.tags && character.tags.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                            {character.tags.slice(0, 4).map((tag) => (
                                <Badge key={tag} size="sm" variant="primary">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="mx-5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                {/* Info Sections */}
                <dl className="px-5 py-4 space-y-4">
                    <InfoSection label="Description" content={character.description} />
                    <InfoSection label="Scenario" content={character.scenario} />
                    <InfoSection label="Backstory" content={character.backstory} />
                    <InfoSection label="Personality" content={character.personality} />
                    <InfoSection label="Likes" content={character.likes} />
                    <InfoSection label="Dislikes" content={character.dislikes} />
                    <InfoSection label="Physical Traits" content={character.physicalTraits} />
                    <InfoSection label="Speech Patterns" content={character.speechPatterns} />
                </dl>
            </div>

            {/* Action Buttons */}
            <div className="px-4 py-4 border-t border-white/5 space-y-2">
                <ActionButton onClick={handleEditCharacter} icon="edit">
                    Edit Character
                </ActionButton>
                <ActionButton onClick={handleClearChat} icon="clear" variant="danger">
                    Clear Chat
                </ActionButton>
            </div>

            <Modal
                isOpen={isClearModalOpen}
                onClose={() => setIsClearModalOpen(false)}
                title="Clear Chat History"
                size="sm"
            >
                <div className="space-y-4">
                    <p className="text-sm text-surface-500">
                        Are you sure you want to clear your chat history with <span className="text-white font-medium">{character.name}</span>? This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button
                            variant="secondary"
                            onClick={() => setIsClearModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={confirmClear}
                        >
                            Clear History
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

interface ActionButtonProps {
    onClick: () => void;
    icon: 'edit' | 'history' | 'clear';
    variant?: 'default' | 'danger';
    children: React.ReactNode;
}

function ActionButton({ onClick, icon, variant = 'default', children }: ActionButtonProps) {
    const icons = {
        edit: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
        ),
        history: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        clear: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
        ),
    };

    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-150",
                "flex items-center justify-center gap-2",
                "active:scale-[0.98]",
                variant === 'danger'
                    ? "bg-white/5 hover:bg-danger/20 border border-white/10 hover:border-danger/30 text-white/70 hover:text-danger-light"
                    : "bg-white/8 hover:bg-white/12 border border-white/10 hover:border-white/20 text-white/80 hover:text-white"
            )}
        >
            {icons[icon]}
            {children}
        </button>
    );
}