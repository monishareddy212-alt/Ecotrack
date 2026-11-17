import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { ActivityForm } from './ActivityForm';
import type {
  Activity,
  ActivityType,
  ActivityUpdateRequest,
} from '../../types/ecotrack';

export interface ActivityDetailDialogProps {
  activity: Activity | null;
  onClose: () => void;
}

export function ActivityDetailDialog({ activity, onClose }: ActivityDetailDialogProps) {
  return (
    <Dialog
      open={Boolean(activity)}
      onClose={onClose}
      title={activity ? activity.activityTypeName : 'Activity Details'}
      subtitle={activity ? `${activity.category} · ${activity.activityDate}` : undefined}
      footer={
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {activity ? (
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4 border-b border-[#E1EAE4] pb-2">
            <dt className="text-[#64766C]">Quantity</dt>
            <dd className="font-mono font-medium text-[#18392C] tabular-nums">
              {activity.quantityRaw} {activity.unit}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-[#E1EAE4] pb-2">
            <dt className="text-[#64766C]">Calculated Emissions</dt>
            <dd className="font-mono font-semibold text-[#176B52] tabular-nums">
              {activity.calculatedCo2e.toFixed(2)} kg CO₂e ({activity.calculatedCo2eRaw})
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-[#E1EAE4] pb-2">
            <dt className="text-[#64766C]">Applied Factor</dt>
            <dd className="font-mono text-[#18392C] tabular-nums">
              {activity.emissionFactor.factorKgCo2ePerUnit} kg CO₂e/{activity.emissionFactor.unit}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-[#E1EAE4] pb-2">
            <dt className="text-[#64766C]">Factor Effective Date</dt>
            <dd className="font-mono text-[#18392C] tabular-nums">
              {activity.emissionFactor.effectiveDate}
            </dd>
          </div>
          <div className="space-y-1 pt-1">
            <dt className="text-xs font-semibold text-[#18392C]">Emission Factor Source</dt>
            <dd className="text-xs text-[#64766C] leading-relaxed">
              {activity.emissionFactor.source}
            </dd>
            {activity.emissionFactor.geographicScope ? (
              <dd className="text-xs text-[#64766C]">
                Scope: {activity.emissionFactor.geographicScope}
              </dd>
            ) : null}
          </div>
        </dl>
      ) : null}
    </Dialog>
  );
}

export interface EditActivityDialogProps {
  activity: Activity | null;
  activityTypes: readonly ActivityType[];
  onClose: () => void;
  onSave: (id: string, payload: ActivityUpdateRequest) => Promise<Activity>;
}

export function EditActivityDialog({
  activity,
  activityTypes,
  onClose,
  onSave,
}: EditActivityDialogProps) {
  if (!activity) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18392C]/40 backdrop-blur-[1px]"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-activity-dialog-title"
        className="w-full max-w-2xl rounded-xl border border-[#E1EAE4] bg-white p-6 shadow-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5">
          <p className="text-xs font-semibold text-[#176B52]">Update Record</p>
          <h2
            id="edit-activity-dialog-title"
            className="mt-0.5 text-lg font-semibold text-[#18392C]"
          >
            Edit {activity.activityTypeName}
          </h2>
          <p className="mt-1 text-xs text-[#64766C]">
            Changing only quantity preserves the historical emission factor ({activity.emissionFactor.factorKgCo2ePerUnit} kg CO₂e/{activity.unit}). Changing activity type or date selects the factor effective for that date.
          </p>
        </div>

        <ActivityForm
          activityTypes={activityTypes}
          initialActivity={activity}
          submitLabel="Update Activity"
          showReset={false}
          onCancel={onClose}
          onSubmit={async (payload) => {
            const updated = await onSave(activity.id, payload);
            onClose();
            return updated;
          }}
        />
      </div>
    </div>
  );
}
