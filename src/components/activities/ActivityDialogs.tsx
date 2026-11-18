import React from 'react';
import {
  Calculator,
  Sparkles,
  Leaf,
  Calendar,
  Database,
  Info,
  CheckCircle2,
  Tag,
  ExternalLink,
} from 'lucide-react';
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
  if (!activity) return null;

  const categoryColor =
    activity.category === 'Transportation'
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : activity.category === 'Energy'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';

  return (
    <Dialog
      open={Boolean(activity)}
      onClose={onClose}
      title={activity.activityTypeName}
      subtitle={`${activity.category} · Logged Activity Breakdown`}
      maxWidth="xl"
      footer={
        <Button variant="primary" onClick={onClose}>
          Close Details
        </Button>
      }
    >
      <div className="space-y-5 text-sm text-[#18392C]">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${categoryColor}`}
          >
            <Tag className="h-3 w-3" aria-hidden="true" />
            {activity.category}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#F6F8F3] text-[#64766C] border border-[#E1EAE4]">
            <Calendar className="h-3 w-3" aria-hidden="true" />
            Activity Date: {activity.activityDate}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#F6F8F3] text-[#64766C] border border-[#E1EAE4]">
            <Database className="h-3 w-3" aria-hidden="true" />
            Record #{activity.id}
          </span>
        </div>

        {/* 1. Hero Result Card */}
        <div className="rounded-xl border border-[#176B52]/20 bg-[#F6F8F3] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#176B52] uppercase tracking-wide">
              <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Total Calculated Carbon Footprint</span>
            </div>
            <p className="text-xs text-[#64766C]">
              Greenhouse gas released into the atmosphere by this activity
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-2xl font-bold font-mono text-[#176B52] tracking-tight tabular-nums">
              {activity.calculatedCo2e.toFixed(2)}{' '}
              <span className="text-base font-normal text-[#18392C]">kg CO₂e</span>
            </p>
            <p className="text-[11px] font-mono text-[#64766C] tabular-nums">
              Exact database value: {activity.calculatedCo2eRaw} kg
            </p>
          </div>
        </div>

        {/* 2. Visual Math Formula (How it was calculated) */}
        <div className="rounded-xl border border-[#E1EAE4] bg-white p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-[#176B52]" aria-hidden="true" />
            <h3 className="font-semibold text-[#18392C] text-xs uppercase tracking-wider">
              How It Was Calculated (Formula)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 items-center gap-2 text-center">
            {/* Box 1: Quantity */}
            <div className="sm:col-span-2 rounded-lg border border-[#E1EAE4] bg-[#F6F8F3] p-2.5">
              <p className="text-[11px] font-medium text-[#64766C]">Quantity Entered</p>
              <p className="text-base font-bold font-mono text-[#18392C] tabular-nums mt-0.5">
                {activity.quantityRaw} {activity.unit}
              </p>
              <p className="text-[10px] text-[#64766C] mt-0.5">How much you did</p>
            </div>

            {/* Multiply Sign */}
            <div className="sm:col-span-1 flex items-center justify-center">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E1EAE4] text-xs font-bold text-[#18392C]">
                ×
              </span>
            </div>

            {/* Box 2: Emission Factor */}
            <div className="sm:col-span-2 rounded-lg border border-[#E1EAE4] bg-[#F6F8F3] p-2.5">
              <p className="text-[11px] font-medium text-[#64766C]">Emission Factor (Rate)</p>
              <p className="text-base font-bold font-mono text-[#18392C] tabular-nums mt-0.5">
                {activity.emissionFactor.factorKgCo2ePerUnit}
              </p>
              <p className="text-[10px] text-[#64766C] mt-0.5">
                kg CO₂e per 1 {activity.emissionFactor.unit}
              </p>
            </div>
          </div>

          {/* Simple summary pill */}
          <div className="rounded-lg bg-[#EBF5F0] border border-[#176B52]/20 px-3 py-2 text-xs text-[#176B52] font-mono flex items-center justify-center gap-2 text-center">
            <span>
              {activity.quantityRaw} {activity.unit} × {activity.emissionFactor.factorKgCo2ePerUnit} kg/{activity.emissionFactor.unit} = <strong>{activity.calculatedCo2e.toFixed(2)} kg CO₂e</strong>
            </span>
          </div>
        </div>

        {/* 3. Kid-Friendly Explanation (Easy to explain to anyone) */}
        <div className="rounded-xl border border-[#F4B860]/40 bg-[#FEF9EE] p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#B45309]" aria-hidden="true" />
            <h3 className="font-semibold text-[#B45309] text-xs uppercase tracking-wider">
              Easy Explanation (Simple Words for Presentation)
            </h3>
          </div>
          <ul className="space-y-1.5 text-xs text-[#18392C] leading-relaxed list-disc list-inside">
            <li>
              <strong>Your action:</strong> You recorded{' '}
              <span className="font-semibold">
                {activity.quantityRaw} {activity.unit}
              </span>{' '}
              of <strong>{activity.activityTypeName}</strong> on {activity.activityDate}.
            </li>
            <li>
              <strong>The pollution rate:</strong> Scientists have measured that every single{' '}
              <span className="font-semibold">1 {activity.unit}</span> releases{' '}
              <span className="font-semibold font-mono">
                {activity.emissionFactor.factorKgCo2ePerUnit} kg
              </span>{' '}
              of invisible greenhouse gas into the atmosphere.
            </li>
            <li>
              <strong>The result:</strong> By multiplying the quantity by the pollution rate, your activity produced{' '}
              <span className="font-semibold text-[#176B52]">
                {activity.calculatedCo2e.toFixed(2)} kg of carbon emissions
              </span>.
            </li>
          </ul>
        </div>

        {/* 4. Official Data Source & Scientific Provenance */}
        <div className="rounded-xl border border-[#E1EAE4] bg-[#F6F8F3] p-4 space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#176B52]" aria-hidden="true" />
            <h3 className="font-semibold text-[#18392C] uppercase tracking-wider text-[11px]">
              Scientific Data Source & Verification
            </h3>
          </div>
          <div className="space-y-1.5 pl-6 text-[#64766C]">
            <p>
              <strong className="text-[#18392C]">Data Publisher:</strong>{' '}
              {activity.emissionFactor.source}
            </p>
            {activity.emissionFactor.geographicScope ? (
              <p>
                <strong className="text-[#18392C]">Geographic Scope:</strong>{' '}
                {activity.emissionFactor.geographicScope}
              </p>
            ) : null}
            <p>
              <strong className="text-[#18392C]">Effective Date:</strong>{' '}
              {activity.emissionFactor.effectiveDate}
            </p>
            <p className="text-[11px] text-[#176B52] italic pt-1 border-t border-[#E1EAE4]">
              Verified in MySQL Third Normal Form (3NF) relational tables: reconstructed dynamically via an INNER JOIN across activity_logs, emission_factors, and activity_types.
            </p>
          </div>
        </div>
      </div>
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
