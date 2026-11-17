import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  PlusCircle,
  RefreshCw,
} from 'lucide-react';
import {
  ActivityDetailDialog,
  EditActivityDialog,
} from '../components/activities/ActivityDialogs';
import {
  ActivityFilters,
  type ActivityFilterState,
} from '../components/activities/ActivityFilters';
import { ActivityHistoryTable } from '../components/activities/ActivityHistoryTable';
import { ActivitySummary } from '../components/activities/ActivitySummary';
import { DeleteConfirmationDialog } from '../components/activities/DeleteConfirmationDialog';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { FormError } from '../components/ui/FormError';
import { LoadingState } from '../components/ui/LoadingState';
import { PageHeader } from '../components/ui/PageHeader';
import {
  deleteActivity,
  fetchActivities,
  fetchActivitySummary,
  fetchActivityTypes,
  updateActivity,
} from '../services/activityApi';
import { downloadActivitiesCsv } from '../services/reportApi';
import type {
  Activity,
  ActivitySummary as ActivitySummaryData,
  ActivityType,
  ActivityUpdateRequest,
} from '../types/ecotrack';

const DEFAULT_FILTERS: ActivityFilterState = {
  search: '',
  category: 'All',
  activityTypeId: '',
  startDate: '',
  endDate: '',
  minEmissions: '',
  maxEmissions: '',
  sort: 'date_desc',
};

const PAGE_LIMIT = 10;

