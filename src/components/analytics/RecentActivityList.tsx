import { Link } from 'react-router-dom';
import { Activity as ActivityIcon, PlusCircle } from 'lucide-react';
import { Card, CardHeader } from '../ui/Card';
import { Table, type TableColumn } from '../ui/Table';
import {
  AnalyticsEmptyState,
  AnalyticsErrorState,
  LoadingSkeleton,
} from './AnalyticsStates';
import type { Activity } from '../../types/ecotrack';

export interface RecentActivityListProps {
  activities: readonly Activity[];
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
}

const RECENT_COLUMNS: readonly TableColumn<Activity>[] = [
  {
    key: 'activityTypeName',
    header: 'Activity',
    render: (row) => (
      <span className="font-medium text-[#18392C]">{row.activityTypeName}</span>
    ),
  },
  {
    key: 'category',
    header: 'Category',
    render: (row) => <span className="whitespace-nowrap">{row.category}</span>,
  },
  {
    key: 'activityDate',
    header: 'Date',
    render: (row) => (
      <span className="font-mono tabular-nums whitespace-nowrap">{row.activityDate}</span>
    ),
  },
  {
    key: 'quantity',
    header: 'Quantity',
    align: 'right',
    render: (row) => (
      <span className="font-mono tabular-nums whitespace-nowrap">
        {row.quantity.toLocaleString(undefined, { maximumFractionDigits: 3 })} {row.unit}
      </span>
    ),
  },
  {
    key: 'emissions',
    header: 'Estimated Emissions',
    align: 'right',
    render: (row) => (
      <span className="font-semibold text-[#18392C] font-mono tabular-nums whitespace-nowrap">
        {row.calculatedCo2e.toFixed(2)} kg CO₂e
      </span>
    ),
  },
];

export function RecentActivityList({
  activities,
  isLoading,
  error,
  onRetry,
}: RecentActivityListProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Recent Activities"
        description="Your latest five logged transportation, energy, and lifestyle entries."
        action={
          <div className="flex items-center gap-3">
            <Link
              to="/history"
              className="text-sm font-medium text-[#176B52] hover:text-[#18392C] whitespace-nowrap"
            >
              View All
            </Link>
            <Link
              to="/add-activity"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#DCEDE3] px-3 py-1.5 text-xs font-semibold text-[#18392C] hover:bg-[#CCE3D5] transition-colors whitespace-nowrap"
            >
              <PlusCircle className="h-3.5 w-3.5 text-[#176B52]" aria-hidden="true" />
              <span>Add Activity</span>
            </Link>
          </div>
        }
      />

      <div className="mt-5 flex-1">
        {isLoading ? (
          <LoadingSkeleton variant="table" label="Loading recent activities from PostgreSQL..." />
        ) : error ? (
          <AnalyticsErrorState message={error} onRetry={onRetry} />
        ) : (
          <Table
            columns={RECENT_COLUMNS}
            rows={activities}
            rowKey={(row) => row.id}
            caption="Latest five recorded carbon emission activities"
            emptyState={
              <AnalyticsEmptyState
                icon={<ActivityIcon className="h-5 w-5" aria-hidden="true" />}
                title="No activities recorded yet"
                description="Log your first transportation or energy activity to populate your recent activity history and emission charts."
                action={
                  <Link
                    to="/add-activity"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#176B52] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#18392C] transition-colors whitespace-nowrap"
                  >
                    <PlusCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Add Activity</span>
                  </Link>
                }
              />
            }
          />
        )}
      </div>
    </Card>
  );
}
