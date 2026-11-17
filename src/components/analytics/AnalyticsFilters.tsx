import { Card } from '../ui/Card';
import { Select } from '../ui/Select';

const MONTH_OPTIONS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export interface AnalyticsFiltersProps {
  year: number;
  month: number;
  range: 6 | 12;
  availableYears: readonly number[];
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onRangeChange: (range: 6 | 12) => void;
}

export function AnalyticsFilters({
  year,
  month,
  range,
  availableYears,
  onYearChange,
  onMonthChange,
  onRangeChange,
}: AnalyticsFiltersProps) {
  return (
    <Card padding="md">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 items-end">
        <Select
          label="Month"
          name="analyticsMonth"
          value={String(month)}
          onChange={(e) => onMonthChange(Number(e.target.value))}
          options={MONTH_OPTIONS}
        />

        <Select
          label="Year"
          name="analyticsYear"
          value={String(year)}
          onChange={(e) => onYearChange(Number(e.target.value))}
          options={availableYears.map((y) => ({ value: String(y), label: String(y) }))}
        />

        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-[#18392C]">
            Monthly Trend Range
          </span>
          <div
            role="group"
            aria-label="Monthly chart range"
            className="grid grid-cols-2 gap-1 rounded-lg border border-[#D4E0D8] bg-[#F6F8F3] p-1"
          >
            {([6, 12] as const).map((option) => {
              const active = range === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onRangeChange(option)}
                  className={[
                    'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52]',
                    active
                      ? 'bg-[#176B52] text-white'
                      : 'text-[#64766C] hover:text-[#18392C]',
                  ].join(' ')}
                >
                  Last {option} Months
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
