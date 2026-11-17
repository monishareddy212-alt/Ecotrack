import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Info, Loader2, RotateCcw, Save } from 'lucide-react';
import { Button } from '../ui/Button';
import { FormError } from '../ui/FormError';
import { Input } from '../ui/Input';
import { ActivityTypeSelect } from './ActivityTypeSelect';
import type {
  Activity,
  ActivityCategory,
  ActivityCreateRequest,
  ActivityType,
  FieldErrors,
} from '../../types/ecotrack';
import { getTodayIsoDate } from '../../utils/activityCatalog';

export interface ActivityFormProps {
  activityTypes: readonly ActivityType[];
  initialActivity?: Activity | null;
  submitLabel?: string;
  onSubmit: (payload: ActivityCreateRequest) => Promise<Activity>;
  onCancel?: () => void;
  showReset?: boolean;
}

export function ActivityForm({
  activityTypes,
  initialActivity = null,
  submitLabel = 'Save Activity',
  onSubmit,
  onCancel,
  showReset = true,
}: ActivityFormProps) {
  const [category, setCategory] = useState<ActivityCategory | ''>('');
  const [activityTypeId, setActivityTypeId] = useState('');
  const [unit, setUnit] = useState('');
  const [quantity, setQuantity] = useState('');
  const [activityDate, setActivityDate] = useState(getTodayIsoDate());
  const [errors, setErrors] = useState<
    FieldErrors<'category' | 'activityTypeId' | 'quantity' | 'activityDate'>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const [savedActivity, setSavedActivity] = useState<Activity | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialActivity) {
      setCategory(initialActivity.category);
      setActivityTypeId(initialActivity.activityTypeId);
      setUnit(initialActivity.unit);
      setQuantity(initialActivity.quantityRaw);
      setActivityDate(initialActivity.activityDate);
      setErrors({});
      setFormError(null);
      return;
    }

    if (activityTypes.length > 0 && !activityTypeId) {
      const first = activityTypes[0];
      setCategory(first.category);
      setActivityTypeId(first.id);
      setUnit(first.unit);
    }
  }, [initialActivity, activityTypes, activityTypeId]);

  const selectedType = useMemo(
    () => activityTypes.find((item) => item.id === activityTypeId),
    [activityTypes, activityTypeId]
  );

  const handleCategoryChange = (nextCategory: ActivityCategory) => {
    const firstInCat = activityTypes.find((item) => item.category === nextCategory);
    setCategory(nextCategory);
    setActivityTypeId(firstInCat?.id ?? '');
    setUnit(firstInCat?.unit ?? '');
    setErrors((prev) => ({ ...prev, category: undefined, activityTypeId: undefined }));
    setFormError(null);
    setSavedActivity(null);
  };

  const handleActivityTypeChange = (nextType: ActivityType) => {
    setActivityTypeId(nextType.id);
    setUnit(nextType.unit);
    setErrors((prev) => ({ ...prev, activityTypeId: undefined }));
    setFormError(null);
    setSavedActivity(null);
  };

  const handleReset = () => {
    if (initialActivity) {
      setCategory(initialActivity.category);
      setActivityTypeId(initialActivity.activityTypeId);
      setUnit(initialActivity.unit);
      setQuantity(initialActivity.quantityRaw);
      setActivityDate(initialActivity.activityDate);
    } else if (activityTypes.length > 0) {
      const first = activityTypes[0];
      setCategory(first.category);
      setActivityTypeId(first.id);
      setUnit(first.unit);
      setQuantity('');
      setActivityDate(getTodayIsoDate());
    }
    setErrors({});
    setFormError(null);
    setSavedActivity(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSavedActivity(null);

    const nextErrors: FieldErrors<'category' | 'activityTypeId' | 'quantity' | 'activityDate'> =
      {};

    if (!category) {
      nextErrors.category = 'Please select an activity category.';
    }
    if (!activityTypeId) {
      nextErrors.activityTypeId = 'Please select an activity type.';
    }

    const trimmedQty = quantity.trim();
    const numericQty = Number(trimmedQty);
    if (!trimmedQty || Number.isNaN(numericQty) || numericQty <= 0) {
      nextErrors.quantity = 'Enter a quantity greater than 0.';
    } else if (numericQty > 1_000_000) {
      nextErrors.quantity = 'Quantity must be 1,000,000 or less.';
    }

    if (!activityDate.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(activityDate)) {
      nextErrors.activityDate = 'Select a valid calendar date.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onSubmit({
        activityTypeId,
        quantity: trimmedQty,
        unit,
        activityDate,
      });
      setSavedActivity(result);
      if (!initialActivity) {
        setQuantity('');
      }
    } catch (error: unknown) {
      const maybeObj = error as { message?: string; fields?: Record<string, string> };
      if (maybeObj?.fields) {
        setErrors(
          maybeObj.fields as FieldErrors<
            'category' | 'activityTypeId' | 'quantity' | 'activityDate'
          >
        );
      }
      setFormError(
        maybeObj?.message || 'Unable to save activity. Please verify your entries and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <FormError message={formError} />

      {savedActivity ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-lg border border-[#BCE0CA] bg-[#DCEDE3]/70 px-4 py-3.5 text-sm text-[#18392C]"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[#176B52] mt-0.5" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-semibold">
              Saved {savedActivity.activityTypeName} ({savedActivity.quantity} {savedActivity.unit})
            </p>
            <p className="mt-1 text-xs text-[#18392C]">
              Estimated emissions:{' '}
              <span className="font-mono font-semibold tabular-nums">
                {savedActivity.calculatedCo2e.toFixed(2)} kg CO₂e
              </span>{' '}
              ({savedActivity.calculatedCo2eRaw} kg CO₂e exact)
            </p>
            <p className="mt-0.5 text-xs text-[#64766C]">
              Source: {savedActivity.emissionFactor.source}
            </p>
          </div>
        </div>
      ) : null}

      <ActivityTypeSelect
        activityTypes={activityTypes}
        selectedCategory={category}
        selectedActivityTypeId={activityTypeId}
        onCategoryChange={handleCategoryChange}
        onActivityTypeChange={handleActivityTypeChange}
        categoryError={errors.category}
        activityTypeError={errors.activityTypeId}
        disabled={isSubmitting}
      />

      {selectedType && !selectedType.hasEmissionFactor ? (
        <div
          role="note"
          className="flex items-start gap-2.5 rounded-lg border border-[#F4B860] bg-[#FEF9EE] px-3.5 py-3 text-xs text-[#18392C]"
        >
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-[#B45309]" aria-hidden="true" />
          <div>
            <p className="font-semibold">Emission factor unavailable for this activity.</p>
            <p className="mt-0.5 text-[#64766C] leading-relaxed">
              Meal lifecycle emissions vary substantially by food composition and production methods (any regional meal-based estimates are approximate), so no arbitrary constant is seeded. See the DBMS documentation to configure a regional factor if needed.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Input
          label="Quantity"
          name="quantity"
          type="number"
          step="any"
          min="0.001"
          placeholder="0.00"
          value={quantity}
          disabled={isSubmitting}
          onChange={(e) => {
            setQuantity(e.target.value);
            if (errors.quantity) setErrors((prev) => ({ ...prev, quantity: undefined }));
          }}
          error={errors.quantity}
          required
        />

        <Input
          label="Measurement Unit"
          name="unit"
          type="text"
          value={unit}
          readOnly
          disabled
          hint="Set automatically from activity_types"
        />

        <Input
          label="Activity Date"
          name="activityDate"
          type="date"
          value={activityDate}
          disabled={isSubmitting}
          onChange={(e) => {
            setActivityDate(e.target.value);
            if (errors.activityDate) {
              setErrors((prev) => ({ ...prev, activityDate: undefined }));
            }
          }}
          error={errors.activityDate}
          required
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-[#E1EAE4]">
        {onCancel ? (
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        ) : null}
        {showReset ? (
          <Button variant="outline" onClick={handleReset} disabled={isSubmitting}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Reset</span>
          </Button>
        ) : null}
        <Button type="submit" variant="primary" disabled={isSubmitting || activityTypes.length === 0}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" aria-hidden="true" />
              <span>{submitLabel}</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
