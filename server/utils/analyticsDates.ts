import type { ValidationResult } from './validation';

export const DEFAULT_REPORTING_TIMEZONE = 'Asia/Kolkata';

const SHORT_MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const FULL_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export interface ReportingDateParts {
  year: number;
  month: number;
  day: number;
  isoDate: string;
}

export interface MonthBounds {
  year: number;
  month: number;
  monthKey: string;
  monthLabel: string;
  shortLabel: string;
  monthStart: string;
  nextMonthStart: string;
  previousYear: number;
  previousMonth: number;
  previousMonthKey: string;
  previousMonthLabel: string;
  previousMonthStart: string;
  totalDays: number;
}

export interface TrailingMonthSlot {
  year: number;
  month: number;
  monthKey: string;
  shortLabel: string;
  monthLabel: string;
  monthStart: string;
  nextMonthStart: string;
}

export type ComparisonDirection =
  | 'increase'
  | 'decrease'
  | 'no_change'
  | 'insufficient_data';

export interface PeriodComparisonResult {
  differenceKg: number;
  percentageChange: number | null;
  direction: ComparisonDirection;
  explanation: string;
}

export interface ValidatedAnalyticsPeriod {
  year: number;
  month: number;
  range: 6 | 12;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function roundToDecimals(value: number, decimals = 6): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function parseNumericValue(value: string | number | null | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return 0;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function getTodayInReportingTimezone(
  now: Date = new Date(),
  timeZone: string = DEFAULT_REPORTING_TIMEZONE
): ReportingDateParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const year = Number(parts.find((p) => p.type === 'year')?.value ?? '2026');
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? '1');
  const day = Number(parts.find((p) => p.type === 'day')?.value ?? '1');

  return {
    year,
    month,
    day,
    isoDate: `${year}-${pad2(month)}-${pad2(day)}`,
  };
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function getDaysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  if (month === 4 || month === 6 || month === 9 || month === 11) {
    return 30;
  }
  return 31;
}

export function formatMonthKey(year: number, month: number): string {
  return `${year}-${pad2(month)}`;
}

export function formatIsoDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function getMonthBounds(year: number, month: number): MonthBounds {
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;

  const previousYear = month === 1 ? year - 1 : year;
  const previousMonth = month === 1 ? 12 : month - 1;

  return {
    year,
    month,
    monthKey: formatMonthKey(year, month),
    monthLabel: `${FULL_MONTH_NAMES[month - 1]} ${year}`,
    shortLabel: `${SHORT_MONTH_NAMES[month - 1]} ${String(year).slice(-2)}`,
    monthStart: formatIsoDate(year, month, 1),
    nextMonthStart: formatIsoDate(nextYear, nextMonth, 1),
    previousYear,
    previousMonth,
    previousMonthKey: formatMonthKey(previousYear, previousMonth),
    previousMonthLabel: `${FULL_MONTH_NAMES[previousMonth - 1]} ${previousYear}`,
    previousMonthStart: formatIsoDate(previousYear, previousMonth, 1),
    totalDays: getDaysInMonth(year, month),
  };
}

export function getElapsedDaysForMonth(
  year: number,
  month: number,
  today: ReportingDateParts
): { elapsedDays: number; isCurrentMonth: boolean; isFutureMonth: boolean } {
  const totalDays = getDaysInMonth(year, month);
  if (year > today.year || (year === today.year && month > today.month)) {
    return { elapsedDays: 0, isCurrentMonth: false, isFutureMonth: true };
  }
  if (year === today.year && month === today.month) {
    return {
      elapsedDays: Math.min(Math.max(today.day, 1), totalDays),
      isCurrentMonth: true,
      isFutureMonth: false,
    };
  }
  return { elapsedDays: totalDays, isCurrentMonth: false, isFutureMonth: false };
}

