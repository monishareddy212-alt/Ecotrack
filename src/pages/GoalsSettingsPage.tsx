import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Edit3,
  Gauge,
  Loader2,
  PlusCircle,
  Save,
  ShieldCheck,
  Target,
  Trash2,
  User,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AnalyticsEmptyState,
  AnalyticsErrorState,
  LoadingSkeleton,
} from '../components/analytics/AnalyticsStates';
import { CarbonStatCard, type StatTone } from '../components/analytics/CarbonStatCard';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { Dialog } from '../components/ui/Dialog';
import { FormError } from '../components/ui/FormError';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { Select } from '../components/ui/Select';
import { Table, type TableColumn } from '../components/ui/Table';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/apiClient';
import { subscribeAnalyticsInvalidation } from '../services/analyticsRefresh';
import {
  createGoal,
  deleteGoal,
  fetchCurrentGoal,
  fetchGoals,
  updateGoal,
} from '../services/goalApi';
import type {
  CurrentGoalResponse,
  GoalStatusCode,
  MonthlyGoalRecord,
} from '../types/ecotrack';

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

function getInitialReportingYearMonth(): { year: number; month: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const year = Number(parts.find((p) => p.type === 'year')?.value ?? '2026');
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? '1');
  return { year, month };
}

function pad2(val: number): string {
  return String(val).padStart(2, '0');
}

function formatMemberSince(isoDate?: string): string {
  if (!isoDate) return '—';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getGoalStatusStyles(status: GoalStatusCode): {
  badgeClass: string;
  barClass: string;
  statTone: StatTone;
} {
  switch (status) {
    case 'TARGET_EXCEEDED':
      return {
        badgeClass: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]',
        barClass: 'bg-[#B91C1C]',
        statTone: 'negative',
      };
    case 'AT_TARGET':
    case 'APPROACHING_TARGET':
      return {
        badgeClass: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
        barClass: 'bg-[#F4B860]',
        statTone: 'default',
      };
    case 'WITHIN_TARGET':
      return {
        badgeClass: 'bg-[#DCEDE3] text-[#18392C] border-[#BCE0CA]',
        barClass: 'bg-[#176B52]',
        statTone: 'positive',
      };
    case 'NO_TARGET':
    default:
      return {
        badgeClass: 'bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]',
        barClass: 'bg-[#94A3B8]',
        statTone: 'muted',
      };
  }
}

