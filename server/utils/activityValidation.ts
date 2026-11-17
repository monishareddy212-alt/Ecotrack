import { parsePositiveDecimalString } from './carbonCalculator';
import type { ValidationResult } from './validation';

export type ActivitySortKey =
  | 'date_desc'
  | 'date_asc'
  | 'emissions_desc'
  | 'emissions_asc';

export interface ValidatedActivityInput {
  activityTypeId: string;
  quantity: string;
  unit?: string;
  activityDate: string;
}

export interface ValidatedActivityListQuery {
  category?: 'Transportation' | 'Energy' | 'Lifestyle';
  activityTypeId?: string;
  startDate?: string;
  endDate?: string;
  minEmissions?: number;
  maxEmissions?: number;
  search?: string;
  sort: ActivitySortKey;
  page: number;
  limit: number;
}

const VALID_CATEGORIES = new Set(['Transportation', 'Energy', 'Lifestyle']);
const VALID_SORT_KEYS = new Set<ActivitySortKey>([
  'date_desc',
  'date_asc',
  'emissions_desc',
  'emissions_asc',
]);

function parseOptionalNonNegativeFilterNumber(raw: unknown): {
  present: boolean;
  valid: boolean;
  value?: number;
} {
  if (raw === undefined || raw === null) {
    return { present: false, valid: true };
  }
  const str = String(raw).trim();
  if (!str) {
    return { present: false, valid: true };
  }
  if (!/^\d+(?:\.\d{1,6})?$/.test(str)) {
    return { present: true, valid: false };
  }
  const num = Number(str);
  if (!Number.isFinite(num) || num < 0 || num > 100_000_000) {
    return { present: true, valid: false };
  }
  return { present: true, valid: true, value: num };
}

export function isValidIsoCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [yearStr, monthStr, dayStr] = value.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function isPositiveIntegerId(value: unknown): value is string {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0;
  }
  if (typeof value === 'string') {
    return /^[1-9]\d{0,17}$/.test(value.trim());
  }
  return false;
}

export function validateActivityPayload(
  body: unknown
): ValidationResult<ValidatedActivityInput> {
  const errors: Record<string, string> = {};
  const input = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;

  const rawTypeId =
    typeof input.activityTypeId === 'number'
      ? String(input.activityTypeId)
      : typeof input.activityTypeId === 'string'
        ? input.activityTypeId.trim()
        : '';

  if (!isPositiveIntegerId(rawTypeId)) {
    errors.activityTypeId = 'Please select a valid activity type.';
  }

  const parsedQty = parsePositiveDecimalString(input.quantity, 3);
  if (!parsedQty) {
    errors.quantity = 'Enter a valid quantity greater than 0 (up to 3 decimal places).';
  } else if (Number(parsedQty) > 1_000_000) {
    errors.quantity = 'Quantity must be 1,000,000 or less.';
  }

  const rawDate = typeof input.activityDate === 'string' ? input.activityDate.trim() : '';
  if (!isValidIsoCalendarDate(rawDate)) {
    errors.activityDate = 'Enter a valid calendar date (YYYY-MM-DD).';
  }

  const rawUnit = typeof input.unit === 'string' ? input.unit.trim() : undefined;
  if (rawUnit !== undefined && rawUnit.length === 0) {
    errors.unit = 'Measurement unit cannot be empty.';
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    data: {
      activityTypeId: rawTypeId,
      quantity: parsedQty!,
      unit: rawUnit,
      activityDate: rawDate,
    },
  };
}

export function validateActivityListQuery(
  query: Record<string, unknown>
): ValidationResult<ValidatedActivityListQuery> {
  const errors: Record<string, string> = {};

  let category: ValidatedActivityListQuery['category'];
  if (typeof query.category === 'string' && query.category.trim() && query.category !== 'All') {
    const trimmed = query.category.trim();
    if (!VALID_CATEGORIES.has(trimmed)) {
      errors.category = 'Invalid activity category filter.';
    } else {
      category = trimmed as ValidatedActivityListQuery['category'];
    }
  }

  let activityTypeId: string | undefined;
  if (typeof query.activityTypeId === 'string' && query.activityTypeId.trim()) {
    const trimmed = query.activityTypeId.trim();
    if (!isPositiveIntegerId(trimmed)) {
      errors.activityTypeId = 'Invalid activity type filter.';
    } else {
      activityTypeId = trimmed;
    }
  }

  let startDate: string | undefined;
  if (typeof query.startDate === 'string' && query.startDate.trim()) {
    const trimmed = query.startDate.trim();
    if (!isValidIsoCalendarDate(trimmed)) {
      errors.startDate = 'Invalid start date (expected YYYY-MM-DD).';
    } else {
      startDate = trimmed;
    }
  }

  let endDate: string | undefined;
  if (typeof query.endDate === 'string' && query.endDate.trim()) {
    const trimmed = query.endDate.trim();
    if (!isValidIsoCalendarDate(trimmed)) {
      errors.endDate = 'Invalid end date (expected YYYY-MM-DD).';
    } else {
      endDate = trimmed;
    }
  }

  if (startDate && endDate && startDate > endDate) {
    errors.endDate = 'End date must be on or after start date.';
  }

  let minEmissions: number | undefined;
  const parsedMin = parseOptionalNonNegativeFilterNumber(query.minEmissions);
  if (parsedMin.present) {
    if (!parsedMin.valid) {
      errors.minEmissions = 'Minimum emissions must be a non-negative number (up to 6 decimal places).';
    } else {
      minEmissions = parsedMin.value;
    }
  }

  let maxEmissions: number | undefined;
  const parsedMax = parseOptionalNonNegativeFilterNumber(query.maxEmissions);
  if (parsedMax.present) {
    if (!parsedMax.valid) {
      errors.maxEmissions = 'Maximum emissions must be a non-negative number (up to 6 decimal places).';
    } else {
      maxEmissions = parsedMax.value;
    }
  }

  if (
    minEmissions !== undefined &&
    maxEmissions !== undefined &&
    minEmissions > maxEmissions
  ) {
    errors.maxEmissions = 'Maximum emissions must be greater than or equal to minimum emissions.';
  }

  let sort: ActivitySortKey = 'date_desc';
  if (typeof query.sort === 'string' && query.sort.trim()) {
    const candidate = query.sort.trim() as ActivitySortKey;
    if (!VALID_SORT_KEYS.has(candidate)) {
      errors.sort = 'Unsupported sort option.';
    } else {
      sort = candidate;
    }
  }

  let page = 1;
  if (query.page !== undefined && String(query.page).trim() !== '') {
    const parsed = Number(query.page);
    if (!Number.isInteger(parsed) || parsed < 1) {
      errors.page = 'Page must be a positive integer.';
    } else {
      page = parsed;
    }
  }

  let limit = 10;
  if (query.limit !== undefined && String(query.limit).trim() !== '') {
    const parsed = Number(query.limit);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
      errors.limit = 'Limit must be an integer between 1 and 100.';
    } else {
      limit = parsed;
    }
  }

  const search =
    typeof query.search === 'string' && query.search.trim()
      ? query.search.trim().slice(0, 120)
      : undefined;

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    data: {
      category,
      activityTypeId,
      startDate,
      endDate,
      minEmissions,
      maxEmissions,
      search,
      sort,
      page,
      limit,
    },
  };
}
