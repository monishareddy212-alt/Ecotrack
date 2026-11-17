import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeMonthComparison,
  getCalendarDaysInMonth,
  getDaysInMonth,
  getElapsedDaysForMonth,
  getMonthBounds,
  getTodayInReportingTimezone,
  getTrailingMonthRange,
  isLeapYear,
  parseNumericValue,
  validateAnalyticsPeriodQuery,
} from './analyticsDates';

test('isLeapYear and getDaysInMonth handle leap years and century boundaries accurately', () => {
  assert.equal(isLeapYear(2024), true);
  assert.equal(isLeapYear(2025), false);
  assert.equal(isLeapYear(2000), true);
  assert.equal(isLeapYear(1900), false);

  assert.equal(getDaysInMonth(2024, 2), 29);
  assert.equal(getDaysInMonth(2026, 2), 28);
  assert.equal(getDaysInMonth(2026, 11), 30);
  assert.equal(getDaysInMonth(2026, 12), 31);
});

test('getMonthBounds handles January and December year transitions properly', () => {
  const janBounds = getMonthBounds(2026, 1);
  assert.equal(janBounds.monthStart, '2026-01-01');
  assert.equal(janBounds.nextMonthStart, '2026-02-01');
  assert.equal(janBounds.previousYear, 2025);
  assert.equal(janBounds.previousMonth, 12);
  assert.equal(janBounds.previousMonthStart, '2025-12-01');

  const decBounds = getMonthBounds(2026, 12);
  assert.equal(decBounds.monthStart, '2026-12-01');
  assert.equal(decBounds.nextMonthStart, '2027-01-01');
  assert.equal(decBounds.previousYear, 2026);
  assert.equal(decBounds.previousMonth, 11);
});

test('getTodayInReportingTimezone uses Asia/Kolkata and getElapsedDaysForMonth differentiates current vs completed months', () => {
  // 2026-11-16T20:00:00Z is 2026-11-17 01:30 IST in Asia/Kolkata
  const utcEvening = new Date('2026-11-16T20:00:00.000Z');
  const istToday = getTodayInReportingTimezone(utcEvening);
  assert.equal(istToday.isoDate, '2026-11-17');
  assert.equal(istToday.year, 2026);
  assert.equal(istToday.month, 11);
  assert.equal(istToday.day, 17);

  const currentElapsed = getElapsedDaysForMonth(2026, 11, istToday);
  assert.deepEqual(currentElapsed, {
    elapsedDays: 17,
    isCurrentMonth: true,
    isFutureMonth: false,
  });

  const completedElapsed = getElapsedDaysForMonth(2024, 2, istToday);
  assert.deepEqual(completedElapsed, {
    elapsedDays: 29,
    isCurrentMonth: false,
    isFutureMonth: false,
  });

  const futureElapsed = getElapsedDaysForMonth(2026, 12, istToday);
  assert.deepEqual(futureElapsed, {
    elapsedDays: 0,
    isCurrentMonth: false,
    isFutureMonth: true,
  });
});

test('getTrailingMonthRange builds exact 6-month and 12-month contiguous calendar windows across years', () => {
  const sixMonths = getTrailingMonthRange(2026, 2, 6);
  assert.equal(sixMonths.length, 6);
  assert.deepEqual(
    sixMonths.map((s) => s.monthKey),
    ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02']
  );
  assert.equal(sixMonths[5].nextMonthStart, '2026-03-01');

  const twelveMonths = getTrailingMonthRange(2026, 11, 12);
  assert.equal(twelveMonths.length, 12);
  assert.equal(twelveMonths[0].monthKey, '2025-12');
  assert.equal(twelveMonths[11].monthKey, '2026-11');
});

test('getCalendarDaysInMonth generates full calendar sequences including leap Feb 29', () => {
  const leapFeb = getCalendarDaysInMonth(2024, 2);
  assert.equal(leapFeb.length, 29);
  assert.equal(leapFeb[0].date, '2024-02-01');
  assert.equal(leapFeb[28].date, '2024-02-29');

  const regFeb = getCalendarDaysInMonth(2026, 2);
  assert.equal(regFeb.length, 28);
});

test('computeMonthComparison handles decreases, increases, no change, and zero prior emissions safely', () => {
  const zeroPrevWithCurrent = computeMonthComparison(42.5, 0);
  assert.equal(zeroPrevWithCurrent.percentageChange, null);
  assert.equal(zeroPrevWithCurrent.differenceKg, 42.5);
  assert.equal(zeroPrevWithCurrent.direction, 'insufficient_data');

  const bothZero = computeMonthComparison(0, 0);
  assert.equal(bothZero.percentageChange, null);
  assert.equal(bothZero.differenceKg, 0);
  assert.equal(bothZero.direction, 'insufficient_data');

  const decrease = computeMonthComparison(75, 100);
  assert.equal(decrease.differenceKg, -25);
  assert.equal(decrease.percentageChange, -25);
  assert.equal(decrease.direction, 'decrease');

  const increase = computeMonthComparison(125, 100);
  assert.equal(increase.differenceKg, 25);
  assert.equal(increase.percentageChange, 25);
  assert.equal(increase.direction, 'increase');

  const same = computeMonthComparison(100, 100);
  assert.equal(same.differenceKg, 0);
  assert.equal(same.percentageChange, 0);
  assert.equal(same.direction, 'no_change');
});

test('validateAnalyticsPeriodQuery accepts valid year/month/range and rejects invalid filters', () => {
  const refNow = new Date('2026-11-16T12:00:00.000Z');
  const defaults = validateAnalyticsPeriodQuery({}, refNow);
  assert.equal(defaults.valid, true);
  assert.deepEqual(defaults.data, { year: 2026, month: 11, range: 6 });

  const valid = validateAnalyticsPeriodQuery({ year: '2024', month: '2', range: '12' }, refNow);
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.data, { year: 2024, month: 2, range: 12 });

  const invalidMonth = validateAnalyticsPeriodQuery({ month: '13' }, refNow);
  assert.equal(invalidMonth.valid, false);
  assert.ok(invalidMonth.errors.month);

  const invalidYear = validateAnalyticsPeriodQuery({ year: '1995' }, refNow);
  assert.equal(invalidYear.valid, false);
  assert.ok(invalidYear.errors.year);

  const invalidRange = validateAnalyticsPeriodQuery({ range: '24' }, refNow);
  assert.equal(invalidRange.valid, false);
  assert.ok(invalidRange.errors.range);

  const sqlInjection = validateAnalyticsPeriodQuery({ year: '2026; DROP TABLE activity_logs;' }, refNow);
  assert.equal(sqlInjection.valid, false);
  assert.ok(sqlInjection.errors.year);
});

test('parseNumericValue safely converts PostgreSQL NUMERIC strings and prevents NaN/Infinity', () => {
  assert.equal(parseNumericValue('87.240000'), 87.24);
  assert.equal(parseNumericValue(null), 0);
  assert.equal(parseNumericValue('not-a-number'), 0);
  assert.equal(parseNumericValue(Infinity), 0);
});