export function GoalsSettingsPage() {
  const { user, updateProfile } = useAuth();
  const initialPeriod = useMemo(() => getInitialReportingYearMonth(), []);

  const [selectedYear, setSelectedYear] = useState(initialPeriod.year);
  const [selectedMonth, setSelectedMonth] = useState(initialPeriod.month);
  const [refreshTick, setRefreshTick] = useState(0);

  const availableYears = useMemo(() => {
    const base = initialPeriod.year;
    return [base - 2, base - 1, base, base + 1, base + 2];
  }, [initialPeriod.year]);

  const [currentGoalData, setCurrentGoalData] = useState<CurrentGoalResponse | null>(null);
  const [goalsHistory, setGoalsHistory] = useState<MonthlyGoalRecord[]>([]);
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Create / Edit Goal Form state
  const [editingGoal, setEditingGoal] = useState<MonthlyGoalRecord | null>(null);
  const [formMonth, setFormMonth] = useState(
    `${initialPeriod.year}-${pad2(initialPeriod.month)}`
  );
  const [formTargetCo2e, setFormTargetCo2e] = useState('');
  const [formFieldErrors, setFormFieldErrors] = useState<{
    goalMonth?: string;
    targetCo2e?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [goalSuccess, setGoalSuccess] = useState<string | null>(null);
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  // Delete modal state
  const [deletingGoal, setDeletingGoal] = useState<MonthlyGoalRecord | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletingGoal, setIsDeletingGoal] = useState(false);

  // Profile Settings state
  const [profileFullName, setProfileFullName] = useState(user?.fullName ?? '');
  const [profileFieldError, setProfileFieldError] = useState<string | undefined>(undefined);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileFullName(user.fullName);
    }
  }, [user]);

  useEffect(() => {
    return subscribeAnalyticsInvalidation(() => {
      setRefreshTick((t) => t + 1);
    });
  }, []);

  const loadCurrentGoal = useCallback(async () => {
    setLoadingCurrent(true);
    setCurrentError(null);
    try {
      const data = await fetchCurrentGoal({ year: selectedYear, month: selectedMonth });
      setCurrentGoalData(data);
    } catch (err: unknown) {
      setCurrentError(
        err instanceof Error ? err.message : 'Unable to load monthly goal progress.'
      );
    } finally {
      setLoadingCurrent(false);
    }
  }, [selectedYear, selectedMonth]);

  const loadGoalsHistory = useCallback(async () => {
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const items = await fetchGoals();
      setGoalsHistory(items);
    } catch (err: unknown) {
      setHistoryError(
        err instanceof Error ? err.message : 'Unable to load goal history from PostgreSQL.'
      );
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    void loadCurrentGoal();
  }, [loadCurrentGoal, refreshTick]);

  useEffect(() => {
    void loadGoalsHistory();
  }, [loadGoalsHistory, refreshTick]);

  const handleStartEdit = (goal: MonthlyGoalRecord) => {
    setEditingGoal(goal);
    setFormMonth(goal.monthKey);
    setFormTargetCo2e(String(goal.targetCo2eKg));
    setFormFieldErrors({});
    setFormError(null);
    setGoalSuccess(null);
  };

  const handleCancelEdit = () => {
    setEditingGoal(null);
    setFormMonth(`${selectedYear}-${pad2(selectedMonth)}`);
    setFormTargetCo2e('');
    setFormFieldErrors({});
    setFormError(null);
  };

  const handleGoalSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setGoalSuccess(null);

    const nextFieldErrors: { goalMonth?: string; targetCo2e?: string } = {};
    if (!/^\d{4}-\d{2}$/.test(formMonth.trim())) {
      nextFieldErrors.goalMonth = 'Select a valid month and year.';
    }

    const numericTarget = Number(formTargetCo2e);
    if (!formTargetCo2e.trim() || Number.isNaN(numericTarget) || numericTarget <= 0) {
      nextFieldErrors.targetCo2e = 'Enter a carbon target greater than 0 kg CO₂e.';
    } else if (numericTarget > 1_000_000) {
      nextFieldErrors.targetCo2e = 'Monthly target must be 1,000,000 kg CO₂e or less.';
    }

    setFormFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) {
      return;
    }

    setIsSavingGoal(true);
    try {
      if (editingGoal) {
        const res = await updateGoal(editingGoal.id, {
          goalMonth: formMonth.trim(),
          targetCo2e: formTargetCo2e.trim(),
        });
        setGoalSuccess(
          `Updated sustainability goal for ${res.goal.monthLabel} to ${res.goal.targetCo2eKg.toFixed(2)} kg CO₂e.`
        );
        setEditingGoal(null);
        setFormTargetCo2e('');
        // Jump period view to updated goal's month/year
        const [yStr, mStr] = res.goal.monthKey.split('-');
        setSelectedYear(Number(yStr));
        setSelectedMonth(Number(mStr));
      } else {
        const res = await createGoal({
          goalMonth: formMonth.trim(),
          targetCo2e: formTargetCo2e.trim(),
        });
        setGoalSuccess(
          `Saved monthly sustainability goal for ${res.goal.monthLabel} (${res.goal.targetCo2eKg.toFixed(2)} kg CO₂e).`
        );
        setFormTargetCo2e('');
        const [yStr, mStr] = res.goal.monthKey.split('-');
        setSelectedYear(Number(yStr));
        setSelectedMonth(Number(mStr));
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.fields) {
          setFormFieldErrors({
            goalMonth: err.fields.goalMonth || err.fields.year || err.fields.month,
            targetCo2e: err.fields.targetCo2e,
          });
        }
        setFormError(err.message);
      } else {
        setFormError('Unable to save monthly sustainability goal.');
      }
    } finally {
      setIsSavingGoal(false);
    }
  };

  const handleConfirmDeleteGoal = async () => {
    if (!deletingGoal) return;
    setDeleteError(null);
    setIsDeletingGoal(true);
    try {
      await deleteGoal(deletingGoal.id);
      setGoalSuccess(`Deleted sustainability goal for ${deletingGoal.monthLabel}.`);
      if (editingGoal?.id === deletingGoal.id) {
        handleCancelEdit();
      }
      setDeletingGoal(null);
    } catch (err: unknown) {
      setDeleteError(
        err instanceof Error ? err.message : 'Unable to delete sustainability goal.'
      );
    } finally {
      setIsDeletingGoal(false);
    }
  };

  const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileError(null);
    setProfileFieldError(undefined);
    setProfileSuccess(null);

    const trimmedName = profileFullName.trim();
    if (trimmedName.length < 2) {
      setProfileFieldError('Full name must be at least 2 characters.');
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateProfile(trimmedName);
      setProfileSuccess('Your profile name has been updated.');
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fields?.fullName) {
          setProfileFieldError(error.fields.fullName);
        }
        setProfileError(error.message);
      } else {
        setProfileError('Unable to update your profile right now. Please try again.');
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  const progress = currentGoalData?.progress;
  const activeStyles = getGoalStatusStyles(progress?.status ?? 'NO_TARGET');
  const clampedBarPercent =
    progress && progress.usagePercentage !== null
      ? Math.min(Math.max(progress.usagePercentage, 0), 100)
      : 0;

  // Chart data: chronological last 6 stored goals
  const chartData = useMemo(() => {
    return [...goalsHistory]
      .slice(0, 6)
      .reverse()
      .map((g) => ({
        month: g.monthKey,
        target: Number(g.targetCo2eKg.toFixed(2)),
        actual: Number(g.actualEmissionsKg.toFixed(2)),
      }));
  }, [goalsHistory]);

  const goalColumns: readonly TableColumn<MonthlyGoalRecord>[] = [
    {
      key: 'monthLabel',
      header: 'Month',
      render: (row) => (
        <span className="font-semibold text-[#18392C] whitespace-nowrap">{row.monthLabel}</span>
      ),
    },
    {
      key: 'targetCo2eKg',
      header: 'Monthly Target',
      align: 'right',
      render: (row) => (
        <span className="font-mono tabular-nums text-[#18392C] whitespace-nowrap">
          {row.targetCo2eKg.toFixed(2)} kg CO₂e
        </span>
      ),
    },
    {
      key: 'actualEmissionsKg',
      header: 'Actual Emissions',
      align: 'right',
      render: (row) => (
        <span className="font-mono tabular-nums font-medium text-[#18392C] whitespace-nowrap">
          {row.actualEmissionsKg.toFixed(2)} kg CO₂e
        </span>
      ),
    },
    {
      key: 'usagePercentage',
      header: 'Usage',
      align: 'right',
      render: (row) => (
        <span className="font-mono tabular-nums font-semibold text-[#176B52] whitespace-nowrap">
          {row.progress.usagePercentage !== null
            ? `${row.progress.usagePercentage.toFixed(1)}%`
            : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const st = getGoalStatusStyles(row.progress.status);
        return (
          <span
            className={[
              'inline-block rounded border px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
              st.badgeClass,
            ].join(' ')}
          >
            {row.progress.statusLabel}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Edit goal for ${row.monthLabel}`}
            onClick={() => handleStartEdit(row)}
          >
            <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Edit</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Delete goal for ${row.monthLabel}`}
            onClick={() => {
              setDeleteError(null);
              setDeletingGoal(row);
            }}
          >
            <Trash2 className="h-3.5 w-3.5 text-[#B91C1C]" aria-hidden="true" />
            <span className="text-[#B91C1C]">Delete</span>
          </Button>
        </div>
      ),
    },
  ];

  // Check if selected formMonth already has a saved goal when creating (helpful prompt)
  const matchingExistingForFormMonth = !editingGoal
    ? goalsHistory.find((g) => g.monthKey === formMonth.trim())
    : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your Sustainability Goals"
        description="Set monthly carbon emission targets, monitor target usage against recorded activities, and manage your account profile."
      />

      {/* Month & Year Selector Bar */}
      <Card padding="sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:w-80">
            <Select
              label="Reporting Month"
              name="goalViewMonth"
              value={String(selectedMonth)}
              onChange={(e) => {
                const nextMonth = Number(e.target.value);
                setSelectedMonth(nextMonth);
                if (!editingGoal) {
                  setFormMonth(`${selectedYear}-${pad2(nextMonth)}`);
                }
              }}
              options={MONTH_OPTIONS}
            />
            <Select
              label="Reporting Year"
              name="goalViewYear"
              value={String(selectedYear)}
              onChange={(e) => {
                const nextYear = Number(e.target.value);
                setSelectedYear(nextYear);
                if (!editingGoal) {
                  setFormMonth(`${nextYear}-${pad2(selectedMonth)}`);
                }
              }}
              options={availableYears.map((y) => ({ value: String(y), label: String(y) }))}
            />
          </div>
          <p className="text-xs text-[#64766C]">
            Comparing <code className="font-mono">monthly_goals</code> with recorded{' '}
            <code className="font-mono">activity_logs</code> in PostgreSQL.
          </p>
        </div>
      </Card>

      {currentError ? (
        <AnalyticsErrorState message={currentError} onRetry={() => void loadCurrentGoal()} />
      ) : null}

      {goalSuccess ? (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-lg border border-[#BCE0CA] bg-[#DCEDE3]/70 px-4 py-3 text-sm text-[#18392C]"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#176B52]" aria-hidden="true" />
            <span>{goalSuccess}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setGoalSuccess(null)}>
            Dismiss
          </Button>
        </div>
      ) : null}

      {/* Top 4 KPI Cards */}
      <section
        aria-label="Selected month sustainability target metrics"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <CarbonStatCard
          title="Current Monthly Goal"
          value={
            currentGoalData?.goal
              ? currentGoalData.goal.targetCo2eKg.toFixed(2)
              : 'Not Set'
          }
          unit={currentGoalData?.goal ? 'kg CO₂e' : undefined}
          isNumeric={Boolean(currentGoalData?.goal)}
          subtitle={
            currentGoalData
              ? `Target budget for ${currentGoalData.period.monthLabel}`
              : 'Selected month budget'
          }
          tone={currentGoalData?.goal ? 'default' : 'muted'}
          icon={<Target className="h-4 w-4" aria-hidden="true" />}
          isLoading={loadingCurrent}
        />

        <CarbonStatCard
          title="Actual Emissions"
          value={
            currentGoalData ? currentGoalData.actualEmissionsKg.toFixed(2) : '0.00'
          }
          unit="kg CO₂e"
          subtitle={
            currentGoalData
              ? `${currentGoalData.activityCount} recorded ${
                  currentGoalData.activityCount === 1 ? 'activity' : 'activities'
                }`
              : 'Based on recorded activities'
          }
          icon={<Gauge className="h-4 w-4" aria-hidden="true" />}
          isLoading={loadingCurrent}
        />

        <CarbonStatCard
          title="Remaining Allowance"
          value={
            progress?.hasGoal && progress.remainingKg !== null
              ? progress.remainingKg >= 0
                ? progress.remainingKg.toFixed(2)
                : `+${Math.abs(progress.remainingKg).toFixed(2)}`
              : '—'
          }
          unit={
            progress?.hasGoal && progress.remainingKg !== null
              ? progress.remainingKg >= 0
                ? 'kg CO₂e left'
                : 'kg over target'
              : undefined
          }
          tone={
            !progress?.hasGoal || progress.remainingKg === null
              ? 'muted'
              : progress.remainingKg >= 0
                ? 'positive'
                : 'negative'
          }
          subtitle={
            progress?.hasGoal
              ? progress.remainingKg !== null && progress.remainingKg < 0
                ? 'Target exceeded for this month'
                : 'Remaining budget this month'
              : 'Set a goal to calculate remaining budget'
          }
          icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
          isLoading={loadingCurrent}
        />

        <CarbonStatCard
          title="Goal Status"
          value={progress ? progress.statusLabel : 'No Target Set'}
          isNumeric={false}
          tone={activeStyles.statTone}
          subtitle={progress?.contextMessage ?? 'Based on your recorded activities.'}
          icon={<BarChart3 className="h-4 w-4" aria-hidden="true" />}
          isLoading={loadingCurrent}
        />
      </section>

      {/* Middle Section: Large Progress Bar + Target vs Actual BarChart */}
      <section
        aria-label="Target progress and monthly comparison chart"
        className="grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3">
              <CardHeader
                title="Goal Progress"
                description={
                  currentGoalData
                    ? `Live tracking for ${currentGoalData.period.monthLabel} against your monthly carbon budget.`
                    : 'Live comparison of recorded monthly emissions against your goal.'
                }
              />
              {progress ? (
                <span
                  className={[
                    'rounded border px-2.5 py-1 text-xs font-semibold whitespace-nowrap shrink-0',
                    activeStyles.badgeClass,
                  ].join(' ')}
                >
                  {progress.statusLabel}
                </span>
              ) : null}
            </div>

            {loadingCurrent ? (
              <div className="mt-6">
                <LoadingSkeleton variant="card" label="Loading goal progress..." />
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-[#E1EAE4] bg-[#F6F8F3] p-5 space-y-4">
                <div className="flex flex-wrap items-baseline justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-[#64766C]">
                      Recorded emissions
                    </p>
                    <p className="mt-1 text-2xl font-bold text-[#18392C] font-mono tabular-nums">
                      {(progress?.actualEmissionsKg ?? 0).toFixed(2)} kg CO₂e
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-[#64766C]">Target budget</p>
                    <p className="mt-1 text-xl font-semibold text-[#18392C] font-mono tabular-nums">
                      {progress?.hasGoal && progress.targetCo2eKg !== null
                        ? `${progress.targetCo2eKg.toFixed(2)} kg CO₂e`
                        : 'Not set'}
                    </p>
                  </div>
                </div>

                <div
                  className="h-3.5 w-full overflow-hidden rounded-full bg-[#DCE6DF]"
                  role="progressbar"
                  aria-valuenow={
                    progress?.usagePercentage !== null && progress?.usagePercentage !== undefined
                      ? Math.round(progress.usagePercentage)
                      : 0
                  }
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Monthly carbon target usage percentage"
                >
                  <div
                    className={[
                      'h-full rounded-full transition-all duration-300',
                      activeStyles.barClass,
                    ].join(' ')}
                    style={{ width: `${clampedBarPercent}%` }}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-[#18392C] font-mono tabular-nums">
                    {progress?.usagePercentage !== null && progress?.usagePercentage !== undefined
                      ? `${progress.usagePercentage.toFixed(1)}% of monthly budget used`
                      : 'No target budget configured for this month'}
                  </span>
                  <span className="text-[#64766C]">
                    {progress?.hasGoal && progress.remainingKg !== null
                      ? progress.remainingKg >= 0
                        ? `${progress.remainingKg.toFixed(2)} kg remaining`
                        : `${Math.abs(progress.remainingKg).toFixed(2)} kg over target`
                      : 'Create a goal below to begin tracking'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <p className="mt-4 text-xs text-[#64766C]">
            {progress?.contextMessage ?? 'Based on your recorded activities.'} Progress bar fills to 100% when target is reached or exceeded while displaying the exact usage percentage.
          </p>
        </Card>

        <Card className="flex flex-col">
          <CardHeader
            title="Target vs. Actual Emissions"
            description="Comparison of your configured monthly targets against recorded emissions (kg CO₂e)."
          />

          <div className="mt-4 flex-1 min-h-[240px]">
            {loadingHistory ? (
              <LoadingSkeleton variant="chart" label="Loading target vs actual chart..." />
            ) : historyError ? (
              <AnalyticsErrorState
                message={historyError}
                onRetry={() => void loadGoalsHistory()}
              />
            ) : chartData.length === 0 ? (
              <AnalyticsEmptyState
                icon={<BarChart3 className="h-5 w-5" aria-hidden="true" />}
                title="No monthly goals saved yet"
                description="Create your first monthly target below to compare target allowances with actual emissions."
              />
            ) : (
              <div className="h-64 w-full" data-testid="goal-comparison-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 16, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E1EAE4" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: '#64766C' }}
                      axisLine={{ stroke: '#D4E0D8' }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#64766C' }}
                      axisLine={{ stroke: '#D4E0D8' }}
                      unit=" kg"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#D4E0D8',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar
                      dataKey="target"
                      name="Target (kg CO₂e)"
                      fill="#94BFA8"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="actual"
                      name="Actual (kg CO₂e)"
                      fill="#176B52"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </Card>
      </section>

      {/* Goal History Full-Width Table */}
      <Card>
        <CardHeader
          title="Goal History"
          description="All saved monthly carbon targets with live actual emissions and target actions from PostgreSQL."
        />

        <div className="mt-5">
          {loadingHistory ? (
            <LoadingSkeleton variant="table" label="Loading goal history..." />
          ) : historyError ? (
            <AnalyticsErrorState
              message={historyError}
              onRetry={() => void loadGoalsHistory()}
            />
          ) : (
            <Table
              columns={goalColumns}
              rows={goalsHistory}
              rowKey={(row) => row.id}
              caption="Saved monthly sustainability goals and actual emissions"
              emptyState={
                <AnalyticsEmptyState
                  icon={<Target className="h-5 w-5" aria-hidden="true" />}
                  title="No sustainability goals created yet"
                  description="Use the form below to set your first monthly carbon target."
                />
              }
            />
          )}
        </div>
      </Card>

      {/* Bottom Section: Create / Edit Goal Form + Personal Information & Profile Settings */}
      <section
        aria-label="Create sustainability goal and manage profile settings"
        className="grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <Card>
          <CardHeader
            title={editingGoal ? `Edit Goal (${editingGoal.monthLabel})` : 'Set Monthly Carbon Goal'}
            description={
              editingGoal
                ? 'Update the carbon budget or target month for this saved goal.'
                : 'Define an upper monthly carbon budget (kg CO₂e) stored in PostgreSQL.'
            }
          />

          <form onSubmit={(e) => void handleGoalSubmit(e)} noValidate className="mt-5 space-y-4">
            <FormError message={formError} />

            <Input
              label="Target Month"
              name="goalMonth"
              type="month"
              value={formMonth}
              onChange={(e) => {
                setFormMonth(e.target.value);
                if (formFieldErrors.goalMonth) {
                  setFormFieldErrors((prev) => ({ ...prev, goalMonth: undefined }));
                }
              }}
              error={formFieldErrors.goalMonth}
              required
            />

            <Input
              label="Monthly Carbon Target (kg CO₂e)"
              name="targetCo2e"
              type="number"
              step="any"
              min="0.001"
              max="1000000"
              placeholder="e.g. 250"
              hint="Enter a positive target limit up to 1,000,000 kg CO₂e (up to 3 decimals)."
              value={formTargetCo2e}
              onChange={(e) => {
                setFormTargetCo2e(e.target.value);
                if (formFieldErrors.targetCo2e) {
                  setFormFieldErrors((prev) => ({ ...prev, targetCo2e: undefined }));
                }
              }}
              error={formFieldErrors.targetCo2e}
              required
            />

            {matchingExistingForFormMonth ? (
              <div className="rounded-lg border border-[#FDE68A] bg-[#FEF3C7]/60 p-3 text-xs text-[#92400E] space-y-2">
                <p>
                  A target of{' '}
                  <strong className="font-mono">
                    {matchingExistingForFormMonth.targetCo2eKg.toFixed(2)} kg CO₂e
                  </strong>{' '}
                  already exists for {matchingExistingForFormMonth.monthLabel}.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleStartEdit(matchingExistingForFormMonth)}
                >
                  <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Edit Existing {matchingExistingForFormMonth.monthLabel} Goal</span>
                </Button>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button type="submit" variant="primary" disabled={isSavingGoal}>
                {isSavingGoal ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Saving...</span>
                  </>
                ) : editingGoal ? (
                  <>
                    <Save className="h-4 w-4" aria-hidden="true" />
                    <span>Update Goal</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4" aria-hidden="true" />
                    <span>Save Goal</span>
                  </>
                )}
              </Button>

              {editingGoal ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isSavingGoal}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  <span>Cancel Edit</span>
                </Button>
              ) : null}
            </div>
          </form>
        </Card>

        {/* Personal Information & Profile Settings */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#DCEDE3] text-[#176B52]">
                  <User className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-[#18392C]">
                    Personal Information &amp; Profile Settings
                  </h2>
                  <p className="mt-1 text-sm text-[#64766C]">
                    Account identity persisted in PostgreSQL <code className="font-mono">users</code>.
                  </p>
                </div>
              </div>
              <p className="text-xs text-[#64766C]">
                Member since{' '}
                <span className="font-medium text-[#18392C]">
                  {formatMemberSince(user?.createdAt)}
                </span>
              </p>
            </div>

            {profileError ? (
              <div
                role="alert"
                className="mt-5 flex items-start gap-2.5 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-3 text-sm text-[#991B1B]"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{profileError}</span>
              </div>
            ) : null}

            {profileSuccess ? (
              <div
                role="status"
                className="mt-5 flex items-start gap-2.5 rounded-lg border border-[#BCE0CA] bg-[#DCEDE3]/60 px-3.5 py-3 text-sm text-[#18392C]"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-[#176B52]" aria-hidden="true" />
                <span>{profileSuccess}</span>
              </div>
            ) : null}

            <form
              id="profile-settings-form"
              onSubmit={(e) => void handleProfileSubmit(e)}
              noValidate
              className="mt-6 space-y-4"
            >
              <Input
                label="Full name"
                name="fullName"
                type="text"
                value={profileFullName}
                onChange={(e) => {
                  setProfileFullName(e.target.value);
                  if (profileFieldError) setProfileFieldError(undefined);
                }}
                error={profileFieldError}
                required
              />

              <Input
                label="Email address"
                name="email"
                type="email"
                value={user?.email ?? ''}
                readOnly
                disabled
                hint="Account email is read-only and normalized in PostgreSQL."
              />

              <div className="pt-2 flex justify-end">
                <Button type="submit" variant="primary" disabled={isSavingProfile}>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  <span>{isSavingProfile ? 'Saving...' : 'Save Profile Settings'}</span>
                </Button>
              </div>
            </form>
          </div>
        </Card>
      </section>

      {/* Delete Goal Confirmation Modal */}
      <Dialog
        open={Boolean(deletingGoal)}
        onClose={() => {
          if (!isDeletingGoal) {
            setDeleteError(null);
            setDeletingGoal(null);
          }
        }}
        title="Delete Sustainability Goal"
        subtitle="Permanent Action"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setDeletingGoal(null)}
              disabled={isDeletingGoal}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => void handleConfirmDeleteGoal()}
              disabled={isDeletingGoal}
            >
              {isDeletingGoal ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  <span>Confirm Delete</span>
                </>
              )}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p>
            Are you sure you want to permanently remove this monthly sustainability goal?
          </p>
          {deletingGoal ? (
            <div className="rounded-lg border border-[#E1EAE4] bg-[#F6F8F3] p-3.5 text-xs text-[#18392C] space-y-1">
              <p className="font-semibold text-sm">{deletingGoal.monthLabel}</p>
              <p className="font-mono tabular-nums">
                Target: {deletingGoal.targetCo2eKg.toFixed(2)} kg CO₂e · Actual:{' '}
                {deletingGoal.actualEmissionsKg.toFixed(2)} kg CO₂e
              </p>
            </div>
          ) : null}
          <FormError message={deleteError} />
        </div>
      </Dialog>
    </div>
  );
}
