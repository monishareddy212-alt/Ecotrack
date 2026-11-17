import { computeGoalProgress } from '../utils/goalValidation';
import {
  generateRuleBasedRecommendations,
  type RecommendationItem,
} from '../utils/recommendationEngine';
import { getAnalyticsOverview, type AnalyticsPeriodMeta } from './analyticsService';

export interface RecommendationsResponseDTO {
  period: AnalyticsPeriodMeta;
  recommendations: RecommendationItem[];
}

export async function getUserRecommendations(
  userId: string,
  year: number,
  month: number,
  now: Date = new Date()
): Promise<RecommendationsResponseDTO> {
  const overview = await getAnalyticsOverview(userId, year, month, now);
  const goalProgress = computeGoalProgress(
    overview.goal ? overview.goal.targetCo2eKg : null,
    overview.currentMonth.totalEmissionsKg,
    overview.currentMonth.activityCount
  );

  const recommendations = generateRuleBasedRecommendations({
    periodLabel: overview.period.monthLabel,
    totalEmissionsKg: overview.currentMonth.totalEmissionsKg,
    activityCount: overview.currentMonth.activityCount,
    highestCategory: overview.highestCategory
      ? {
          category: overview.highestCategory.category,
          totalEmissionsKg: overview.highestCategory.totalEmissionsKg,
          percentageShare: overview.highestCategory.percentageShare,
        }
      : null,
    goalProgress,
  });

  return {
    period: overview.period,
    recommendations,
  };
}
