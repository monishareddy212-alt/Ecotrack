import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isPositiveIntegerId,
  isValidIsoCalendarDate,
  validateActivityListQuery,
  validateActivityPayload,
} from './activityValidation';

test('isPositiveIntegerId accepts valid positive integer strings and rejects invalid IDs', () => {
  assert.equal(isPositiveIntegerId('1'), true);
  assert.equal(isPositiveIntegerId('4294967296'), true);
  assert.equal(isPositiveIntegerId('0'), false);
  assert.equal(isPositiveIntegerId('-5'), false);
  assert.equal(isPositiveIntegerId('1 OR 1=1'), false);
  assert.equal(isPositiveIntegerId('abc'), false);
});

test('isValidIsoCalendarDate verifies genuine Gregorian calendar dates', () => {
  assert.equal(isValidIsoCalendarDate('2026-11-16'), true);
  assert.equal(isValidIsoCalendarDate('2024-02-29'), true);
  assert.equal(isValidIsoCalendarDate('2025-02-29'), false);
  assert.equal(isValidIsoCalendarDate('2026-02-30'), false);
  assert.equal(isValidIsoCalendarDate('2026-13-01'), false);
  assert.equal(isValidIsoCalendarDate('16-11-2026'), false);
});

test('validateActivityPayload accepts valid activity payloads and rejects negative or zero quantities', () => {
  const ok = validateActivityPayload({
    activityTypeId: '1',
    quantity: '25.5',
    unit: 'km',
    activityDate: '2026-11-16',
  });
  assert.equal(ok.valid, true);
  assert.deepEqual(ok.data, {
    activityTypeId: '1',
    quantity: '25.5',
    unit: 'km',
    activityDate: '2026-11-16',
  });

  const zeroQty = validateActivityPayload({
    activityTypeId: '1',
    quantity: '0',
    activityDate: '2026-11-16',
  });
  assert.equal(zeroQty.valid, false);
  assert.ok(zeroQty.errors.quantity);

  const negativeQty = validateActivityPayload({
    activityTypeId: '1',
    quantity: '-12.5',
    activityDate: '2026-11-16',
  });
  assert.equal(negativeQty.valid, false);
  assert.ok(negativeQty.errors.quantity);

  const tooManyDecimals = validateActivityPayload({
    activityTypeId: '1',
    quantity: '10.1234',
    activityDate: '2026-11-16',
  });
  assert.equal(tooManyDecimals.valid, false);
  assert.ok(tooManyDecimals.errors.quantity);

  const invalidDate = validateActivityPayload({
    activityTypeId: '1',
    quantity: '10',
    activityDate: '2026-02-30',
  });
  assert.equal(invalidDate.valid, false);
  assert.ok(invalidDate.errors.activityDate);

  const overMax = validateActivityPayload({
    activityTypeId: '1',
    quantity: '1000001',
    activityDate: '2026-11-16',
  });
  assert.equal(overMax.valid, false);
  assert.ok(overMax.errors.quantity);
});

test('validateActivityListQuery enforces sort whitelist, pagination bounds, and date ranges', () => {
  const defaults = validateActivityListQuery({});
  assert.equal(defaults.valid, true);
  assert.equal(defaults.data?.sort, 'date_desc');
  assert.equal(defaults.data?.page, 1);
  assert.equal(defaults.data?.limit, 10);

  const validFiltered = validateActivityListQuery({
    category: 'Transportation',
    activityTypeId: '2',
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    search: 'Bus',
    sort: 'emissions_desc',
    page: '2',
    limit: '25',
  });
  assert.equal(validFiltered.valid, true);
  assert.equal(validFiltered.data?.category, 'Transportation');
  assert.equal(validFiltered.data?.sort, 'emissions_desc');
  assert.equal(validFiltered.data?.page, 2);
  assert.equal(validFiltered.data?.limit, 25);

  // SQL-injection attempt in sort or category is rejected safely
  const badSort = validateActivityListQuery({ sort: 'activity_date DESC; DROP TABLE activity_logs;' });
  assert.equal(badSort.valid, false);
  assert.ok(badSort.errors.sort);

  const badCategory = validateActivityListQuery({ category: "Energy' OR '1'='1" });
  assert.equal(badCategory.valid, false);
  assert.ok(badCategory.errors.category);

  const invertedDates = validateActivityListQuery({
    startDate: '2026-11-20',
    endDate: '2026-11-10',
  });
  assert.equal(invertedDates.valid, false);
  assert.ok(invertedDates.errors.endDate);

  const badPagination = validateActivityListQuery({ page: '0', limit: '500' });
  assert.equal(badPagination.valid, false);
  assert.ok(badPagination.errors.page);
  assert.ok(badPagination.errors.limit);
});

test('validateActivityListQuery validates minEmissions and maxEmissions numeric ranges cleanly', () => {
  const validRange = validateActivityListQuery({
    minEmissions: '2.5',
    maxEmissions: '150.25',
  });
  assert.equal(validRange.valid, true);
  assert.equal(validRange.data?.minEmissions, 2.5);
  assert.equal(validRange.data?.maxEmissions, 150.25);

  const zeroMin = validateActivityListQuery({ minEmissions: '0', maxEmissions: '0' });
  assert.equal(zeroMin.valid, true);
  assert.equal(zeroMin.data?.minEmissions, 0);
  assert.equal(zeroMin.data?.maxEmissions, 0);

  const negativeMin = validateActivityListQuery({ minEmissions: '-5' });
  assert.equal(negativeMin.valid, false);
  assert.ok(negativeMin.errors.minEmissions);

  const invertedRange = validateActivityListQuery({
    minEmissions: '100',
    maxEmissions: '50',
  });
  assert.equal(invertedRange.valid, false);
  assert.ok(invertedRange.errors.maxEmissions);

  const sqliRange = validateActivityListQuery({
    maxEmissions: '10 OR 1=1',
  });
  assert.equal(sqliRange.valid, false);
  assert.ok(sqliRange.errors.maxEmissions);
});
