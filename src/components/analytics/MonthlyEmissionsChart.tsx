import { Link } from 'react-router-dom';
import { BarChart3, Plus } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardHeader } from '../ui/Card';
import {
  AnalyticsEmptyState,
  AnalyticsErrorState,
  LoadingSkeleton,
} from './AnalyticsStates';
import type { MonthlyTrend } from '../../types/ecotrack';

export interface MonthlyEmissionsChartProps {
  title?: string;
  description?: string;
  trend: MonthlyTrend | null;
  range: 6 | 12;
  onRangeChange: (nextRange: 6 | 12) => void;
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
}

interface MonthlyTooltipPayloadItem {
  payload?: {
    monthLabel: string;
    totalEmissionsKg: number;
    activityCount: number;
  };
}

function MonthlyTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: MonthlyTooltipPayloadItem[];
}) {
  if (!active || !payload || payload.length === 0 || !payload[0].payload) {
    return null;
  }
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-[#E1EAE4] bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-[#18392C]">{point.monthLabel}</p>
      <p className="mt-1 font-mono font-semibold text-[#176B52] tabular-nums">
        {point.totalEmissionsKg.toFixed(2)} kg CO₂e
      </p>
      <p className="mt-0.5 text-[#64766C]">
        {point.activityCount} recorded {point.activityCount === 1 ? 'activity' : 'activities'}
      </p>
    </div>
  );
}

export function MonthlyEmissionsChart({
  title = 'Monthly Emission Trend',
  description = 'Total estimated carbon emissions grouped by calendar month (kg CO₂e).',
  trend,
  range,
  onRangeChange,
  isLoading,
  error,
  onRetry,
}: MonthlyEmissionsChartProps) {
  const hasData = Boolean(trend && trend.hasData);

  return (
    <Card className="flex flex-col">
      <CardHeader
        title={title}
        description={description}
        action={
          <div
            role="group"
            aria-label="Monthly trend timeframe"
            className="inline-flex items-center gap-1 rounded-lg border border-[#E1EAE4] bg-[#F6F8F3] p-1"
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
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52]',
                    active
                      ? 'bg-white text-[#18392C] shadow-xs'
                      : 'text-[#64766C] hover:text-[#18392C]',
                  ].join(' ')}
                >
                  Last {option}M
                </button>
              );
            })}
          </div>
        }
      />

      <div className="mt-5 flex-1">
        {isLoading ? (
          <LoadingSkeleton variant="chart" label="Loading monthly emission trend..." />
        ) : error ? (
          <AnalyticsErrorState message={error} onRetry={onRetry} />
        ) : !trend || !hasData ? (
          <AnalyticsEmptyState
            icon={<BarChart3 className="h-5 w-5" aria-hidden="true" />}
            title={`No emissions recorded in the last ${range} months`}
            description="All calendar months in this window currently sum to 0.00 kg CO₂e. Log an activity to visualize monthly progress."
            action={
              <Link
                to="/add-activity"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#DCEDE3] px-3.5 py-2 text-xs font-semibold text-[#18392C] hover:bg-[#CCE3D5] transition-colors whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Log Activity
              </Link>
            }
          />
        ) : (
          <div
            className="h-64 w-full min-w-0"
            role="region"
            aria-label={`Monthly carbon emissions bar chart for the last ${range} months`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={trend.points}
                margin={{ top: 8, right: 12, left: -8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2EAE5" vertical={false} />
                <XAxis
                  dataKey="shortLabel"
                  tick={{ fill: '#64766C', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval={range === 12 ? 1 : 0}
                />
                <YAxis
                  tick={{ fill: '#64766C', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val: number) => `${val}`}
                  unit=" kg"
                  width={56}
                />
                <Tooltip
                  cursor={{ fill: '#DCEDE3', fillOpacity: 0.35 }}
                  content={<MonthlyTooltip />}
                />
                <Bar
                  dataKey="totalEmissionsKg"
                  name="Emissions (kg CO₂e)"
                  fill="#176B52"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}
