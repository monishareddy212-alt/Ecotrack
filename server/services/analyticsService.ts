import { query } from '../db/connection';
import {
  DEFAULT_REPORTING_TIMEZONE,
  computeMonthComparison,
  formatIsoDate,
  getCalendarDaysInMonth,
  getDaysInMonth,
  getElapsedDaysForMonth,
  getMonthBounds,
  getTodayInReportingTimezone,
  getTrailingMonthRange,
  parseNumericValue,
  roundToDecimals,
  type PeriodComparisonResult,
} from '../utils/analyticsDates';
import { listRecentUserActivities, type ActivityDTO } from './activityService';
import { computeGoalProgress } from '../utils/goalValidation';

export type ActivityCategoryName = 'Transportation' | 'Energy' | 'Lifestyle';

const ALL_CATEGORIES: readonly ActivityCategoryName[] = [
  'Transportation',
  'Energy',
  'Lifestyle',
];

export interface AnalyticsPeriodMeta {
  year: number;
  month: number;
  monthKey: string;
  monthLabel: string;
  monthStart: string;
  nextMonthStart: string;
  totalDays: number;
  elapsedDays: number;
  isCurrentMonth: boolean;
  isFutureMonth: boolean;
  reportingTimezone: string;
}

export interface MonthlyGoalStatusDTO {
  id: string;
  goalMonth: string;
  targetCo2eKg: number;
  percentageUsed: number;
  remainingKg: number;
  status: 'within_target' | 'approaching_target' | 'at_target' | 'exceeded';
}

export interface CategoryBreakdownItemDTO {
  category: ActivityCategoryName;
  totalEmissionsKg: number;
  percentageShare: number;
  activityCount: number;
}

export interface AnalyticsOverviewDTO {
  period: AnalyticsPeriodMeta;
  currentMonth: {
    totalEmissionsKg: number;
    activityCount: number;
    dailyAverageKg: number;
  };
  previousMonth: {
    monthKey: string;
    monthLabel: string;
    totalEmissionsKg: number;
    activityCount: number;
    sameWindowDays: number | null;
    sameWindowEmissionsKg: number | null;
  };
  comparison: PeriodComparisonResult;
  sameWindowComparison: PeriodComparisonResult | null;
  goal: MonthlyGoalStatusDTO | null;
  highestCategory: CategoryBreakdownItemDTO | null;
}

export interface MonthlyTrendPointDTO {
  year: number;
  month: number;
  monthKey: string;
  shortLabel: string;
  monthLabel: string;
  totalEmissionsKg: number;
  activityCount: number;
}

export interface MonthlyTrendDTO {
  range: 6 | 12;
  endPeriod: {
    year: number;
    month: number;
    monthKey: string;
    monthLabel: string;
  };
  totalEmissionsKg: number;
  hasData: boolean;
  points: MonthlyTrendPointDTO[];
}

export interface CategoryBreakdownDTO {
  period: AnalyticsPeriodMeta;
  totalEmissionsKg: number;
  totalActivities: number;
  hasData: boolean;
  categories: CategoryBreakdownItemDTO[];
}

export interface DailyTrendPointDTO {
  date: string;
  dayNumber: number;
  label: string;
  totalEmissionsKg: number;
  activityCount: number;
}

export interface DailyTrendDTO {
  period: AnalyticsPeriodMeta;
  totalEmissionsKg: number;
  totalActivities: number;
  hasData: boolean;
  points: DailyTrendPointDTO[];
}

export interface TopCategoryDTO {
  period: AnalyticsPeriodMeta;
  totalEmissionsKg: number;
  topCategory: CategoryBreakdownItemDTO | null;
  message: string;
}

function buildPeriodMeta(
  year: number,
  month: number,
  now: Date = new Date()
): AnalyticsPeriodMeta {
  const bounds = getMonthBounds(year, month);
  const today = getTodayInReportingTimezone(now, DEFAULT_REPORTING_TIMEZONE);
  const elapsed = getElapsedDaysForMonth(year, month, today);

  return {
    year,
    month,
    monthKey: bounds.monthKey,
    monthLabel: bounds.monthLabel,
    monthStart: bounds.monthStart,
    nextMonthStart: bounds.nextMonthStart,
    totalDays: bounds.totalDays,
    elapsedDays: elapsed.elapsedDays,
    isCurrentMonth: elapsed.isCurrentMonth,
    isFutureMonth: elapsed.isFutureMonth,
    reportingTimezone: DEFAULT_REPORTING_TIMEZONE,
  };
}

