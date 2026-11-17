import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { FormError } from '../ui/FormError';
import type { Activity } from '../../types/ecotrack';

export interface DeleteConfirmationDialogProps {
  activity: Activity | null;
  onClose: () => void;
  onConfirm: (activityId: string) => Promise<void>;
}

export function DeleteConfirmationDialog({
  activity,
  onClose,
  onConfirm,
}: DeleteConfirmationDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!activity) return;
    setError(null);
    setIsDeleting(true);
    try {
      await onConfirm(activity.id);
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to delete the selected activity.';
      setError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog
      open={Boolean(activity)}
      onClose={() => {
        if (!isDeleting) {
          setError(null);
          onClose();
        }
      }}
      title="Delete Activity Record"
      subtitle="Permanent Action"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span>Confirm Delete</span>
              </>
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p>
          Are you sure you want to permanently remove this activity log from your history?
        </p>

        {activity ? (
          <div className="rounded-lg border border-[#E1EAE4] bg-[#F6F8F3] p-3.5 text-xs text-[#18392C] space-y-1">
            <p className="font-semibold text-sm">{activity.activityTypeName}</p>
            <p>
              {activity.category} · {activity.activityDate}
            </p>
            <p className="font-mono tabular-nums">
              {activity.quantity} {activity.unit} — {activity.calculatedCo2e.toFixed(2)} kg CO₂e
            </p>
          </div>
        ) : null}

        <FormError message={error} />
      </div>
    </Dialog>
  );
}
