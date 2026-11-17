import test from 'node:test';
import assert from 'node:assert/strict';
import { computeGoalProgress } from './goalValidation';
import { generateRuleBasedRecommendations } from './recommendationEngine';

test('recommendationEngine returns onboarding guidance when no activities exist', () => {
  const recs = generateRuleBasedRecommendations({
    periodLabel: 'November 2026',
    totalEmissionsKg: 0,
    activityCount: 0,
    highestCategory: null,
    goalProgress: computeGoalProgress(null, 0, 0),
  });

  assert.equal(recs.length, 2);
  assert.equal(recs[0].id, 'onboarding-01');
  assert.equal(recs[1].id, 'goal-setup-01');
});

test('recommendationEngine applies deterministic rules for Transportation, Energy, Lifestyle, and Goal status without duplicates', () => {
  const transportExceeded = generateRuleBasedRecommendations({
    periodLabel: 'November 2026',
    totalEmissionsKg: 120,
    activityCount: 4,
    highestCategory: { category: 'Transportation', totalEmissionsKg: 80, percentageShare: 66.7 },
    goalProgress: computeGoalProgress(100, 120, 4),
  });
  assert.equal(transportExceeded.length, 2);
  assert.equal(transportExceeded[0].id, 'transport-01');
  assert.match(transportExceeded[0].description, /walking, cycling, or public transport/i);
  assert.equal(transportExceeded[1].id, 'goal-exceeded-01');

  const energyWithin = generateRuleBasedRecommendations({
    periodLabel: 'November 2026',
    totalEmissionsKg: 60,
    activityCount: 2,
    highestCategory: { category: 'Energy', totalEmissionsKg: 45, percentageShare: 75 },
    goalProgress: computeGoalProgress(100, 60, 2),
  });
  assert.equal(energyWithin[0].id, 'energy-01');
  assert.match(energyWithin[0].description, /appliance efficiency/i);
  assert.equal(energyWithin[1].id, 'goal-within-01');

  const lifestyleNoGoal = generateRuleBasedRecommendations({
    periodLabel: 'November 2026',
    totalEmissionsKg: 30,
    activityCount: 2,
    highestCategory: { category: 'Lifestyle', totalEmissionsKg: 20, percentageShare: 66.7 },
    goalProgress: computeGoalProgress(null, 30, 2),
  });
  assert.equal(lifestyleNoGoal[0].id, 'lifestyle-01');
  assert.equal(lifestyleNoGoal[1].id, 'goal-setup-01');
  assert.ok(lifestyleNoGoal.length <= 3);
});
