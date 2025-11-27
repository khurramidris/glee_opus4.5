import { memo } from 'react';
import type { Persona } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';

interface PersonaCardProps {
  persona: Persona;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}

export const PersonaCard = memo(function PersonaCard({
  persona,
  onEdit,
  onDelete,
  onSetDefault,
}: PersonaCardProps) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Avatar fallback={persona.name} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-surface-100 truncate">
                {persona.name}
              </h3>
              {persona.isDefault && (
                <Badge variant="primary" size="sm">Default</Badge>
              )}
            </div>
            <p className="text-sm text-surface-400 mt-1 line-clamp-2">
              {persona.description || 'No description'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex border-t border-surface-700">
        {!persona.isDefault && (
          <>
            <button
              onClick={onSetDefault}
              className="flex-1 px-4 py-2.5 text-sm text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-colors"
            >
              Set Default
            </button>
            <div className="w-px bg-surface-700" />
          </>
        )}
        <button
          onClick={onEdit}
          className="flex-1 px-4 py-2.5 text-sm text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-colors"
        >
          Edit
        </button>
        <div className="w-px bg-surface-700" />
        <button
          onClick={onDelete}
          className="px-4 py-2.5 text-surface-400 hover:text-red-400 hover:bg-surface-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </Card>
  );
});
