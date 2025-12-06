import { useState } from 'react';
import { useLorebooks } from '@/hooks/useLorebooks';
import { commands } from '@/lib/commands';
import { useUIStore } from '@/stores/uiStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { Badge } from '@/components/ui/Badge';

interface LorebookAttacherProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  attachedLorebookIds: string[];
  onUpdate: () => void;
}

export function LorebookAttacher({
  isOpen,
  onClose,
  conversationId,
  attachedLorebookIds,
  onUpdate,
}: LorebookAttacherProps) {
  const { lorebooks } = useLorebooks();
  const { addToast } = useUIStore();
  const [pending, setPending] = useState<Set<string>>(new Set());

  const handleToggle = async (lorebookId: string, attach: boolean) => {
    setPending((prev) => new Set(prev).add(lorebookId));
    try {
      if (attach) {
        await commands.attachToConversation(conversationId, lorebookId);
      } else {
        await commands.detachFromConversation(conversationId, lorebookId);
      }
      onUpdate();
    } catch (e) {
      addToast({ type: 'error', message: `Failed to update: ${e}` });
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(lorebookId);
        return next;
      });
    }
  };

  const nonGlobalLorebooks = lorebooks.filter((lb) => !lb.isGlobal && lb.isEnabled);
  const globalLorebooks = lorebooks.filter((lb) => lb.isGlobal && lb.isEnabled);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Lorebooks" size="md">
      <div className="space-y-6">
        {/* Global Lorebooks */}
        {globalLorebooks.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-surface-500 mb-2">
              Global Lorebooks (always active)
            </h4>
            <div className="space-y-2">
              {globalLorebooks.map((lb) => (
                <div
                  key={lb.id}
                  className="flex items-center justify-between p-3 bg-surface-100 rounded-lg border border-surface-200"
                >
                  <div>
                    <p className="font-medium text-surface-900">{lb.name}</p>
                    <p className="text-sm text-surface-500">{lb.entries.length} entries</p>
                  </div>
                  <Badge variant="primary">Global</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attachable Lorebooks */}
        <div>
          <h4 className="text-sm font-medium text-surface-500 mb-2">
            Available Lorebooks
          </h4>
          {nonGlobalLorebooks.length === 0 ? (
            <p className="text-surface-500 text-sm">
              No lorebooks available. Create a lorebook first.
            </p>
          ) : (
            <div className="space-y-2">
              {nonGlobalLorebooks.map((lb) => {
                const isAttached = attachedLorebookIds.includes(lb.id);
                const isPending = pending.has(lb.id);

                return (
                  <div
                    key={lb.id}
                    className="flex items-center justify-between p-3 bg-surface-100 rounded-lg border border-surface-200"
                  >
                    <div>
                      <p className="font-medium text-surface-900">{lb.name}</p>
                      <p className="text-sm text-surface-500">{lb.entries.length} entries</p>
                    </div>
                    <Toggle
                      checked={isAttached}
                      onChange={(checked) => handleToggle(lb.id, checked)}
                      disabled={isPending}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <Button onClick={onClose}>Done</Button>
      </div>
    </Modal>
  );
}
