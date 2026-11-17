import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity as ActivityIcon,
  Award,
  Layers,
  Minus,
  PlusCircle,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { AnalyticsFilters } from '../components/analytics/AnalyticsFilters';
import {
  AnalyticsEmptyState,
  AnalyticsErrorState,
  LoadingSkeleton,
} from '../components/analytics/AnalyticsStates';
import { CarbonStatCard, type StatTone } from '../components/analytics/CarbonStatCard';
import { CategoryBreakdownChart } from '../components/analytics/CategoryBreakdownChart';
import { DailyEmissionsChart } from '../components/analytics/DailyEmissionsChart';
import { MonthlyEmissionsChart } from '../components/analytics/MonthlyEmissionsChart';
import { MonthlyReportCard } from '../components/analytics/MonthlyReportCard';
import { Card, CardHeader } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { Table, type TableColumn } from '../components/ui/Table';
import {
  fetchAnalyticsOverview,
  fetchCategoryBreakdown,
  fetchDailyTrend,
  fetchMonthlyTrend,
  fetchTopCategory,
} from '../services/analyticsApi';
import { subscribeAnalyticsInvalidation } from '../services/analyticsRefresh';
import type {
  AnalyticsOverview,
  CategoryBreakdown,
  CategoryBreakdownItem,
  DailyTrend,
  MonthlyTrend,
  TopCategoryResult,
} from '../types/ecotrack';

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

function formatSignedKg(diff: number): string {
  const prefix = diff > 0 ? '+' : '';
  return `${prefix}${diff.toFixed(2)} kg CO₂e`;
}

const CATEGORY_SUMMARY_COLUMNS: readonly TableColumn<CategoryBreakdownItem>[] = [
  {
    key: 'category',
    header: 'Category',
    render: (row) => <span className="font-medium text-[#18392C] whitespace-nowrap">{row.category}</span>,
  },
  {
    key: 'activityCount',
    header: 'Entries',
    align: 'right',
    render: (row) => (
      <span className="font-mono tabular-nums whitespace-nowrap">{row.activityCount}</span>
    ),
  },
  {
    key: 'totalEmissionsKg',
    header: 'Emissions',
    align: 'right',
    render: (row) => (
      <span className="font-semibold text-[#18392C] font-mono tabular-nums whitespace-nowrap">
        {row.totalEmissionsKg.toFixed(2)} kg
      </span>
    ),
  },
  {
    key: 'percentageShare',
    header: 'Share',
    align: 'right',
    render: (row) => (
      <span className="font-mono font-semibold text-[#176B52] tabular-nums whitespace-nowrap">
        {row.percentageShare.toFixed(1)}%
      </span>
    ),
  },
];

