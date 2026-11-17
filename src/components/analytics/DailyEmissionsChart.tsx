import { Link } from 'react-router-dom';
import { CalendarRange, Plus } from 'lucide-react';
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
import type { DailyTrend } from '../../types/ecotrack';

export interface DailyEmissionsChartProps {
  title?: string;
  description?: string;
  dailyTrend: DailyTrend | null;
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
}

interface DailyTooltipPayloadItem {
  payload?: {
    date: string;
    label: string;
    totalEmissionsKg: number;
    activityCount: number;
  };
}

function DailyTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: DailyTooltipPayloadItem[];
}) {
  if (!active || !payload || payload.length === 0 || !payload[0].payload) {
    return null;
  }
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-[#E1EAE4] bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-[#18392C] font-mono tabular-nums">{point.date}</p>
      <p className="mt-1 font-mono font-semibold text-[#176B52] tabular-nums">
        {point.totalEmissionsKg.toFixed(2)} kg CO₂e
      </p>
      <p className="mt-0.5 text-[#64766C]">
        {point.activityCount} {point.activityCount === 1 ? 'activity' : 'activities'}
      </p>
    </div>
  );
}

export function DailyEmissionsChart({
  title = 'Daily Emission Trend',
  description = 'Day-by-day emissions across every calendar day of the selected month (kg CO₂e).',
  dailyTrend,
  isLoading,
  error,
  onRetry,
}: DailyEmissionsChartProps) {
  const hasData = Boolean(dailyTrend && dailyTrend.hasData);

  return (
    <Card className="flex flex-col">
      <CardHeader
        title={title}
        description={
          dailyTrend
            ? `${description} Showing ${dailyTrend.period.monthLabel} (${dailyTrend.points.length} days).`
            : description
        }
        action={
          <Link
            to="/add-activity"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#176B52] hover:text-[#18392C] whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Log Activity</span>
          </Link>
        }
      />

      <div className="mt-5 flex-1">
        {isLoading ? (
          <LoadingSkeleton variant="chart" label="Loading daily emission trend..." />
        ) : error ? (
          <AnalyticsErrorState message={error} onRetry={onRetry} />
        ) : !dailyTrend || !hasData ? (
          <AnalyticsEmptyState
            icon={<CalendarRange className="h-5 w-5" aria-hidden="true" />}
            title={`No daily activity logs in ${dailyTrend?.period.monthLabel ?? 'this month'}`}
            description="All calendar days in this month currently have 0.00 kg CO₂e recorded."
          />
        ) : (
          <div
            className="h-64 w-full min-w-0"
            role="region"
            aria-label={`Daily carbon emissions chart for ${dailyTrend.period.monthLabel}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailyTrend.points}
                margin={{ top: 8, right: 12, left: -8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2EAE5" vertical={false} />
                <XAxis
                  dataKey="dayNumber"
                  tick={{ fill: '#64766C', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fill: '#64766C', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  unit=" kg"
                  width={56}
                />
                <Tooltip
                  cursor={{ fill: '#DCEDE3', fillOpacity: 0.35 }}
                  content={<DailyTooltip />}
                />
                <Bar
                  dataKey="totalEmissionsKg"
                  name="Daily Emissions (kg CO₂e)"
                  fill="#176B52"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}
