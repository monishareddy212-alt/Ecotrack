import { Activity as ActivityIcon, Calendar, Flame, Layers } from 'lucide-react';
import { Card } from '../ui/Card';
import { FormError } from '../ui/FormError';
import { LoadingState } from '../ui/LoadingState';
import type { ActivitySummary as ActivitySummaryData } from '../../types/ecotrack';

export interface ActivitySummaryProps {
  summary: ActivitySummaryData | null;
  isLoading: boolean;
  error?: string | null;
}

export function ActivitySummary({ summary, isLoading, error }: ActivitySummaryProps) {
  if (isLoading) {
    return (
      <Card>
        <LoadingState compact label="Calculating activity summary from PostgreSQL..." />
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <FormError message={error} />
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  const mostRecentLabel = summary.mostRecentActivity
    ? `${summary.mostRecentActivity.activityTypeName} (${summary.mostRecentActivity.activityDate})`
    : 'None recorded';

  return (
    <section aria-label="Activity summary metrics" className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card padding="md">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-[#64766C]">Total Recorded Activities</p>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#DCEDE3] text-[#176B52]">
              <ActivityIcon className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-[#18392C] font-mono tabular-nums">
            {summary.totalActivities}
          </p>
          <p className="mt-1.5 text-xs text-[#64766C]">Saved in PostgreSQL for selected period</p>
        </Card>

        <Card padding="md">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-[#64766C]">Total Emissions</p>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#DCEDE3] text-[#176B52]">
              <Flame className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-[#18392C] font-mono tabular-nums">
            {summary.totalEmissionsKg.toFixed(2)} kg CO₂e
          </p>
          <p className="mt-1.5 text-xs text-[#64766C]">Sum of verified backend calculations</p>
        </Card>

        <Card padding="md">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-[#64766C]">Activity Types Logged</p>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#DCEDE3] text-[#176B52]">
              <Layers className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-[#18392C] font-mono tabular-nums">
            {summary.distinctActivityTypesCount}
          </p>
          <p className="mt-1.5 text-xs text-[#64766C]">Distinct activity types recorded</p>
        </Card>

        <Card padding="md">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-[#64766C]">Most Recent Activity</p>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#DCEDE3] text-[#176B52]">
              <Calendar className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
          <p className="mt-3 text-base font-semibold text-[#18392C] truncate">
            {mostRecentLabel}
          </p>
          <p className="mt-1.5 text-xs text-[#64766C] font-mono tabular-nums">
            {summary.mostRecentActivity
              ? `${summary.mostRecentActivity.calculatedCo2e.toFixed(2)} kg CO₂e`
              : 'No entries yet'}
          </p>
        </Card>
      </div>

      {summary.categoryTotals.length > 0 ? (
        <Card padding="sm">
          <div className="flex flex-wrap items-center justify-between gap-4 px-2 py-1">
            <p className="text-xs font-semibold text-[#64766C]">
              Total Emissions by Category
            </p>
            <div className="flex flex-wrap items-center gap-6">
              {summary.categoryTotals.map((cat) => (
                <div key={cat.category} className="text-xs">
                  <span className="font-medium text-[#18392C]">{cat.category}</span>
                  <span className="mx-1.5 text-[#64766C]" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-mono font-semibold text-[#176B52] tabular-nums">
                    {cat.totalEmissionsKg.toFixed(2)} kg CO₂e
                  </span>
                  <span className="ml-1 text-[#64766C]">({cat.activityCount})</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : null}
    </section>
  );
}
