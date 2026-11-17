import { getDaysInMonth, parseNumericValue, roundToDecimals } from './analyticsDates';
import type { ValidationResult } from './validation';

export type GoalStatusCode =
  | 'NO_TARGET'
  | 'WITHIN_TARGET'
  | 'APPROACHING_TARGET'
  | 'AT_TARGET'
  | 'TARGET_EXCEEDED';

export interface ValidatedGoalPayload {
  year: number;
  month: number;
  goalMonth: string; // YYYY-MM-01
  targetCo2e: string; // normalized numeric string up to 3 decimals
  targetCo2eKg: number;
}

export interface GoalProgressResult {
  hasGoal: boolean;
  targetCo2eKg: number | null;
  actualEmissionsKg: number;
  remainingKg: number | null;
  usagePercentage: number | null;
  status: GoalStatusCode;
  statusLabel: string;
  contextMessage: string;
}

function pad2(val: number): string {
  return String(val).padStart(2, '0');
}

export function validateGoalPayload(body: unknown): ValidationResult<ValidatedGoalPayload> {
  const errors: Record<string, string> = {};
  const input = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;

  let year: number | null = null;
  let month: number | null = null;

  if (typeof input.goalMonth === 'string' && input.goalMonth.trim() !== '') {
    const raw = input.goalMonth.trim();
    const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(raw);
    if (!match) {
      errors.goalMonth = 'Select a valid month and year (YYYY-MM).';
    } else {
      const y = Number(match[1]);
      const m = Number(match[2]);
      const d = match[3] !== undefined ? Number(match[3]) : 1;

      if (y < 2000 || y > 2100 || m < 1 || m > 12) {
        errors.goalMonth = 'Goal month must be between January 2000 and December 2100.';
      } else if (d < 1 || d > getDaysInMonth(y, m) || d !== 1) {
        errors.goalMonth = 'Goal month must correspond to the first day of a valid calendar month.';
      } else {
        year = y;
        month = m;
      }
    }
  } else if (input.year !== undefined || input.month !== undefined) {
    const rawYear = String(input.year ?? '').trim();
    const rawMonth = String(input.month ?? '').trim();

    const y = /^\d{4}$/.test(rawYear) ? Number(rawYear) : NaN;
    const m = /^\d{1,2}$/.test(rawMonth) ? Number(rawMonth) : NaN;

    if (!Number.isInteger(y) || y < 2000 || y > 2100) {
      errors.year = 'Year must be between 2000 and 2100.';
    } else {
      year = y;
    }

    if (!Number.isInteger(m) || m < 1 || m > 12) {
      errors.month = 'Month must be between 1 and 12.';
    } else {
      month = m;
    }
  } else {
    errors.goalMonth = 'Target month and year are required.';
  }

  // Validate targetCo2e strictly: reject non-numeric, NaN, Infinity, <= 0, > 1,000,000, > 3 decimals
  const rawTarget = input.targetCo2e;
  let parsedTarget = NaN;
  let normalizedTargetStr = '';

  if (typeof rawTarget === 'number') {
    if (Number.isFinite(rawTarget)) {
      parsedTarget = rawTarget;
      normalizedTargetStr = rawTarget.toFixed(3);
    }
  } else if (typeof rawTarget === 'string') {
    const trimmed = rawTarget.trim();
    if (/^[+-]?\d+(?:\.\d+)?$/.test(trimmed)) {
      const num = Number(trimmed);
      if (Number.isFinite(num)) {
        const decimals = trimmed.includes('.') ? trimmed.split('.')[1].length : 0;
        if (decimals > 3) {
          errors.targetCo2e = 'Target supports up to 3 decimal places.';
        } else {
          parsedTarget = num;
          normalizedTargetStr = num.toFixed(3);
        }
      }
    }
  }

  if (!errors.targetCo2e) {
    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      errors.targetCo2e = 'Enter a carbon target greater than 0 kg CO₂e.';
    } else if (parsedTarget > 1_000_000) {
      errors.targetCo2e = 'Monthly target must be 1,000,000 kg CO₂e or less.';
    }
  }

  if (Object.keys(errors).length > 0 || year === null || month === null) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    data: {
      year,
      month,
      goalMonth: `${year}-${pad2(month)}-01`,
      targetCo2e: normalizedTargetStr,
      targetCo2eKg: roundToDecimals(parsedTarget, 3),
    },
  };
}

export function computeGoalProgress(
  targetCo2eKg: number | null,
  actualEmissionsKg: number,
  activityCount = 0
): GoalProgressResult {
  const safeActual = roundToDecimals(Math.max(0, parseNumericValue(actualEmissionsKg)), 6);

  if (targetCo2eKg === null || !Number.isFinite(targetCo2eKg) || targetCo2eKg <= 0) {
    return {
      hasGoal: false,
      targetCo2eKg: null,
      actualEmissionsKg: safeActual,
      remainingKg: null,
      usagePercentage: null,
      status: 'NO_TARGET',
      statusLabel: 'No Target Set',
      contextMessage:
        activityCount === 0
          ? 'No monthly target set and zero recorded emissions for this month.'
          : 'No monthly target set. Based on your recorded activities.',
    };
  }

  const safeTarget = roundToDecimals(targetCo2eKg, 3);
  const usagePercentage = roundToDecimals((safeActual / safeTarget) * 100, 1);
  const remainingKg = roundToDecimals(safeTarget - safeActual, 3);

  let status: GoalStatusCode;
  let statusLabel: string;

  if (safeActual > safeTarget) {
    status = 'TARGET_EXCEEDED';
    statusLabel = 'Target Exceeded';
  } else if (Math.abs(safeActual - safeTarget) < 0.0005 || usagePercentage === 100) {
    status = 'AT_TARGET';
    statusLabel = 'At Target';
  } else if (usagePercentage >= 80) {
    status = 'APPROACHING_TARGET';
    statusLabel = 'Approaching Target';
  } else {
    status = 'WITHIN_TARGET';
    statusLabel = 'Within Target';
  }

  const contextMessage =
    activityCount === 0
      ? 'Zero activities recorded for this month so far. Based on your recorded activities.'
      : 'Based on your recorded activities.';

  return {
    hasGoal: true,
    targetCo2eKg: safeTarget,
    actualEmissionsKg: safeActual,
    remainingKg,
    usagePercentage,
    status,
    statusLabel,
    contextMessage,
  };
}
