import { query, withTransaction } from '../db/connection';
import {
  DEFAULT_REPORTING_TIMEZONE,
  getElapsedDaysForMonth,
  getMonthBounds,
  getTodayInReportingTimezone,
  parseNumericValue,
  roundToDecimals,
} from '../utils/analyticsDates';
import {
  computeGoalProgress,
  type GoalProgressResult,
  type ValidatedGoalPayload,
} from '../utils/goalValidation';
import type { AnalyticsPeriodMeta } from './analyticsService';

export interface MonthlyGoalDTO {
  id: string;
  userId: string;
  goalMonth: string; // YYYY-MM-01
  monthKey: string; // YYYY-MM
  monthLabel: string;
  targetCo2eKg: number;
  actualEmissionsKg: number;
  activityCount: number;
  createdAt: string;
  progress: GoalProgressResult;
}

export interface CurrentGoalDTO {
  period: AnalyticsPeriodMeta;
  goal: MonthlyGoalDTO | null;
  actualEmissionsKg: number;
  activityCount: number;
  progress: GoalProgressResult;
}

export class GoalNotFoundError extends Error {
  readonly code = 'GOAL_NOT_FOUND';
  constructor(message = 'Sustainability goal not found.') {
    super(message);
    this.name = 'GoalNotFoundError';
  }
}

export class DuplicateGoalError extends Error {
  readonly code = 'GOAL_ALREADY_EXISTS';
  constructor(
    message = 'A monthly sustainability goal already exists for this month. Edit the existing target instead.'
  ) {
    super(message);
    this.name = 'DuplicateGoalError';
  }
}

interface GoalAggregateRow {
  id: string | number;
  user_id: string | number;
  goal_month: string;
  target_co2e: string | number;
  created_at: Date | string;
  actual_emissions: string | number;
  activity_count: string | number;
}

function formatMonthLabel(goalMonthIso: string): { monthKey: string; monthLabel: string } {
  const clean = String(goalMonthIso).slice(0, 10);
  const [yStr, mStr] = clean.split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  const bounds = getMonthBounds(year, month);
  return {
    monthKey: bounds.monthKey,
    monthLabel: bounds.monthLabel,
  };
}

function mapGoalRowToDTO(row: GoalAggregateRow): MonthlyGoalDTO {
  const goalMonth = String(row.goal_month).slice(0, 10);
  const { monthKey, monthLabel } = formatMonthLabel(goalMonth);
  const targetCo2eKg = roundToDecimals(parseNumericValue(row.target_co2e), 3);
  const actualEmissionsKg = roundToDecimals(parseNumericValue(row.actual_emissions), 6);
  const activityCount = Number(row.activity_count ?? 0);

  return {
    id: String(row.id),
    userId: String(row.user_id),
    goalMonth,
    monthKey,
    monthLabel,
    targetCo2eKg,
    actualEmissionsKg,
    activityCount,
    createdAt:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    progress: computeGoalProgress(targetCo2eKg, actualEmissionsKg, activityCount),
  };
}