export function AnalyticsPage() {
  const initialPeriod = useMemo(() => getInitialReportingYearMonth(), []);
  const [selectedYear, setSelectedYear] = useState(initialPeriod.year);
  const [selectedMonth, setSelectedMonth] = useState(initialPeriod.month);
  const [range, setRange] = useState<6 | 12>(6);
  const [refreshTick, setRefreshTick] = useState(0);

  const availableYears = useMemo(() => {
    const base = initialPeriod.year;
    return [base - 3, base - 2, base - 1, base, base + 1];
  }, [initialPeriod.year]);

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend | null>(null);
  const [breakdown, setBreakdown] = useState<CategoryBreakdown | null>(null);
  const [dailyTrend, setDailyTrend] = useState<DailyTrend | null>(null);
  const [topCategory, setTopCategory] = useState<TopCategoryResult | null>(null);

  const [loadingPeriodData, setLoadingPeriodData] = useState(true);
  const [loadingMonthlyTrend, setLoadingMonthlyTrend] = useState(true);

  const [periodError, setPeriodError] = useState<string | null>(null);
  const [monthlyError, setMonthlyError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeAnalyticsInvalidation(() => {
      setRefreshTick((tick) => tick + 1);
    });
  }, []);

  const loadPeriodAnalytics = useCallback(async () => {
    setLoadingPeriodData(true);
    setPeriodError(null);
    try {
      const [overviewRes, breakdownRes, dailyRes, topCatRes] = await Promise.all([
        fetchAnalyticsOverview({ year: selectedYear, month: selectedMonth }),
        fetchCategoryBreakdown({ year: selectedYear, month: selectedMonth }),
        fetchDailyTrend({ year: selectedYear, month: selectedMonth }),
        fetchTopCategory({ year: selectedYear, month: selectedMonth }),
      ]);
      setOverview(overviewRes);
      setBreakdown(breakdownRes);
      setDailyTrend(dailyRes);
      setTopCategory(topCatRes);
    } catch (err: unknown) {
      setPeriodError(
        err instanceof Error ? err.message : 'Unable to load analytics for the selected period.'
      );
    } finally {
      setLoadingPeriodData(false);
    }
  }, [selectedYear, selectedMonth]);

  const loadMonthlySeries = useCallback(async () => {
    setLoadingMonthlyTrend(true);
    setMonthlyError(null);
    try {
      const trendRes = await fetchMonthlyTrend({
        year: selectedYear,
        month: selectedMonth,
        range,
      });
      setMonthlyTrend(trendRes);
    } catch (err: unknown) {
      setMonthlyError(
        err instanceof Error ? err.message : 'Unable to load monthly emission trajectory.'
      );
    } finally {
      setLoadingMonthlyTrend(false);
    }
  }, [selectedYear, selectedMonth, range]);

  useEffect(() => {
    void loadPeriodAnalytics();
  }, [loadPeriodAnalytics, refreshTick]);

  useEffect(() => {
    void loadMonthlySeries();
  }, [loadMonthlySeries, refreshTick]);

  const comp = overview?.comparison;
  let compValue = '—';
  let compTone: StatTone = 'muted';
  let compIcon = <Minus className="h-4 w-4" aria-hidden="true" />;
  let compSubtitle = 'Comparing against prior calendar month';
  let compSecondary: string | null = null;

  if (overview && comp) {
    const prevLabel = overview.previousMonth.monthLabel;
    const partialNote = overview.period.isCurrentMonth
      ? ` (month-to-date vs full ${prevLabel})`
      : ` vs ${prevLabel}`;

    if (comp.direction === 'decrease' && comp.percentageChange !== null) {
      compValue = `${comp.percentageChange.toFixed(1)}%`;
      compTone = 'positive';
      compIcon = <TrendingDown className="h-4 w-4" aria-hidden="true" />;
      compSubtitle = `${formatSignedKg(comp.differenceKg)}${partialNote}`;
    } else if (comp.direction === 'increase' && comp.percentageChange !== null) {
      compValue = `+${comp.percentageChange.toFixed(1)}%`;
      compTone = 'negative';
      compIcon = <TrendingUp className="h-4 w-4" aria-hidden="true" />;
      compSubtitle = `${formatSignedKg(comp.differenceKg)}${partialNote}`;
    } else if (comp.direction === 'no_change') {
      compValue = '0.0%';
      compTone = 'muted';
      compSubtitle = `No change (0.00 kg CO₂e)${partialNote}`;
    } else {
      compValue = 'N/A';
      compTone = 'muted';
      compSubtitle = `${formatSignedKg(comp.differenceKg)} — ${prevLabel} had 0.00 kg CO₂e.`;
    }

    if (
      overview.sameWindowComparison &&
      overview.previousMonth.sameWindowDays !== null
    ) {
      const sw = overview.sameWindowComparison;
      const pctText =
        sw.percentageChange !== null
          ? `${sw.percentageChange > 0 ? '+' : ''}${sw.percentageChange.toFixed(1)}%`
          : 'N/A';
      compSecondary = `Same ${overview.previousMonth.sameWindowDays}-day pace: ${pctText} (${formatSignedKg(sw.differenceKg)})`;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Carbon Emission Analytics"
        description="Understand your environmental impact through daily and monthly emission trends."
        action={
          <Link
            to="/add-activity"
            className="inline-flex items-center gap-2 rounded-lg bg-[#176B52] px-4 py-2 text-sm font-medium text-white hover:bg-[#18392C] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52]"
          >
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            <span>Add Activity</span>
          </Link>
        }
      />

      <AnalyticsFilters
        year={selectedYear}
        month={selectedMonth}
        range={range}
        availableYears={availableYears}
        onYearChange={setSelectedYear}
        onMonthChange={setSelectedMonth}
        onRangeChange={setRange}
      />

      {periodError ? (
        <AnalyticsErrorState
          message={periodError}
          onRetry={() => void loadPeriodAnalytics()}
        />
      ) : null}

      {/* Top Section: 4 Summary KPIs */}
      <section
        aria-label="Selected period analytics summary"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <CarbonStatCard
          title="Selected Period Emissions"
          value={
            overview ? overview.currentMonth.totalEmissionsKg.toFixed(2) : '0.00'
          }
          unit="kg CO₂e"
          subtitle={
            overview
              ? `${overview.period.monthLabel} · Daily avg ${overview.currentMonth.dailyAverageKg.toFixed(2)} kg/day`
              : 'Selected calendar month'
          }
          tooltipText="Daily average divides total emissions by elapsed calendar days (through today in Asia/Kolkata for the current month, or full month days for completed months)."
          icon={<ActivityIcon className="h-4 w-4" aria-hidden="true" />}
          isLoading={loadingPeriodData}
        />

        <CarbonStatCard
          title="Previous Period Comparison"
          value={compValue}
          subtitle={compSubtitle}
          secondarySubtitle={compSecondary}
          tone={compTone}
          icon={compIcon}
          isLoading={loadingPeriodData}
        />

        <CarbonStatCard
          title="Activity Count"
          value={overview ? String(overview.currentMonth.activityCount) : '0'}
          unit={overview?.currentMonth.activityCount === 1 ? 'activity' : 'activities'}
          subtitle={
            overview
              ? `Recorded in ${overview.period.monthLabel} (${overview.period.elapsedDays} of ${overview.period.totalDays} days elapsed)`
              : 'PostgreSQL activity_logs count'
          }
          icon={<Layers className="h-4 w-4" aria-hidden="true" />}
          isLoading={loadingPeriodData}
        />

        <CarbonStatCard
          title="Highest Emission Category"
          value={topCategory?.topCategory ? topCategory.topCategory.category : 'None'}
          isNumeric={Boolean(topCategory?.topCategory)}
          subtitle={
            topCategory?.topCategory
              ? `${topCategory.topCategory.totalEmissionsKg.toFixed(2)} kg CO₂e (${topCategory.topCategory.percentageShare.toFixed(1)}% of total)`
              : topCategory?.message ??
                'Log your first activity to discover your highest emission category.'
          }
          tone={topCategory?.topCategory ? 'default' : 'muted'}
          icon={<Award className="h-4 w-4" aria-hidden="true" />}
          isLoading={loadingPeriodData}
        />
      </section>

      {/* Middle Section: Monthly Trend + Category Breakdown */}
      <section
        aria-label="Monthly and category analytics"
        className="grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <MonthlyEmissionsChart
          title="Monthly Emission Trend"
          description={
            monthlyTrend
              ? `Trailing ${range} calendar months ending ${monthlyTrend.endPeriod.monthLabel} (kg CO₂e).`
              : `Trailing ${range} calendar months (kg CO₂e).`
          }
          trend={monthlyTrend}
          range={range}
          onRangeChange={setRange}
          isLoading={loadingMonthlyTrend}
          error={monthlyError}
          onRetry={() => void loadMonthlySeries()}
        />

        <CategoryBreakdownChart
          title="Category Breakdown"
          description={
            breakdown
              ? `Cumulative emissions split for ${breakdown.period.monthLabel}.`
              : 'Cumulative emissions split across Transportation, Energy, and Lifestyle.'
          }
          breakdown={breakdown}
          isLoading={loadingPeriodData}
          error={periodError}
          onRetry={() => void loadPeriodAnalytics()}
        />
      </section>

      {/* Bottom Section: Daily Emission Trend + Category Summary Table */}
      <section
        aria-label="Daily trend and category table"
        className="grid grid-cols-1 gap-6 xl:grid-cols-3"
      >
        <div className="xl:col-span-2">
          <DailyEmissionsChart
            dailyTrend={dailyTrend}
            isLoading={loadingPeriodData}
            error={periodError}
            onRetry={() => void loadPeriodAnalytics()}
          />
        </div>

        <Card className="flex flex-col">
          <CardHeader
            title="Category Summary Table"
            description={
              breakdown
                ? `PostgreSQL SUM() & COUNT() breakdown for ${breakdown.period.monthLabel}.`
                : 'Category totals and percentage shares.'
            }
          />
          <div className="mt-5 flex-1">
            {loadingPeriodData ? (
              <LoadingSkeleton variant="table" label="Loading category summary table..." />
            ) : periodError ? (
              <AnalyticsErrorState
                message={periodError}
                onRetry={() => void loadPeriodAnalytics()}
              />
            ) : (
              <Table
                columns={CATEGORY_SUMMARY_COLUMNS}
                rows={breakdown?.categories ?? []}
                rowKey={(row) => row.category}
                caption="Monthly carbon emission summary by activity category"
                emptyState={
                  <AnalyticsEmptyState
                    title="No category summary available"
                    description="No activities were recorded in the selected month."
                  />
                }
              />
            )}
          </div>
          {breakdown && !loadingPeriodData && !periodError ? (
            <div className="mt-4 pt-3 border-t border-[#E1EAE4] flex items-center justify-between text-xs">
              <span className="font-semibold text-[#18392C]">Total ({breakdown.totalActivities} entries)</span>
              <span className="font-mono font-bold text-[#176B52] tabular-nums">
                {breakdown.totalEmissionsKg.toFixed(2)} kg CO₂e
              </span>
            </div>
          ) : null}
        </Card>
      </section>

      {/* Monthly Carbon Report & CSV Export */}
      <MonthlyReportCard
        year={selectedYear}
        month={selectedMonth}
        refreshTick={refreshTick}
      />
    </div>
  );
}
