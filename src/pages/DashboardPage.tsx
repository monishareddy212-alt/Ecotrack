import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity as ActivityIcon,
  Award,
  CalendarDays,
  Minus,
  PlusCircle,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  AnalyticsEmptyState,
  AnalyticsErrorState,
  LoadingSkeleton,
} from '../components/analytics/AnalyticsStates';
import { CarbonStatCard, type StatTone } from '../components/analytics/CarbonStatCard';
import { CategoryBreakdownChart } from '../components/analytics/CategoryBreakdownChart';
import { GoalProgress } from '../components/analytics/GoalProgress';
import { MonthlyEmissionsChart } from '../components/analytics/MonthlyEmissionsChart';
import { RecentActivityList } from '../components/analytics/RecentActivityList';
import { RecommendationsCard } from '../components/analytics/RecommendationsCard';
import { Card, CardHeader } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { useAuth } from '../context/AuthContext';
import {
  fetchAnalyticsOverview,
  fetchCategoryBreakdown,
  fetchMonthlyTrend,
  fetchRecentActivities,
} from '../services/analyticsApi';
import { subscribeAnalyticsInvalidation } from '../services/analyticsRefresh';
import type {
  Activity,
  AnalyticsOverview,
  CategoryBreakdown,
  MonthlyTrend,
} from '../types/ecotrack';

