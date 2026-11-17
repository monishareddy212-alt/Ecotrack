import test from 'node:test';
import assert from 'node:assert/strict';
import { computeGoalProgress, validateGoalPayload } from './goalValidation';

test('validateGoalPayload accepts valid YYYY-MM or year/month targets and rejects invalid inputs', () => {
  const validYm = validateGoalPayload({ goalMonth: '2026-11', targetCo2e: '250.5' });
  assert.equal(validYm.valid, true);
  assert.equal(validYm.data?.goalMonth, '2026-11-01');
  assert.equal(validYm.data?.targetCo2e, '250.500');
  assert.equal(validYm.data?.targetCo2eKg, 250.5);

  const validParts = validateGoalPayload({ year: 2026, month: 1, targetCo2e: 100 });
  assert.equal(validParts.valid, true);
  assert.equal(validParts.data?.goalMonth, '2026-01-01');

  // Reject zero, negative, NaN, Infinity, invalid month, non-first-day
  assert.equal(validateGoalPayload({ goalMonth: '2026-11', targetCo2e: 0 }).valid, false);
  assert.equal(validateGoalPayload({ goalMonth: '2026-11', targetCo2e: -25 }).valid, false);
  assert.equal(validateGoalPayload({ goalMonth: '2026-11', targetCo2e: 'NaN' }).valid, false);
  assert.equal(validateGoalPayload({ goalMonth: '2026-11', targetCo2e: Infinity }).valid, false);
  assert.equal(validateGoalPayload({ goalMonth: '2026-13', targetCo2e: 100 }).valid, false);
  assert.equal(validateGoalPayload({ goalMonth: '2026-11-15', targetCo2e: 100 }).valid, false);
});

test('computeGoalProgress enforces threshold states and handles values above 100% and missing goals', () => {
  const noGoal = computeGoalProgress(null, 45, 2);
  assert.equal(noGoal.status, 'NO_TARGET');
  assert.equal(noGoal.usagePercentage, null);
  assert.equal(noGoal.remainingKg, null);

  const within = computeGoalProgress(100, 75, 4);
  assert.equal(within.status, 'WITHIN_TARGET');
  assert.equal(within.usagePercentage, 75);
  assert.equal(within.remainingKg, 25);

  const approaching = computeGoalProgress(100, 80, 5);
  assert.equal(approaching.status, 'APPROACHING_TARGET');
  assert.equal(approaching.usagePercentage, 80);

  const atTarget = computeGoalProgress(100, 100, 6);
  assert.equal(atTarget.status, 'AT_TARGET');
  assert.equal(atTarget.usagePercentage, 100);
  assert.equal(atTarget.remainingKg, 0);

  const exceeded = computeGoalProgress(100, 120, 7);
  assert.equal(exceeded.status, 'TARGET_EXCEEDED');
  assert.equal(exceeded.usagePercentage, 120);
  assert.equal(exceeded.remainingKg, -20);
});