export async function getAnalyticsOverview(
  userId: string,
  year: number,
  month: number,
  now: Date = new Date()
): Promise<AnalyticsOverviewDTO> {
  const bounds = getMonthBounds(year, month);
  const period = buildPeriodMeta(year, month, now);

  const prevTotalDays = getDaysInMonth(bounds.previousYear, bounds.previousMonth);
  const sameWindowDays = period.isCurrentMonth
    ? Math.min(period.elapsedDays, prevTotalDays)
    : null;
  const sameWindowEndInclusive =
    sameWindowDays !== null
      ? formatIsoDate(bounds.previousYear, bounds.previousMonth, sameWindowDays)
      : null;

  const [
    currentTotalsRes,
    prevTotalsRes,
    prevSameWindowRes,
    goalRes,
    topCatRes,
  ] = await Promise.all([
    query<{ total_emissions: string | number; activity_count: string | number }>(
      `
        SELECT
          CAST(COALESCE(SUM(calculated_co2e), 0) AS CHAR) AS total_emissions,
          CAST(COUNT(*) AS CHAR) AS activity_count
        FROM activity_logs
        WHERE user_id = ?
          AND activity_date >= ?
          AND activity_date < ?
      `,
      [userId, bounds.monthStart, bounds.nextMonthStart]
    ),
    query<{ total_emissions: string | number; activity_count: string | number }>(
      `
        SELECT
          CAST(COALESCE(SUM(calculated_co2e), 0) AS CHAR) AS total_emissions,
          CAST(COUNT(*) AS CHAR) AS activity_count
        FROM activity_logs
        WHERE user_id = ?
          AND activity_date >= ?
          AND activity_date < ?
      `,
      [userId, bounds.previousMonthStart, bounds.monthStart]
    ),
    sameWindowEndInclusive
      ? query<{ total_emissions: string | number }>(
          `
            SELECT CAST(COALESCE(SUM(calculated_co2e), 0) AS CHAR) AS total_emissions
            FROM activity_logs
            WHERE user_id = ?
              AND activity_date >= ?
              AND activity_date <= ?
          `,
          [userId, bounds.previousMonthStart, sameWindowEndInclusive]
        )
      : Promise.resolve(null),
    query<{ id: string | number; goal_month: string; target_co2e: string | number }>(
      `
        SELECT
          id,
          CAST(goal_month AS CHAR) AS goal_month,
          CAST(target_co2e AS CHAR) AS target_co2e
        FROM monthly_goals
        WHERE user_id = ? AND goal_month = ?
        LIMIT 1
      `,
      [userId, bounds.monthStart]
    ),
    query<{
      category: ActivityCategoryName;
      total_emissions: string | number;
      activity_count: string | number;
    }>(
      `
        SELECT
          at.category,
          CAST(COALESCE(SUM(al.calculated_co2e), 0) AS CHAR) AS total_emissions,
          CAST(COUNT(*) AS CHAR) AS activity_count
        FROM activity_logs al
        INNER JOIN emission_factors ef ON ef.id = al.emission_factor_id
        INNER JOIN activity_types at ON at.id = ef.activity_type_id
        WHERE al.user_id = ?
          AND al.activity_date >= ?
          AND al.activity_date < ?
        GROUP BY at.category
        ORDER BY SUM(al.calculated_co2e) DESC, at.category ASC
        LIMIT 1
      `,
      [userId, bounds.monthStart, bounds.nextMonthStart]
    ),
  ]);

  const currentTotalKg = roundToDecimals(
    parseNumericValue(currentTotalsRes.rows[0]?.total_emissions),
    6
  );
  const currentActivityCount = Number(currentTotalsRes.rows[0]?.activity_count ?? 0);
  const dailyAverageKg =
    period.elapsedDays > 0
      ? roundToDecimals(currentTotalKg / period.elapsedDays, 4)
      : 0;

  const prevTotalKg = roundToDecimals(
    parseNumericValue(prevTotalsRes.rows[0]?.total_emissions),
    6
  );
  const prevActivityCount = Number(prevTotalsRes.rows[0]?.activity_count ?? 0);

  const prevSameWindowKg = prevSameWindowRes
    ? roundToDecimals(parseNumericValue(prevSameWindowRes.rows[0]?.total_emissions), 6)
    : null;

  const comparison = computeMonthComparison(
    currentTotalKg,
    prevTotalKg,
    bounds.previousMonthLabel
  );

  const sameWindowComparison =
    sameWindowDays !== null && prevSameWindowKg !== null
      ? computeMonthComparison(
          currentTotalKg,
          prevSameWindowKg,
          `first ${sameWindowDays} day${sameWindowDays === 1 ? '' : 's'} of ${bounds.previousMonthLabel}`
        )
      : null;

  let goal: MonthlyGoalStatusDTO | null = null;
  const goalRow = goalRes.rows[0];
  if (goalRow) {
    const targetCo2eKg = roundToDecimals(parseNumericValue(goalRow.target_co2e), 3);
    const progress = computeGoalProgress(targetCo2eKg, currentTotalKg, currentActivityCount);
    const status: MonthlyGoalStatusDTO['status'] =
      progress.status === 'TARGET_EXCEEDED'
        ? 'exceeded'
        : progress.status === 'AT_TARGET'
          ? 'at_target'
          : progress.status === 'APPROACHING_TARGET'
            ? 'approaching_target'
            : 'within_target';

    goal = {
      id: String(goalRow.id),
      goalMonth: String(goalRow.goal_month).slice(0, 10),
      targetCo2eKg,
      percentageUsed: progress.usagePercentage ?? 0,
      remainingKg: progress.remainingKg ?? targetCo2eKg,
      status,
    };
  }

  let highestCategory: CategoryBreakdownItemDTO | null = null;
  const topRow = topCatRes.rows[0];
  if (topRow && currentTotalKg > 0) {
    const catEmissionsKg = roundToDecimals(parseNumericValue(topRow.total_emissions), 6);
    highestCategory = {
      category: topRow.category,
      totalEmissionsKg: catEmissionsKg,
      percentageShare: roundToDecimals((catEmissionsKg / currentTotalKg) * 100, 1),
      activityCount: Number(topRow.activity_count ?? 0),
    };
  }

  return {
    period,
    currentMonth: {
      totalEmissionsKg: currentTotalKg,
      activityCount: currentActivityCount,
      dailyAverageKg,
    },
    previousMonth: {
      monthKey: bounds.previousMonthKey,
      monthLabel: bounds.previousMonthLabel,
      totalEmissionsKg: prevTotalKg,
      activityCount: prevActivityCount,
      sameWindowDays,
      sameWindowEmissionsKg: prevSameWindowKg,
    },
    comparison,
    sameWindowComparison,
    goal,
    highestCategory,
  };
}