function formatSignedKg(diff: number): string {
  const prefix = diff > 0 ? '+' : '';
  return `${prefix}${diff.toFixed(2)} kg CO₂e`;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [trendRange, setTrendRange] = useState<6 | 12>(6);
  const [refreshTick, setRefreshTick] = useState(0);

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [trend, setTrend] = useState<MonthlyTrend | null>(null);
  const [breakdown, setBreakdown] = useState<CategoryBreakdown | null>(null);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);

  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingTrend, setLoadingTrend] = useState(true);
  const [loadingBreakdown, setLoadingBreakdown] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [trendError, setTrendError] = useState<string | null>(null);
  const [breakdownError, setBreakdownError] = useState<string | null>(null);
  const [recentError, setRecentError] = useState<string | null>(null);

  // Refresh dashboard metrics automatically when activities are created, edited, or deleted
  useEffect(() => {
    return subscribeAnalyticsInvalidation(() => {
      setRefreshTick((tick) => tick + 1);
    });
  }, []);

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    setOverviewError(null);
    try {
      const data = await fetchAnalyticsOverview();
      setOverview(data);
    } catch (err: unknown) {
      setOverviewError(
        err instanceof Error ? err.message : 'Unable to load monthly overview.'
      );
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  const loadTrend = useCallback(async () => {
    setLoadingTrend(true);
    setTrendError(null);
    try {
      const data = await fetchMonthlyTrend({ range: trendRange });
      setTrend(data);
    } catch (err: unknown) {
      setTrendError(
        err instanceof Error ? err.message : 'Unable to load monthly trend.'
      );
    } finally {
      setLoadingTrend(false);
    }
  }, [trendRange]);

  const loadBreakdown = useCallback(async () => {
    setLoadingBreakdown(true);
    setBreakdownError(null);
    try {
      const data = await fetchCategoryBreakdown();
      setBreakdown(data);
    } catch (err: unknown) {
      setBreakdownError(
        err instanceof Error ? err.message : 'Unable to load category breakdown.'
      );
    } finally {
      setLoadingBreakdown(false);
    }
  }, []);

  const loadRecent = useCallback(async () => {
    setLoadingRecent(true);
    setRecentError(null);
    try {
      const items = await fetchRecentActivities(5);
      setRecentActivities(items);
    } catch (err: unknown) {
      setRecentError(
        err instanceof Error ? err.message : 'Unable to load recent activities.'
      );
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
    void loadBreakdown();
    void loadRecent();
  }, [loadOverview, loadBreakdown, loadRecent, refreshTick]);

  useEffect(() => {
    void loadTrend();
  }, [loadTrend, refreshTick]);

  const welcomePrefix = user ? `Welcome back, ${user.fullName}. ` : '';

  // Compute Card 4 ("vs. Previous Month") presentation
  const comp = overview?.comparison;
  let compValue = '—';
  let compTone: StatTone = 'muted';
  let compIcon = <Minus className="h-4 w-4" aria-hidden="true" />;
  let compSubtitle = 'Comparing against prior calendar month';
  let compSecondary: string | null = null;

  if (overview && comp) {
    const prevLabel = overview.previousMonth.monthLabel;
    const isPartialMonthNote = overview.period.isCurrentMonth
      ? ` (month-to-date vs full ${prevLabel})`
      : ` vs ${prevLabel}`;

    if (comp.direction === 'decrease' && comp.percentageChange !== null) {
      compValue = `${comp.percentageChange.toFixed(1)}%`;
      compTone = 'positive';
      compIcon = <TrendingDown className="h-4 w-4" aria-hidden="true" />;
      compSubtitle = `${formatSignedKg(comp.differenceKg)}${isPartialMonthNote}`;
    } else if (comp.direction === 'increase' && comp.percentageChange !== null) {
      compValue = `+${comp.percentageChange.toFixed(1)}%`;
      compTone = 'negative';
      compIcon = <TrendingUp className="h-4 w-4" aria-hidden="true" />;
      compSubtitle = `${formatSignedKg(comp.differenceKg)}${isPartialMonthNote}`;
    } else if (comp.direction === 'no_change') {
      compValue = '0.0%';
      compTone = 'muted';
      compSubtitle = `No change (0.00 kg CO₂e)${isPartialMonthNote}`;
    } else {
      compValue = 'N/A';
      compTone = 'muted';
      compSubtitle = `${formatSignedKg(comp.differenceKg)} — ${prevLabel} had 0.00 kg CO₂e, so no percentage change applies.`;
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
        title="Your Sustainability Dashboard"
        description={`${welcomePrefix}Track your daily carbon footprint across transportation, home energy, and lifestyle choices, and compare progress against monthly sustainability goals.`}
        action={
          <Link
            to="/add-activity"
            className="inline-flex items-center gap-2 rounded-lg bg-[#176B52] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#18392C] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52]"
          >
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            <span>Add Activity</span>
          </Link>
        }
      />

      {overviewError ? (
        <AnalyticsErrorState message={overviewError} onRetry={() => void loadOverview()} />
      ) : null}

      {/* Top 4 KPI Cards */}
      <section
        aria-label="Key sustainability metrics"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <CarbonStatCard
          title="Monthly Carbon Footprint"
          value={
            overview ? overview.currentMonth.totalEmissionsKg.toFixed(2) : '0.00'
          }
          unit="kg CO₂e"
          subtitle={
            overview
              ? `${overview.period.monthLabel} · ${overview.currentMonth.activityCount} recorded ${
                  overview.currentMonth.activityCount === 1 ? 'activity' : 'activities'
                }`
              : 'Current calendar month'
          }
          icon={<ActivityIcon className="h-4 w-4" aria-hidden="true" />}
          isLoading={loadingOverview}
        />

        <CarbonStatCard
          title="Daily Average Emissions"
          value={
            overview ? overview.currentMonth.dailyAverageKg.toFixed(2) : '0.00'
          }
          unit="kg CO₂e/day"
          subtitle={
            overview
              ? `Across ${overview.period.elapsedDays} elapsed calendar ${
                  overview.period.elapsedDays === 1 ? 'day' : 'days'
                } in ${overview.period.monthLabel}`
              : 'Calendar-day average'
          }
          tooltipText="Calculated as Monthly Total Emissions divided by elapsed calendar days through today (Asia/Kolkata), or total days for completed months. This differs from average emissions per logged activity."
          icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
          isLoading={loadingOverview}
        />

        <GoalProgress
          goal={overview?.goal ?? null}
          currentEmissionsKg={overview?.currentMonth.totalEmissionsKg ?? 0}
          monthLabel={overview?.period.monthLabel ?? 'this month'}
          isLoading={loadingOverview}
        />

        <CarbonStatCard
          title="vs. Previous Month"
          value={compValue}
          subtitle={compSubtitle}
          secondarySubtitle={compSecondary}
          tone={compTone}
          icon={compIcon}
          isLoading={loadingOverview}
        />
      </section>

      {/* Middle Charts Row */}
      <section aria-label="Emission charts" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MonthlyEmissionsChart
          trend={trend}
          range={trendRange}
          onRangeChange={setTrendRange}
          isLoading={loadingTrend}
          error={trendError}
          onRetry={() => void loadTrend()}
        />

        <CategoryBreakdownChart
          title="Category Emission Breakdown"
          description={
            overview
              ? `Emissions split across Transportation, Energy, and Lifestyle for ${overview.period.monthLabel}.`
              : 'Emissions split across Transportation, Energy, and Lifestyle.'
          }
          breakdown={breakdown}
          isLoading={loadingBreakdown}
          error={breakdownError}
          onRetry={() => void loadBreakdown()}
        />
      </section>

      {/* Bottom Row: Recent Activities + Highest Category & Personalized Tips */}
      <section
        aria-label="Recent activities, highest emission category, and sustainability tips"
        className="grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <div className="lg:col-span-2 space-y-6">
          <RecentActivityList
            activities={recentActivities}
            isLoading={loadingRecent}
            error={recentError}
            onRetry={() => void loadRecent()}
          />

          <Card>
            <CardHeader
              title="Highest Emission Category"
              description={
                overview
                  ? `Top contributor for ${overview.period.monthLabel} based on PostgreSQL activity totals.`
                  : 'Top emission source for the current month.'
              }
            />

            <div className="mt-4">
              {loadingOverview ? (
                <LoadingSkeleton variant="card" label="Calculating highest emission category..." />
              ) : overview?.highestCategory ? (
                <div className="rounded-lg border border-[#E1EAE4] bg-[#F6F8F3] p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[#176B52]">
                      <Award className="h-5 w-5 shrink-0" aria-hidden="true" />
                      <p className="text-sm font-semibold text-[#18392C]">
                        {overview.highestCategory.category} is your highest emission category.
                      </p>
                    </div>
                    <p className="text-xs text-[#64766C]">
                      Across {overview.highestCategory.activityCount} logged{' '}
                      {overview.highestCategory.activityCount === 1 ? 'activity' : 'activities'}.{' '}
                      <Link
                        to="/analytics"
                        className="font-medium text-[#176B52] hover:text-[#18392C] underline-offset-2 hover:underline"
                      >
                        Explore daily &amp; monthly analytics
                      </Link>
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-xl font-bold text-[#18392C] font-mono tabular-nums block">
                      {overview.highestCategory.totalEmissionsKg.toFixed(2)} kg CO₂e
                    </span>
                    <span className="text-xs font-semibold text-[#176B52] font-mono tabular-nums">
                      {overview.highestCategory.percentageShare.toFixed(1)}% of monthly total
                    </span>
                  </div>
                </div>
              ) : (
                <AnalyticsEmptyState
                  icon={<Award className="h-5 w-5" aria-hidden="true" />}
                  title="Log your first activity to discover your highest emission category."
                  description="Once activities are recorded for this month, EcoTrack highlights your largest source of carbon emissions here."
                  action={
                    <Link
                      to="/add-activity"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#DCEDE3] px-3.5 py-2 text-xs font-semibold text-[#18392C] hover:bg-[#CCE3D5] transition-colors whitespace-nowrap"
                    >
                      Open Activity Form
                    </Link>
                  }
                />
              )}
            </div>
          </Card>
        </div>

        <RecommendationsCard refreshTick={refreshTick} />
      </section>
    </div>
  );
}
