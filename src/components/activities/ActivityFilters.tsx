import { useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import type {
  ActivityCategory,
  ActivitySortOption,
  ActivityType,
} from '../../types/ecotrack';

export interface ActivityFilterState {
  search: string;
  category: ActivityCategory | 'All';
  activityTypeId: string;
  startDate: string;
  endDate: string;
  minEmissions: string;
  maxEmissions: string;
  sort: ActivitySortOption;
}

export interface ActivityFiltersProps {
  filters: ActivityFilterState;
  activityTypes: readonly ActivityType[];
  onChange: (next: ActivityFilterState) => void;
  onClear: () => void;
}

export function ActivityFilters({
  filters,
  activityTypes,
  onChange,
  onClear,
}: ActivityFiltersProps) {
  const availableTypeOptions = useMemo(() => {
    const filtered =
      filters.category === 'All'
        ? activityTypes
        : activityTypes.filter((item) => item.category === filters.category);

    return [
      { value: '', label: 'All Activity Types' },
      ...filtered.map((item) => ({ value: item.id, label: item.name })),
    ];
  }, [activityTypes, filters.category]);

  const hasActiveFilters = Boolean(
    filters.search.trim() ||
      filters.category !== 'All' ||
      filters.activityTypeId ||
      filters.startDate ||
      filters.endDate ||
      filters.minEmissions.trim() ||
      filters.maxEmissions.trim() ||
      filters.sort !== 'date_desc'
  );

  return (
    <Card>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          label="Search activities"
          type="search"
          name="search"
          placeholder="Search by type, category, or source..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          rightAdornment={<Search className="h-4 w-4 text-[#64766C]" aria-hidden="true" />}
        />

        <Select
          label="Category"
          name="filterCategory"
          value={filters.category}
          onChange={(e) =>
            onChange({
              ...filters,
              category: e.target.value as ActivityCategory | 'All',
              activityTypeId: '',
            })
          }
          options={[
            { value: 'All', label: 'All Categories' },
            { value: 'Transportation', label: 'Transportation' },
            { value: 'Energy', label: 'Energy' },
            { value: 'Lifestyle', label: 'Lifestyle' },
          ]}
        />

        <Select
          label="Activity Type"
          name="filterActivityType"
          value={filters.activityTypeId}
          onChange={(e) => onChange({ ...filters, activityTypeId: e.target.value })}
          options={availableTypeOptions}
        />

        <Select
          label="Sort order"
          name="sort"
          value={filters.sort}
          onChange={(e) =>
            onChange({ ...filters, sort: e.target.value as ActivitySortOption })
          }
          options={[
            { value: 'date_desc', label: 'Newest first' },
            { value: 'date_asc', label: 'Oldest first' },
            { value: 'emissions_desc', label: 'Highest emissions' },
            { value: 'emissions_asc', label: 'Lowest emissions' },
          ]}
        />

        <Input
          label="Start date"
          name="startDate"
          type="date"
          value={filters.startDate}
          onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
        />

        <Input
          label="End date"
          name="endDate"
          type="date"
          value={filters.endDate}
          onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
        />

        <Input
          label="Min emissions (kg CO₂e)"
          name="minEmissions"
          type="number"
          min="0"
          step="any"
          placeholder="e.g. 5"
          value={filters.minEmissions}
          onChange={(e) => onChange({ ...filters, minEmissions: e.target.value })}
        />

        <Input
          label="Max emissions (kg CO₂e)"
          name="maxEmissions"
          type="number"
          min="0"
          step="any"
          placeholder="e.g. 250"
          value={filters.maxEmissions}
          onChange={(e) => onChange({ ...filters, maxEmissions: e.target.value })}
        />
      </div>

      {hasActiveFilters ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E1EAE4]">
          <p className="text-xs text-[#64766C]">
            Filtering activity records via PostgreSQL query parameters.
          </p>
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Clear filters</span>
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