export async function getMonthlyTrend(
  userId: string,
  endYear: number,
  endMonth: number,
  range: 6 | 12
): Promise<MonthlyTrendDTO> {
  const slots = getTrailingMonthRange(endYear, endMonth, range);
  const firstSlot = slots[0];
  const lastSlot = slots[slots.length - 1];

  const result = await query<{
    month_key: string;
    total_emissions: string | number;
    activity_count: string | number;
  }>(
    `
      SELECT
        DATE_FORMAT(activity_date, '%Y-%m') AS month_key,
        CAST(COALESCE(SUM(calculated_co2e), 0) AS CHAR) AS total_emissions,
        CAST(COUNT(*) AS CHAR) AS activity_count
      FROM activity_logs
      WHERE user_id = ?
        AND activity_date >= ?
        AND activity_date < ?
      GROUP BY DATE_FORMAT(activity_date, '%Y-%m')
      ORDER BY month_key ASC
    `,
    [userId, firstSlot.monthStart, lastSlot.nextMonthStart]
  );

  const byMonthKey = new Map<string, { totalEmissionsKg: number; activityCount: number }>();
  for (const row of result.rows) {
    byMonthKey.set(row.month_key, {
      totalEmissionsKg: roundToDecimals(parseNumericValue(row.total_emissions), 4),
      activityCount: Number(row.activity_count ?? 0),
    });
  }

  let cumulativeEmissions = 0;
  let totalCount = 0;
  const points: MonthlyTrendPointDTO[] = slots.map((slot) => {
    const match = byMonthKey.get(slot.monthKey);
    const emissions = match?.totalEmissionsKg ?? 0;
    const count = match?.activityCount ?? 0;
    cumulativeEmissions = roundToDecimals(cumulativeEmissions + emissions, 6);
    totalCount += count;

    return {
      year: slot.year,
      month: slot.month,
      monthKey: slot.monthKey,
      shortLabel: slot.shortLabel,
      monthLabel: slot.monthLabel,
      totalEmissionsKg: emissions,
      activityCount: count,
    };
  });

  return {
    range,
    endPeriod: {
      year: lastSlot.year,
      month: lastSlot.month,
      monthKey: lastSlot.monthKey,
      monthLabel: lastSlot.monthLabel,
    },
    totalEmissionsKg: cumulativeEmissions,
    hasData: totalCount > 0,
    points,
  };
}