export function ActivityHistoryPage() {
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [filters, setFilters] = useState<ActivityFilterState>(DEFAULT_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [items, setItems] = useState<Activity[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<ActivitySummaryData | null>(null);

  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const [viewingActivity, setViewingActivity] = useState<Activity | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deletingActivity, setDeletingActivity] = useState<Activity | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Debounce search input to avoid excessive backend queries while typing
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(filters.search.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [filters.search]);

  // Load activity types once for filter dropdown and Edit dialog
  useEffect(() => {
    let active = true;
    fetchActivityTypes()
      .then((types) => {
        if (active) setActivityTypes(types);
      })
      .catch(() => {
        // List / summary requests surface backend/database errors visibly
      });
    return () => {
      active = false;
    };
  }, []);

  const getClientFilterValidationError = useCallback((): string | null => {
    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
      return 'Start date must be on or before end date.';
    }
    const minStr = filters.minEmissions.trim();
    const maxStr = filters.maxEmissions.trim();
    if (minStr && (Number.isNaN(Number(minStr)) || Number(minStr) < 0)) {
      return 'Minimum emissions must be 0 or greater.';
    }
    if (maxStr && (Number.isNaN(Number(maxStr)) || Number(maxStr) < 0)) {
      return 'Maximum emissions must be 0 or greater.';
    }
    if (minStr && maxStr && Number(minStr) > Number(maxStr)) {
      return 'Maximum emissions must be greater than or equal to minimum emissions.';
    }
    return null;
  }, [filters.startDate, filters.endDate, filters.minEmissions, filters.maxEmissions]);

  // Load paginated activity logs from PostgreSQL
  const loadActivities = useCallback(async () => {
    const validationErr = getClientFilterValidationError();
    if (validationErr) {
      setListError(validationErr);
      setIsLoadingList(false);
      return;
    }

    setIsLoadingList(true);
    setListError(null);
    try {
      const response = await fetchActivities({
        category: filters.category,
        activityTypeId: filters.activityTypeId || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        minEmissions: filters.minEmissions.trim() || undefined,
        maxEmissions: filters.maxEmissions.trim() || undefined,
        search: debouncedSearch || undefined,
        sort: filters.sort,
        page: currentPage,
        limit: PAGE_LIMIT,
      });
      setItems(response.items);
      setTotalItems(response.total);
      setTotalPages(response.totalPages);
      if (response.page !== currentPage) {
        setCurrentPage(response.page);
      }
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Unable to load activity history from PostgreSQL.';
      setListError(msg);
    } finally {
      setIsLoadingList(false);
    }
  }, [
    getClientFilterValidationError,
    filters.category,
    filters.activityTypeId,
    filters.startDate,
    filters.endDate,
    filters.minEmissions,
    filters.maxEmissions,
    filters.sort,
    debouncedSearch,
    currentPage,
  ]);

  // Load summary aggregations from PostgreSQL
  const loadSummary = useCallback(async () => {
    const validationErr = getClientFilterValidationError();
    if (validationErr) {
      setSummaryError(validationErr);
      setIsLoadingSummary(false);
      return;
    }

    setIsLoadingSummary(true);
    setSummaryError(null);
    try {
      const data = await fetchActivitySummary({
        category: filters.category,
        activityTypeId: filters.activityTypeId || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        minEmissions: filters.minEmissions.trim() || undefined,
        maxEmissions: filters.maxEmissions.trim() || undefined,
        search: debouncedSearch || undefined,
      });
      setSummary(data);
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Unable to load activity summary from PostgreSQL.';
      setSummaryError(msg);
    } finally {
      setIsLoadingSummary(false);
    }
  }, [
    getClientFilterValidationError,
    filters.category,
    filters.activityTypeId,
    filters.startDate,
    filters.endDate,
    filters.minEmissions,
    filters.maxEmissions,
    debouncedSearch,
  ]);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities, refreshCounter]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary, refreshCounter]);

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

  const handleFiltersChange = (next: ActivityFilterState) => {
    setFilters(next);
    setCurrentPage(1);
    setStatusNotice(null);
    setExportError(null);
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setDebouncedSearch('');
    setCurrentPage(1);
    setStatusNotice(null);
    setExportError(null);
  };

  const handleSaveEdit = async (
    id: string,
    payload: ActivityUpdateRequest
  ): Promise<Activity> => {
    const response = await updateActivity(id, payload);
    setStatusNotice(
      `Updated ${response.activity.activityTypeName} (${response.activity.quantity} ${response.activity.unit}) — ${response.activity.calculatedCo2e.toFixed(2)} kg CO₂e.`
    );
    setRefreshCounter((c) => c + 1);
    return response.activity;
  };

  const handleConfirmDelete = async (id: string): Promise<void> => {
    const target = deletingActivity;
    await deleteActivity(id);
    setStatusNotice(
      target
        ? `Deleted ${target.activityTypeName} (${target.activityDate}) from your activity history.`
        : 'Activity deleted from your activity history.'
    );
    // If deleting the last item on a later page, step back one page cleanly
    if (items.length === 1 && currentPage > 1) {
      setCurrentPage((p) => Math.max(1, p - 1));
    }
    setRefreshCounter((c) => c + 1);
  };

  const handleExportCsv = async () => {
    const validationErr = getClientFilterValidationError();
    if (validationErr) {
      setExportError(validationErr);
      return;
    }

    setIsExporting(true);
    setExportError(null);
    try {
      const filename = await downloadActivitiesCsv({
        category: filters.category,
        activityTypeId: filters.activityTypeId || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        minEmissions: filters.minEmissions.trim() || undefined,
        maxEmissions: filters.maxEmissions.trim() || undefined,
        search: debouncedSearch || undefined,
        sort: filters.sort,
      });
      setStatusNotice(`Downloaded CSV report (${filename}).`);
    } catch (error: unknown) {
      setExportError(
        error instanceof Error
          ? error.message
          : 'Unable to export CSV report from PostgreSQL.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const startRecord =
    totalItems === 0 ? 0 : (currentPage - 1) * PAGE_LIMIT + 1;
  const endRecord = Math.min(currentPage * PAGE_LIMIT, totalItems);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity History"
        description="Search, filter, inspect, edit, delete, or export your recorded carbon-emitting activities stored in PostgreSQL."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => void handleExportCsv()}
              disabled={isExporting}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>{isExporting ? 'Exporting CSV...' : 'Export CSV'}</span>
            </Button>
            <Link
              to="/add-activity"
              className="inline-flex items-center gap-2 rounded-lg bg-[#176B52] px-4 py-2 text-sm font-medium text-white hover:bg-[#18392C] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52]"
            >
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
              <span>Add Activity</span>
            </Link>
          </div>
        }
      />

      {exportError ? <FormError message={exportError} /> : null}

      {statusNotice ? (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-lg border border-[#BCE0CA] bg-[#DCEDE3]/70 px-4 py-3 text-sm text-[#18392C]"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#176B52]" aria-hidden="true" />
            <span className="truncate">{statusNotice}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setStatusNotice(null)}>
            Dismiss
          </Button>
        </div>
      ) : null}

      <ActivitySummary
        summary={summary}
        isLoading={isLoadingSummary}
        error={summaryError}
      />

      <ActivityFilters
        filters={filters}
        activityTypes={activityTypes}
        onChange={handleFiltersChange}
        onClear={handleClearFilters}
      />

      <Card className="space-y-5">
        {isLoadingList ? (
          <LoadingState label="Loading activity records from PostgreSQL..." />
        ) : listError ? (
          <div className="space-y-4">
            <FormError message={listError} />
            <Button variant="outline" onClick={() => void loadActivities()}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              <span>Retry</span>
            </Button>
          </div>
        ) : (
          <ActivityHistoryTable
            items={items}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={handleClearFilters}
            onView={(activity) => setViewingActivity(activity)}
            onEdit={(activity) => setEditingActivity(activity)}
            onDelete={(activity) => setDeletingActivity(activity)}
          />
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-[#E1EAE4]">
          <p className="text-xs text-[#64766C] font-mono tabular-nums">
            {totalItems === 0
              ? 'Showing 0 of 0 records'
              : `Showing ${startRecord}–${endRecord} of ${totalItems} records`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || isLoadingList}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span>Previous</span>
            </Button>
            <span className="px-2 text-xs font-medium text-[#18392C] font-mono tabular-nums whitespace-nowrap">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages || isLoadingList}
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </Card>

      <ActivityDetailDialog
        activity={viewingActivity}
        onClose={() => setViewingActivity(null)}
      />

      <EditActivityDialog
        activity={editingActivity}
        activityTypes={activityTypes}
        onClose={() => setEditingActivity(null)}
        onSave={handleSaveEdit}
      />

      <DeleteConfirmationDialog
        activity={deletingActivity}
        onClose={() => setDeletingActivity(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
