import { computeGoalProgress, type GoalProgressResult } from '../utils/goalValidation';
import {
  getAnalyticsOverview,
  getCategoryBreakdown,
  getTopCategory,
  type AnalyticsPeriodMeta,
  type CategoryBreakdownItemDTO,
} from './analyticsService';
import type { ComparisonDirection } from '../utils/analyticsDates';

export interface MonthlyCarbonReportDTO {
  disclaimer: string;
  generatedAt: string;
  period: AnalyticsPeriodMeta;
  summary: {
    totalEmissionsKg: number;
    activityCount: number;
    dailyAverageKg: number;
  };
  categories: CategoryBreakdownItemDTO[];
  highestCategory: CategoryBreakdownItemDTO | null;
  highestCategoryMessage: string;
  goal: GoalProgressResult;
  previousMonthComparison: {
    previousMonthLabel: string;
    previousMonthTotalKg: number;
    differenceKg: number;
    percentageChange: number | null;
    direction: ComparisonDirection;
    explanation: string;
  };
}

export async function getMonthlyCarbonReport(
  userId: string,
  year: number,
  month: number,
  now: Date = new Date()
): Promise<MonthlyCarbonReportDTO> {
  const [overview, breakdown, topCat] = await Promise.all([
    getAnalyticsOverview(userId, year, month, now),
    getCategoryBreakdown(userId, year, month, now),
    getTopCategory(userId, year, month, now),
  ]);

  const goal = computeGoalProgress(
    overview.goal ? overview.goal.targetCo2eKg : null,
    overview.currentMonth.totalEmissionsKg,
    overview.currentMonth.activityCount
  );

  return {
    disclaimer: 'Estimated emissions from your recorded activities.',
    generatedAt: now.toISOString(),
    period: overview.period,
    summary: overview.currentMonth,
    categories: breakdown.categories,
    highestCategory: topCat.topCategory,
    highestCategoryMessage: topCat.message,
    goal,
    previousMonthComparison: {
      previousMonthLabel: overview.previousMonth.monthLabel,
      previousMonthTotalKg: overview.previousMonth.totalEmissionsKg,
      differenceKg: overview.comparison.differenceKg,
      percentageChange: overview.comparison.percentageChange,
      direction: overview.comparison.direction,
      explanation: overview.comparison.explanation,
    },
  };
}
