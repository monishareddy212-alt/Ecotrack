import { useMemo } from 'react';
import { Select } from '../ui/Select';
import type { ActivityCategory, ActivityType } from '../../types/ecotrack';

export interface ActivityTypeSelectProps {
  activityTypes: readonly ActivityType[];
  selectedCategory: ActivityCategory | '';
  selectedActivityTypeId: string;
  onCategoryChange: (category: ActivityCategory) => void;
  onActivityTypeChange: (activityType: ActivityType) => void;
  categoryError?: string;
  activityTypeError?: string;
  disabled?: boolean;
}

export function ActivityTypeSelect({
  activityTypes,
  selectedCategory,
  selectedActivityTypeId,
  onCategoryChange,
  onActivityTypeChange,
  categoryError,
  activityTypeError,
  disabled = false,
}: ActivityTypeSelectProps) {
  const categories = useMemo(() => {
    const seen = new Set<ActivityCategory>();
    const list: ActivityCategory[] = [];
    for (const item of activityTypes) {
      if (!seen.has(item.category)) {
        seen.add(item.category);
        list.push(item.category);
      }
    }
    return list;
  }, [activityTypes]);

  const filteredTypes = useMemo(() => {
    if (!selectedCategory) return [];
    return activityTypes.filter((item) => item.category === selectedCategory);
  }, [activityTypes, selectedCategory]);

  const selectedType = useMemo(
    () => activityTypes.find((item) => item.id === selectedActivityTypeId),
    [activityTypes, selectedActivityTypeId]
  );

  const hintText = selectedType
    ? selectedType.hasEmissionFactor
      ? selectedType.latestFactorSource ?? `Measured in ${selectedType.unit}`
      : 'Emission factor unavailable for this activity.'
    : undefined;

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <Select
        label="Activity Category"
        name="category"
        value={selectedCategory}
        disabled={disabled || categories.length === 0}
        onChange={(e) => onCategoryChange(e.target.value as ActivityCategory)}
        placeholder={categories.length === 0 ? 'Loading categories...' : 'Select a category'}
        options={categories.map((cat) => ({ value: cat, label: cat }))}
        error={categoryError}
        required
      />

      <Select
        label="Activity Type"
        name="activityTypeId"
        value={selectedActivityTypeId}
        disabled={disabled || filteredTypes.length === 0}
        onChange={(e) => {
          const matched = filteredTypes.find((t) => t.id === e.target.value);
          if (matched) onActivityTypeChange(matched);
        }}
        placeholder={filteredTypes.length === 0 ? 'Select a category first' : 'Select activity type'}
        options={filteredTypes.map((type) => ({
          value: type.id,
          label: `${type.name} (${type.unit})`,
        }))}
        hint={hintText}
        error={activityTypeError}
        required
      />
    </div>
  );
}
