import { apiRequest } from './apiClient';
import type {
  Activity,
  AnalyticsOverview,
  CategoryBreakdown,
  DailyTrend,
  MonthlyTrend,
  TopCategoryResult,
} from '../types/ecotrack';

export interface AnalyticsPeriodParams {
  year?: number;
  month?: number;
  range?: 6 | 12;
}

function buildPeriodQuery(params: AnalyticsPeriodParams = {}): string {
  const sp = new URLSearchParams();
  if (params.year !== undefined) sp.set('year', String(params.year));
  if (params.month !== undefined) sp.set('month', String(params.month));
  if (params.range !== undefined) sp.set('range', String(params.range));
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export async function fetchAnalyticsOverview(
  params: Pick<AnalyticsPeriodParams, 'year' | 'month'> = {}
): Promise<AnalyticsOverview> {
  const data = await apiRequest<{ overview: AnalyticsOverview }>(
    `/api/analytics/overview${buildPeriodQuery(params)}`
  );
  return data.overview;
}

export async function fetchMonthlyTrend(
  params: AnalyticsPeriodParams = {}
): Promise<MonthlyTrend> {
  const data = await apiRequest<{ trend: MonthlyTrend }>(
    `/api/analytics/monthly-trend${buildPeriodQuery(params)}`
  );
  return data.trend;
}

export async function fetchCategoryBreakdown(
  params: Pick<AnalyticsPeriodParams, 'year' | 'month'> = {}
): Promise<CategoryBreakdown> {
  const data = await apiRequest<{ breakdown: CategoryBreakdown }>(
    `/api/analytics/category-breakdown${buildPeriodQuery(params)}`
  );
  return data.breakdown;
}

export async function fetchDailyTrend(
  params: Pick<AnalyticsPeriodParams, 'year' | 'month'> = {}
): Promise<DailyTrend> {
  const data = await apiRequest<{ dailyTrend: DailyTrend }>(
    `/api/analytics/daily-trend${buildPeriodQuery(params)}`
  );
  return data.dailyTrend;
}

export async function fetchTopCategory(
  params: Pick<AnalyticsPeriodParams, 'year' | 'month'> = {}
): Promise<TopCategoryResult> {
  const data = await apiRequest<{ topCategory: TopCategoryResult }>(
    `/api/analytics/top-category${buildPeriodQuery(params)}`
  );
  return data.topCategory;
}

export async function fetchRecentActivities(limit = 5): Promise<Activity[]> {
  const data = await apiRequest<{ items: Activity[] }>(
    `/api/analytics/recent-activities?limit=${encodeURIComponent(String(limit))}`
  );
  return data.items;
}
