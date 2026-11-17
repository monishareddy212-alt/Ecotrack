import { Eye, History, Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Table, type TableColumn } from '../ui/Table';
import type { Activity } from '../../types/ecotrack';

export interface ActivityHistoryTableProps {
  items: readonly Activity[];
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onView: (activity: Activity) => void;
  onEdit: (activity: Activity) => void;
  onDelete: (activity: Activity) => void;
}

export function ActivityHistoryTable({
  items,
  hasActiveFilters,
  onClearFilters,
  onView,
  onEdit,
  onDelete,
}: ActivityHistoryTableProps) {
  const columns: readonly TableColumn<Activity>[] = [
    {
      key: 'activityDate',
      header: 'Activity Date',
      render: (row) => (
        <span className="font-mono tabular-nums whitespace-nowrap">{row.activityDate}</span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => <span className="whitespace-nowrap">{row.category}</span>,
    },
    {
      key: 'activityTypeName',
      header: 'Activity Type',
      render: (row) => <span className="font-medium text-[#18392C]">{row.activityTypeName}</span>,
    },
    {
      key: 'quantity',
      header: 'Quantity',
      align: 'right',
      render: (row) => row.quantity.toLocaleString(undefined, { maximumFractionDigits: 3 }),
    },
    {
      key: 'unit',
      header: 'Unit',
      render: (row) => <span className="text-[#64766C]">{row.unit}</span>,
    },
    {
      key: 'calculatedCo2e',
      header: 'Estimated Carbon Emissions',
      align: 'right',
      render: (row) => (
        <span className="font-semibold text-[#18392C] whitespace-nowrap">
          {row.calculatedCo2e.toFixed(2)} kg CO₂e
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="inline-flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            aria-label={`View ${row.activityTypeName} on ${row.activityDate}`}
            onClick={() => onView(row)}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            <span>View</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Edit ${row.activityTypeName} on ${row.activityDate}`}
            onClick={() => onEdit(row)}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Edit</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Delete ${row.activityTypeName} on ${row.activityDate}`}
            onClick={() => onDelete(row)}
            className="text-[#B91C1C] hover:bg-[#FEF2F2] hover:text-[#991B1B]"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Delete</span>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      rows={items}
      rowKey={(row) => row.id}
      caption="Recorded carbon emission activities"
      emptyState={
        <EmptyState
          icon={<History className="h-5 w-5" aria-hidden="true" />}
          title={
            hasActiveFilters
              ? 'No matching activity records'
              : 'No activity records saved yet'
          }
          description={
            hasActiveFilters
              ? 'No PostgreSQL activity records match your current search or date filters.'
              : 'Log your first transportation or home energy activity to calculate carbon emissions and build your history.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="outline" onClick={onClearFilters}>
                Clear filters
              </Button>
            ) : (
              <Link
                to="/add-activity"
                className="inline-flex items-center gap-2 rounded-lg bg-[#176B52] px-4 py-2 text-sm font-medium text-white hover:bg-[#18392C] transition-colors whitespace-nowrap"
              >
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
                <span>Log First Activity</span>
              </Link>
            )
          }
        />
      }
    />
  );
}
