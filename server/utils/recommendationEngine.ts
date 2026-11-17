import type { GoalProgressResult } from './goalValidation';

export type RecommendationCategory =
  | 'Transportation'
  | 'Energy'
  | 'Lifestyle'
  | 'Goal Tracking'
  | 'Getting Started';

export interface RecommendationItem {
  id: string;
  title: string;
  description: string;
  category: RecommendationCategory;
  reason: string;
}

export interface RecommendationEngineInput {
  periodLabel: string;
  totalEmissionsKg: number;
  activityCount: number;
  highestCategory: {
    category: 'Transportation' | 'Energy' | 'Lifestyle';
    totalEmissionsKg: number;
    percentageShare: number;
  } | null;
  goalProgress: GoalProgressResult | null;
}

export function generateRuleBasedRecommendations(
  input: RecommendationEngineInput
): RecommendationItem[] {
  const results: RecommendationItem[] = [];
  const seenIds = new Set<string>();

  const pushUnique = (item: RecommendationItem) => {
    if (!seenIds.has(item.id) && results.length < 3) {
      seenIds.add(item.id);
      results.push(item);
    }
  };

  if (input.activityCount === 0 || input.totalEmissionsKg <= 0) {
    pushUnique({
      id: 'onboarding-01',
      title: 'Log Your First Activity',
      description:
        'Record everyday travel, electricity, or cooking gas activities to calculate emissions and unlock category insights.',
      category: 'Getting Started',
      reason: `No carbon-emitting activities are recorded for ${input.periodLabel} yet.`,
    });

    if (input.goalProgress && !input.goalProgress.hasGoal) {
      pushUnique({
        id: 'goal-setup-01',
        title: 'Set a Monthly Target',
        description:
          'Configure a monthly carbon emission budget in Sustainability Goals to track progress as you log activities.',
        category: 'Goal Tracking',
        reason: `No monthly target is configured for ${input.periodLabel}.`,
      });
    }

    return results;
  }

  // Rule 1–3: Highest recorded emission category
  if (input.highestCategory) {
    const { category, totalEmissionsKg, percentageShare } = input.highestCategory;
    if (category === 'Transportation') {
      pushUnique({
        id: 'transport-01',
        title: 'Review Your Commute & Travel',
        description:
          'Consider replacing suitable short car journeys with walking, cycling, or public transport where practical.',
        category: 'Transportation',
        reason: `Transportation is your highest recorded emission category (${totalEmissionsKg.toFixed(2)} kg CO₂e, ${percentageShare.toFixed(1)}% of ${input.periodLabel}).`,
      });
    } else if (category === 'Energy') {
      pushUnique({
        id: 'energy-01',
        title: 'Review Home Energy Usage',
        description:
          'Consider reducing unnecessary electricity use and improving appliance efficiency.',
        category: 'Energy',
        reason: `Energy is your highest recorded emission category (${totalEmissionsKg.toFixed(2)} kg CO₂e, ${percentageShare.toFixed(1)}% of ${input.periodLabel}).`,
      });
    } else if (category === 'Lifestyle') {
      pushUnique({
        id: 'lifestyle-01',
        title: 'Review Lifestyle Activities',
        description:
          'Consider reviewing higher-impact consumption and meal choices to identify possible reductions.',
        category: 'Lifestyle',
        reason: `Lifestyle is your highest recorded emission category (${totalEmissionsKg.toFixed(2)} kg CO₂e, ${percentageShare.toFixed(1)}% of ${input.periodLabel}).`,
      });
    }
  }

  // Rule 4–5: Target comparison rules
  if (input.goalProgress && input.goalProgress.hasGoal && input.goalProgress.targetCo2eKg !== null) {
    if (input.goalProgress.status === 'TARGET_EXCEEDED') {
      pushUnique({
        id: 'goal-exceeded-01',
        title: 'Target Exceeded — Review Top Entries',
        description:
          'Your recorded emissions have exceeded your monthly target. Review your highest-emission activities.',
        category: 'Goal Tracking',
        reason: `Recorded emissions (${input.goalProgress.actualEmissionsKg.toFixed(2)} kg CO₂e) exceed your ${input.goalProgress.targetCo2eKg.toFixed(2)} kg CO₂e target (${input.goalProgress.usagePercentage?.toFixed(1)}% used).`,
      });
    } else {
      pushUnique({
        id: 'goal-within-01',
        title: 'Tracking Within Monthly Target',
        description: 'Your recorded emissions are currently within your monthly target.',
        category: 'Goal Tracking',
        reason: `Recorded emissions (${input.goalProgress.actualEmissionsKg.toFixed(2)} kg CO₂e) are at ${input.goalProgress.usagePercentage?.toFixed(1)}% of your ${input.goalProgress.targetCo2eKg.toFixed(2)} kg CO₂e target.`,
      });
    }
  } else {
    pushUnique({
      id: 'goal-setup-01',
      title: 'Set a Monthly Target',
      description:
        'Configure a monthly carbon target in Sustainability Goals to monitor whether recorded activities stay within budget.',
      category: 'Goal Tracking',
      reason: `No monthly sustainability goal is set for ${input.periodLabel}.`,
    });
  }

  return results.slice(0, 3);
}