export function getTrailingMonthRange(
  endYear: number,
  endMonth: number,
  rangeMonths: 6 | 12
): TrailingMonthSlot[] {
  const slots: TrailingMonthSlot[] = [];
  let cursorYear = endYear;
  let cursorMonth = endMonth;

  for (let i = 0; i < rangeMonths; i++) {
    const bounds = getMonthBounds(cursorYear, cursorMonth);
    slots.unshift({
      year: cursorYear,
      month: cursorMonth,
      monthKey: bounds.monthKey,
      shortLabel: bounds.shortLabel,
      monthLabel: bounds.monthLabel,
      monthStart: bounds.monthStart,
      nextMonthStart: bounds.nextMonthStart,
    });

    cursorYear = bounds.previousYear;
    cursorMonth = bounds.previousMonth;
  }

  return slots;
}

export function getCalendarDaysInMonth(year: number, month: number): Array<{
  date: string;
  dayNumber: number;
  label: string;
}> {
  const totalDays = getDaysInMonth(year, month);
  const days: Array<{ date: string; dayNumber: number; label: string }> = [];
  for (let day = 1; day <= totalDays; day++) {
    days.push({
      date: formatIsoDate(year, month, day),
      dayNumber: day,
      label: `${SHORT_MONTH_NAMES[month - 1]} ${day}`,
    });
  }
  return days;
}

export function computeMonthComparison(
  currentKg: number,
  previousKg: number,
  previousLabel = 'previous month'
): PeriodComparisonResult {
  const safeCurrent = roundToDecimals(parseNumericValue(currentKg), 6);
  const safePrevious = roundToDecimals(parseNumericValue(previousKg), 6);
  const differenceKg = roundToDecimals(safeCurrent - safePrevious, 6);

  if (safePrevious <= 0) {
    return {
      differenceKg,
      percentageChange: null,
      direction: 'insufficient_data',
      explanation:
        safeCurrent === 0
          ? `Both this period and ${previousLabel} recorded 0.00 kg CO₂e.`
          : `${previousLabel} recorded 0.00 kg CO₂e, so no valid percentage comparison is available.`,
    };
  }

  const percentageChange = roundToDecimals(
    ((safeCurrent - safePrevious) / safePrevious) * 100,
    2
  );

  if (Math.abs(differenceKg) < 0.000001) {
    return {
      differenceKg: 0,
      percentageChange: 0,
      direction: 'no_change',
      explanation: `Emissions match ${previousLabel} (${safePrevious.toFixed(2)} kg CO₂e).`,
    };
  }

  if (differenceKg > 0) {
    return {
      differenceKg,
      percentageChange,
      direction: 'increase',
      explanation: `${Math.abs(percentageChange).toFixed(1)}% higher than ${previousLabel}.`,
    };
  }

  return {
    differenceKg,
    percentageChange,
    direction: 'decrease',
    explanation: `${Math.abs(percentageChange).toFixed(1)}% lower than ${previousLabel}.`,
  };
}

export function validateAnalyticsPeriodQuery(
  query: Record<string, unknown>,
  now: Date = new Date()
): ValidationResult<ValidatedAnalyticsPeriod> {
  const errors: Record<string, string> = {};
  const today = getTodayInReportingTimezone(now);

  let year = today.year;
  if (query.year !== undefined && String(query.year).trim() !== '') {
    const rawYear = String(query.year).trim();
    if (!/^\d{4}$/.test(rawYear)) {
      errors.year = 'Year must be a 4-digit integer.';
    } else {
      const parsedYear = Number(rawYear);
      if (!Number.isInteger(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
        errors.year = 'Year must be between 2000 and 2100.';
      } else {
        year = parsedYear;
      }
    }
  }

  let month = today.month;
  if (query.month !== undefined && String(query.month).trim() !== '') {
    const rawMonth = String(query.month).trim();
    if (!/^\d{1,2}$/.test(rawMonth)) {
      errors.month = 'Month must be an integer between 1 and 12.';
    } else {
      const parsedMonth = Number(rawMonth);
      if (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
        errors.month = 'Month must be between 1 and 12.';
      } else {
        month = parsedMonth;
      }
    }
  }

  let range: 6 | 12 = 6;
  if (query.range !== undefined && String(query.range).trim() !== '') {
    const rawRange = String(query.range).trim();
    if (rawRange === '6' || rawRange === '6m') {
      range = 6;
    } else if (rawRange === '12' || rawRange === '12m') {
      range = 12;
    } else {
      errors.range = 'Chart range must be 6 or 12 months.';
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    data: { year, month, range },
  };
}