export async function getCategoryBreakdown(
  userId: string,
  year: number,
  month: number,
  now: Date = new Date()
): Promise<CategoryBreakdownDTO> {
  const period = buildPeriodMeta(year, month, now);

  const result = await query<{
    category: ActivityCategoryName;
    total_emissions: string | number;
    activity_count: string | number;
  }>(
    `
      SELECT
        at.category,
        CAST(COALESCE(SUM(al.calculated_co2e), 0) AS CHAR) AS total_emissions,
        CAST(COUNT(*) AS CHAR) AS activity_count
      FROM activity_logs al
      INNER JOIN emission_factors ef ON ef.id = al.emission_factor_id
      INNER JOIN activity_types at ON at.id = ef.activity_type_id
      WHERE al.user_id = ?
        AND al.activity_date >= ?
        AND al.activity_date < ?
      GROUP BY at.category
      ORDER BY SUM(al.calculated_co2e) DESC, at.category ASC
    `,
    [userId, period.monthStart, period.nextMonthStart]
  );

  const rawMap = new Map<ActivityCategoryName, { emissions: number; count: number }>();
  let totalEmissionsKg = 0;
  let totalActivities = 0;

  for (const row of result.rows) {
    const emissions = roundToDecimals(parseNumericValue(row.total_emissions), 6);
    const count = Number(row.activity_count ?? 0);
    rawMap.set(row.category, { emissions, count });
    totalEmissionsKg = roundToDecimals(totalEmissionsKg + emissions, 6);
    totalActivities += count;
  }

  const categories: CategoryBreakdownItemDTO[] = ALL_CATEGORIES.map((category) => {
    const entry = rawMap.get(category);
    const emissions = entry?.emissions ?? 0;
    const count = entry?.count ?? 0;
    const percentageShare =
      totalEmissionsKg > 0
        ? roundToDecimals((emissions / totalEmissionsKg) * 100, 1)
        : 0;

    return {
      category,
      totalEmissionsKg: emissions,
      percentageShare,
      activityCount: count,
    };
  }).sort((a, b) => b.totalEmissionsKg - a.totalEmissionsKg);

  return {
    period,
    totalEmissionsKg,
    totalActivities,
    hasData: totalActivities > 0,
    categories,
  };
}

export async function getDailyTrend(
  userId: string,
  year: number,
  month: number,
  now: Date = new Date()
): Promise<DailyTrendDTO> {
  const period = buildPeriodMeta(year, month, now);
  const calendarDays = getCalendarDaysInMonth(year, month);

  const result = await query<{
    day_date: string;
    total_emissions: string | number;
    activity_count: string | number;
  }>(
    `
      SELECT
        CAST(activity_date AS CHAR) AS day_date,
        CAST(COALESCE(SUM(calculated_co2e), 0) AS CHAR) AS total_emissions,
        CAST(COUNT(*) AS CHAR) AS activity_count
      FROM activity_logs
      WHERE user_id = ?
        AND activity_date >= ?
        AND activity_date < ?
      GROUP BY activity_date
      ORDER BY activity_date ASC
    `,
    [userId, period.monthStart, period.nextMonthStart]
  );

  const byDate = new Map<string, { totalEmissionsKg: number; activityCount: number }>();
  let totalEmissionsKg = 0;
  let totalActivities = 0;

  for (const row of result.rows) {
    const dayKey = String(row.day_date).slice(0, 10);
    const emissions = roundToDecimals(parseNumericValue(row.total_emissions), 4);
    const count = Number(row.activity_count ?? 0);
    byDate.set(dayKey, { totalEmissionsKg: emissions, activityCount: count });
    totalEmissionsKg = roundToDecimals(totalEmissionsKg + emissions, 6);
    totalActivities += count;
  }

  const points: DailyTrendPointDTO[] = calendarDays.map((day) => {
    const match = byDate.get(day.date);
    return {
      date: day.date,
      dayNumber: day.dayNumber,
      label: day.label,
      totalEmissionsKg: match?.totalEmissionsKg ?? 0,
      activityCount: match?.activityCount ?? 0,
    };
  });

  return {
    period,
    totalEmissionsKg,
    totalActivities,
    hasData: totalActivities > 0,
    points,
  };
}

export async function getTopCategory(
  userId: string,
  year: number,
  month: number,
  now: Date = new Date()
): Promise<TopCategoryDTO> {
  const breakdown = await getCategoryBreakdown(userId, year, month, now);
  const top =
    breakdown.hasData && breakdown.categories[0]?.totalEmissionsKg > 0
      ? breakdown.categories[0]
      : null;

  return {
    period: breakdown.period,
    totalEmissionsKg: breakdown.totalEmissionsKg,
    topCategory: top,
    message: top
      ? `${top.category} is your highest emission category.`
      : 'Log your first activity to discover your highest emission category.',
  };
}

export async function getRecentAnalyticsActivities(
  userId: string,
  limit = 5
): Promise<ActivityDTO[]> {
  return listRecentUserActivities(userId, limit);
}