function buildPeriodMeta(year: number, month: number, now: Date = new Date()): AnalyticsPeriodMeta {
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

const GOAL_AGGREGATE_SELECT = `
  SELECT
    mg.id,
    mg.user_id,
    CAST(mg.goal_month AS CHAR) AS goal_month,
    CAST(mg.target_co2e AS CHAR) AS target_co2e,
    mg.created_at,
    CAST(COALESCE(SUM(al.calculated_co2e), 0) AS CHAR) AS actual_emissions,
    CAST(COUNT(al.id) AS CHAR) AS activity_count
  FROM monthly_goals mg
  LEFT JOIN activity_logs al
    ON al.user_id = mg.user_id
   AND al.activity_date >= mg.goal_month
   AND al.activity_date < DATE_ADD(mg.goal_month, INTERVAL 1 MONTH)
`;

export async function listUserGoals(userId: string): Promise<MonthlyGoalDTO[]> {
  const result = await query<GoalAggregateRow>(
    `
      ${GOAL_AGGREGATE_SELECT}
      WHERE mg.user_id = ?
      GROUP BY mg.id, mg.user_id, mg.goal_month, mg.target_co2e, mg.created_at
      ORDER BY mg.goal_month DESC, mg.id DESC
    `,
    [userId]
  );

  return result.rows.map(mapGoalRowToDTO);
}

export async function getCurrentUserGoal(
  userId: string,
  year: number,
  month: number,
  now: Date = new Date()
): Promise<CurrentGoalDTO> {
  const period = buildPeriodMeta(year, month, now);

  const [goalRes, totalsRes] = await Promise.all([
    query<GoalAggregateRow>(
      `
        ${GOAL_AGGREGATE_SELECT}
        WHERE mg.user_id = ?
          AND mg.goal_month = ?
        GROUP BY mg.id, mg.user_id, mg.goal_month, mg.target_co2e, mg.created_at
        LIMIT 1
      `,
      [userId, period.monthStart]
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
      [userId, period.monthStart, period.nextMonthStart]
    ),
  ]);

  const actualEmissionsKg = roundToDecimals(
    parseNumericValue(totalsRes.rows[0]?.total_emissions),
    6
  );
  const activityCount = Number(totalsRes.rows[0]?.activity_count ?? 0);
  const goalRow = goalRes.rows[0];
  const goal = goalRow ? mapGoalRowToDTO(goalRow) : null;
  const progress = goal
    ? goal.progress
    : computeGoalProgress(null, actualEmissionsKg, activityCount);

  return {
    period,
    goal,
    actualEmissionsKg,
    activityCount,
    progress,
  };
}

function isUniqueViolation(error: unknown): boolean {
  const err = error as { code?: string; errno?: number };
  return (
    err?.code === 'ER_DUP_ENTRY' ||
    err?.errno === 1062 ||
    err?.code === '23505'
  );
}

export async function createUserGoal(
  userId: string,
  input: ValidatedGoalPayload
): Promise<MonthlyGoalDTO> {
  return withTransaction(async (client) => {
    let insertedId: string | number;
    try {
      const insertRes = await client.query(
        `
          INSERT INTO monthly_goals (user_id, goal_month, target_co2e)
          VALUES (?, ?, ?)
        `,
        [userId, input.goalMonth, input.targetCo2e]
      );
      insertedId = insertRes.insertId ?? insertRes.rows[0]?.id;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DuplicateGoalError();
      }
      throw error;
    }

    const rowRes = await client.query<GoalAggregateRow>(
      `
        ${GOAL_AGGREGATE_SELECT}
        WHERE mg.id = ? AND mg.user_id = ?
        GROUP BY mg.id, mg.user_id, mg.goal_month, mg.target_co2e, mg.created_at
        LIMIT 1
      `,
      [insertedId, userId]
    );

    return mapGoalRowToDTO(rowRes.rows[0]);
  });
}

export async function updateUserGoal(
  userId: string,
  goalId: string,
  input: ValidatedGoalPayload
): Promise<MonthlyGoalDTO> {
  return withTransaction(async (client) => {
    const existingRes = await client.query<{ id: string | number }>(
      `
        SELECT id
        FROM monthly_goals
        WHERE id = ? AND user_id = ?
        FOR UPDATE
      `,
      [goalId, userId]
    );

    if (!existingRes.rows[0]) {
      throw new GoalNotFoundError();
    }

    try {
      await client.query(
        `
          UPDATE monthly_goals
          SET
            goal_month = ?,
            target_co2e = ?
          WHERE id = ? AND user_id = ?
        `,
        [input.goalMonth, input.targetCo2e, goalId, userId]
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DuplicateGoalError();
      }
      throw error;
    }

    const rowRes = await client.query<GoalAggregateRow>(
      `
        ${GOAL_AGGREGATE_SELECT}
        WHERE mg.id = ? AND mg.user_id = ?
        GROUP BY mg.id, mg.user_id, mg.goal_month, mg.target_co2e, mg.created_at
        LIMIT 1
      `,
      [goalId, userId]
    );

    return mapGoalRowToDTO(rowRes.rows[0]);
  });
}

export async function deleteUserGoal(userId: string, goalId: string): Promise<void> {
  const res = await query(
    `
      DELETE FROM monthly_goals
      WHERE id = ? AND user_id = ?
    `,
    [goalId, userId]
  );

  if ((res.rowCount ?? 0) === 0) {
    throw new GoalNotFoundError();
  }
}
