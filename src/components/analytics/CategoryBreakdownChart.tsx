import { PieChart as PieChartIcon } from 'lucide-react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Card, CardHeader } from '../ui/Card';
import {
  AnalyticsEmptyState,
  AnalyticsErrorState,
  LoadingSkeleton,
} from './AnalyticsStates';
import type { ActivityCategory, CategoryBreakdown } from '../../types/ecotrack';

const CATEGORY_COLORS: Record<ActivityCategory, string> = {
  Transportation: '#176B52',
  Energy: '#F4B860',
  Lifestyle: '#4D8B73',
};

export interface CategoryBreakdownChartProps {
  title?: string;
  description?: string;
  breakdown: CategoryBreakdown | null;
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
}

interface CategoryTooltipPayloadItem {
  payload?: {
    category: ActivityCategory;
    totalEmissionsKg: number;
    percentageShare: number;
    activityCount: number;
  };
}

function CategoryTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: CategoryTooltipPayloadItem[];
}) {
  if (!active || !payload || payload.length === 0 || !payload[0].payload) {
    return null;
  }
  const item = payload[0].payload;
  return (
    <div className="rounded-lg border border-[#E1EAE4] bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-[#18392C]">{item.category}</p>
      <p className="mt-1 font-mono font-semibold text-[#176B52] tabular-nums">
        {item.totalEmissionsKg.toFixed(2)} kg CO₂e ({item.percentageShare.toFixed(1)}%)
      </p>
      <p className="mt-0.5 text-[#64766C]">
        {item.activityCount} {item.activityCount === 1 ? 'activity' : 'activities'}
      </p>
    </div>
  );
}

export function CategoryBreakdownChart({
  title = 'Category Emission Breakdown',
  description = 'Share of carbon emissions across Transportation, Energy, and Lifestyle.',
  breakdown,
  isLoading,
  error,
  onRetry,
}: CategoryBreakdownChartProps) {
  const nonZeroSlices =
    breakdown?.categories.filter((c) => c.totalEmissionsKg > 0) ?? [];
  const hasData = Boolean(
    breakdown && breakdown.hasData && breakdown.totalEmissionsKg > 0 && nonZeroSlices.length > 0
  );

  return (
    <Card className="flex flex-col">
      <CardHeader title={title} description={description} />

      <div className="mt-5 flex-1">
        {isLoading ? (
          <LoadingSkeleton variant="chart" label="Loading category breakdown..." />
        ) : error ? (
          <AnalyticsErrorState message={error} onRetry={onRetry} />
        ) : !breakdown || !hasData ? (
          <AnalyticsEmptyState
            icon={<PieChartIcon className="h-5 w-5" aria-hidden="true" />}
            title="No category emissions for this period"
            description={`No activities with emissions were recorded in ${breakdown?.period.monthLabel ?? 'the selected month'}.`}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-5 items-center">
            <div
              className="h-56 w-full min-w-0 sm:col-span-3"
              role="region"
              aria-label={`Category emission donut chart for ${breakdown.period.monthLabel}`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={nonZeroSlices}
                    dataKey="totalEmissionsKg"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius="54%"
                    outerRadius="82%"
                    paddingAngle={2}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  >
                    {nonZeroSlices.map((entry) => (
                      <Cell
                        key={entry.category}
                        fill={CATEGORY_COLORS[entry.category]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CategoryTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3 sm:col-span-2">
              {breakdown.categories.map((item) => (
                <div
                  key={item.category}
                  className="rounded-lg border border-[#E1EAE4] bg-[#F6F8F3]/60 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLORS[item.category] }}
                        aria-hidden="true"
                      />
                      <span className="text-xs font-semibold text-[#18392C] truncate">
                        {item.category}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-semibold text-[#176B52] tabular-nums">
                      {item.percentageShare.toFixed(1)}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-mono text-[#64766C] tabular-nums">
                    {item.totalEmissionsKg.toFixed(2)} kg CO₂e ({item.activityCount})
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
