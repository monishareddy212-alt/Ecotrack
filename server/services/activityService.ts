import { query, withTransaction, type PoolClient } from '../db/connection';
import type {
  ActivitySortKey,
  ValidatedActivityInput,
  ValidatedActivityListQuery,
} from '../utils/activityValidation';
import { calculateCarbonEmissions } from '../utils/carbonCalculator';
import type { CsvExportRow } from '../utils/csvExport';

export interface ActivityTypeDTO {
  id: string;
  category: 'Transportation' | 'Energy' | 'Lifestyle';
  name: string;
  unit: string;
  isActive: boolean;
  hasEmissionFactor: boolean;
  latestFactorSource: string | null;
}

export interface EmissionFactorDTO {
  id: string;
  activityTypeId: string;
  factorKgCo2ePerUnit: string;
  unit: string;
  source: string;
  sourceUrl: string | null;
  referenceYear: number | null;
  effectiveDate: string;
  geographicScope: string | null;
  notes: string | null;
}

export interface ActivityDTO {
  id: string;
  userId: string;
  activityTypeId: string;
  emissionFactorId: string;
  category: 'Transportation' | 'Energy' | 'Lifestyle';
  activityTypeName: string;
  quantity: number;
  quantityRaw: string;
  unit: string;
  calculatedCo2e: number;
  calculatedCo2eRaw: string;
  activityDate: string;
  createdAt: string;
  emissionFactor: EmissionFactorDTO;
}

export interface ActivityListResult {
  items: ActivityDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ActivitySummaryDTO {
  totalActivities: number;
  totalEmissionsKg: number;
  distinctActivityTypesCount: number;
  categoryTotals: Array<{
    category: 'Transportation' | 'Energy' | 'Lifestyle';
    totalEmissionsKg: number;
    activityCount: number;
  }>;
  mostRecentActivity: ActivityDTO | null;
}

export class ActivityTypeNotFoundError extends Error {
  readonly code = 'ACTIVITY_TYPE_INVALID';
  constructor(message = 'Selected activity type does not exist or is inactive.') {
    super(message);
    this.name = 'ActivityTypeNotFoundError';
  }
}

export class UnsupportedUnitError extends Error {
  readonly code = 'UNSUPPORTED_UNIT';
  constructor(message = 'Measurement unit does not match the selected activity type.') {
    super(message);
    this.name = 'UnsupportedUnitError';
  }
}

export class EmissionFactorUnavailableError extends Error {
  readonly code = 'EMISSION_FACTOR_UNAVAILABLE';
  constructor(message = 'Emission factor unavailable for this activity.') {
    super(message);
    this.name = 'EmissionFactorUnavailableError';
  }
}

export class ActivityNotFoundError extends Error {
  readonly code = 'ACTIVITY_NOT_FOUND';
  constructor(message = 'Activity record not found.') {
    super(message);
    this.name = 'ActivityNotFoundError';
  }
}

export class ExportLimitExceededError extends Error {
  readonly code = 'EXPORT_LIMIT_EXCEEDED';
  constructor(
    message = 'Matching activities exceed the 5,000-row CSV export limit. Narrow your date range or filters and try again.'
  ) {
    super(message);
    this.name = 'ExportLimitExceededError';
  }
}

export type ActivityFilterCriteria = Pick<
  ValidatedActivityListQuery,
  'category' | 'activityTypeId' | 'startDate' | 'endDate' | 'minEmissions' | 'maxEmissions' | 'search'
>;

export function buildActivityFilterWhereClause(
  userId: string,
  filters: ActivityFilterCriteria
): { whereSql: string; params: unknown[] } {
  const conditions: string[] = ['al.user_id = ?'];
  const params: unknown[] = [userId];

  if (filters.category) {
    params.push(filters.category);
    conditions.push('at.category = ?');
  }

  if (filters.activityTypeId) {
    params.push(filters.activityTypeId);
    conditions.push('at.id = ?');
  }

  if (filters.startDate) {
    params.push(filters.startDate);
    conditions.push('al.activity_date >= ?');
  }

  if (filters.endDate) {
    params.push(filters.endDate);
    conditions.push('al.activity_date <= ?');
  }

  if (filters.minEmissions !== undefined) {
    params.push(filters.minEmissions);
    conditions.push('al.calculated_co2e >= ?');
  }

  if (filters.maxEmissions !== undefined) {
    params.push(filters.maxEmissions);
    conditions.push('al.calculated_co2e <= ?');
  }

  if (filters.search) {
    params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    conditions.push(
      '(at.name LIKE ? OR at.category LIKE ? OR ef.source LIKE ?)'
    );
  }

  return {
    whereSql: conditions.join(' AND '),
    params,
  };
}

interface JoinedActivityRow {
  id: string | number;
  user_id: string | number;
  activity_type_id: string | number;
  emission_factor_id: string | number;
  category: 'Transportation' | 'Energy' | 'Lifestyle';
  activity_type_name: string;
  quantity: string | number;
  unit: string;
  calculated_co2e: string | number;
  activity_date: Date | string;
  created_at: Date | string;
  factor_kg_co2e_per_unit: string | number;
  factor_unit: string | null;
  source: string;
  source_url: string | null;
  reference_year: number | null;
  effective_date: Date | string;
  geographic_scope: string | null;
  notes: string | null;
}

function formatDateOnly(val: Date | string): string {
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10);
  }
  return String(val).slice(0, 10);
}

function mapJoinedRowToActivityDTO(row: JoinedActivityRow): ActivityDTO {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    activityTypeId: String(row.activity_type_id),
    emissionFactorId: String(row.emission_factor_id),
    category: row.category,
    activityTypeName: row.activity_type_name,
    quantity: Number(row.quantity),
    quantityRaw: String(row.quantity),
    unit: row.unit,
    calculatedCo2e: Number(row.calculated_co2e),
    calculatedCo2eRaw: String(row.calculated_co2e),
    activityDate: formatDateOnly(row.activity_date),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    emissionFactor: {
      id: String(row.emission_factor_id),
      activityTypeId: String(row.activity_type_id),
      factorKgCo2ePerUnit: String(row.factor_kg_co2e_per_unit),
      unit: row.factor_unit || row.unit,
      source: row.source,
      sourceUrl: row.source_url,
      referenceYear: row.reference_year,
      effectiveDate: formatDateOnly(row.effective_date),
      geographicScope: row.geographic_scope,
      notes: row.notes,
    },
  };
}

const JOINED_SELECT_CLAUSE = `
  SELECT
    al.id,
    al.user_id,
    ef.activity_type_id,
    al.emission_factor_id,
    at.category,
    at.name AS activity_type_name,
    CAST(al.quantity AS CHAR) AS quantity,
    at.unit,
    CAST(al.calculated_co2e AS CHAR) AS calculated_co2e,
    CAST(al.activity_date AS CHAR) AS activity_date,
    al.created_at,
    CAST(ef.factor_kg_co2e_per_unit AS CHAR) AS factor_kg_co2e_per_unit,
    ef.unit AS factor_unit,
    ef.source,
    ef.source_url,
    ef.reference_year,
    CAST(ef.effective_date AS CHAR) AS effective_date,
    ef.geographic_scope,
    ef.notes
  FROM activity_logs al
  INNER JOIN emission_factors ef ON ef.id = al.emission_factor_id
  INNER JOIN activity_types at ON at.id = ef.activity_type_id
`;

const SORT_ORDER_SQL: Record<ActivitySortKey, string> = {
  date_desc: 'al.activity_date DESC, al.id DESC',
  date_asc: 'al.activity_date ASC, al.id ASC',
  emissions_desc: 'al.calculated_co2e DESC, al.activity_date DESC, al.id DESC',
  emissions_asc: 'al.calculated_co2e ASC, al.activity_date DESC, al.id DESC',
};

export async function listActiveActivityTypes(): Promise<ActivityTypeDTO[]> {
  const result = await query<{
    id: string | number;
    category: 'Transportation' | 'Energy' | 'Lifestyle';
    name: string;
    unit: string;
    is_active: boolean | number;
    has_factor: boolean | number;
    latest_source: string | null;
  }>(
    `
      SELECT
        at.id,
        at.category,
        at.name,
        at.unit,
        at.is_active,
        EXISTS (
          SELECT 1
          FROM emission_factors ef
          WHERE ef.activity_type_id = at.id
            AND LENGTH(TRIM(ef.source)) > 0
            AND COALESCE(ef.unit, at.unit) = at.unit
        ) AS has_factor,
        (
          SELECT ef.source
          FROM emission_factors ef
          WHERE ef.activity_type_id = at.id
            AND LENGTH(TRIM(ef.source)) > 0
            AND COALESCE(ef.unit, at.unit) = at.unit
          ORDER BY ef.effective_date DESC, ef.id DESC
          LIMIT 1
        ) AS latest_source
      FROM activity_types at
      WHERE at.is_active = TRUE
      ORDER BY
        CASE at.category
          WHEN 'Transportation' THEN 1
          WHEN 'Energy' THEN 2
          WHEN 'Lifestyle' THEN 3
          ELSE 4
        END,
        at.id ASC
    `
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    category: row.category,
    name: row.name,
    unit: row.unit,
    isActive: Boolean(row.is_active),
    hasEmissionFactor: Boolean(row.has_factor),
    latestFactorSource: row.latest_source,
  }));
}

async function resolveActiveActivityType(
  client: PoolClient,
  activityTypeId: string,
  providedUnit?: string
): Promise<{ id: string; unit: string }> {
  const typeResult = await client.query<{ id: string | number; unit: string }>(
    `
      SELECT id, unit
      FROM activity_types
      WHERE id = ? AND is_active = TRUE
      LIMIT 1
    `,
    [activityTypeId]
  );

  const activityType = typeResult.rows[0];
  if (!activityType) {
    throw new ActivityTypeNotFoundError();
  }

  if (providedUnit !== undefined && providedUnit !== activityType.unit) {
    throw new UnsupportedUnitError(
      `Unsupported unit "${providedUnit}" for this activity. Expected "${activityType.unit}".`
    );
  }

  return { id: String(activityType.id), unit: activityType.unit };
}

async function findApplicableEmissionFactor(
  client: PoolClient,
  activityTypeId: string,
  unit: string,
  activityDate: string
): Promise<{ id: string; factorValue: string }> {
  const factorResult = await client.query<{ id: string | number; factor_value: string }>(
    `
      SELECT
        ef.id,
        CAST(ef.factor_kg_co2e_per_unit AS CHAR) AS factor_value
      FROM emission_factors ef
      INNER JOIN activity_types at ON at.id = ef.activity_type_id
      WHERE ef.activity_type_id = ?
        AND at.is_active = TRUE
        AND ef.effective_date <= ?
        AND LENGTH(TRIM(ef.source)) > 0
        AND COALESCE(ef.unit, at.unit) = ?
      ORDER BY ef.effective_date DESC, ef.id DESC
      LIMIT 1
    `,
    [activityTypeId, activityDate, unit]
  );

  const factor = factorResult.rows[0];
  if (!factor) {
    throw new EmissionFactorUnavailableError();
  }

  return {
    id: String(factor.id),
    factorValue: factor.factor_value,
  };
}

export async function createActivity(
  userId: string,
  input: ValidatedActivityInput
): Promise<ActivityDTO> {
  return withTransaction(async (client) => {
    const activityType = await resolveActiveActivityType(
      client,
      input.activityTypeId,
      input.unit
    );

    const factor = await findApplicableEmissionFactor(
      client,
      activityType.id,
      activityType.unit,
      input.activityDate
    );

    const calculatedCo2e = calculateCarbonEmissions(input.quantity, factor.factorValue, 6);

    const insertResult = await client.query(
      `
        INSERT INTO activity_logs (
          user_id,
          emission_factor_id,
          quantity,
          calculated_co2e,
          activity_date
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      [userId, factor.id, input.quantity, calculatedCo2e, input.activityDate]
    );

    const insertedId = insertResult.insertId;
    const joined = await client.query<JoinedActivityRow>(
      `${JOINED_SELECT_CLAUSE} WHERE al.id = ? AND al.user_id = ? LIMIT 1`,
      [insertedId, userId]
    );

    return mapJoinedRowToActivityDTO(joined.rows[0]);
  });
}

export async function listUserActivities(
  userId: string,
  filters: ValidatedActivityListQuery
): Promise<ActivityListResult> {
  const { whereSql, params } = buildActivityFilterWhereClause(userId, filters);

  const countResult = await query<{ total: string | number }>(
    `
      SELECT CAST(COUNT(*) AS CHAR) AS total
      FROM activity_logs al
      INNER JOIN emission_factors ef ON ef.id = al.emission_factor_id
      INNER JOIN activity_types at ON at.id = ef.activity_type_id
      WHERE ${whereSql}
    `,
    params
  );

  const total = Number(countResult.rows[0]?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));
  const offset = (filters.page - 1) * filters.limit;

  const orderBySql = SORT_ORDER_SQL[filters.sort];
  const itemParams = [...params, filters.limit, offset];

  const rowsResult = await query<JoinedActivityRow>(
    `
      ${JOINED_SELECT_CLAUSE}
      WHERE ${whereSql}
      ORDER BY ${orderBySql}
      LIMIT ? OFFSET ?
    `,
    itemParams
  );

  return {
    items: rowsResult.rows.map(mapJoinedRowToActivityDTO),
    total,
    page: filters.page,
    limit: filters.limit,
    totalPages,
  };
}

export async function getUserActivityById(
  userId: string,
  activityId: string
): Promise<ActivityDTO> {
  const result = await query<JoinedActivityRow>(
    `${JOINED_SELECT_CLAUSE} WHERE al.id = ? AND al.user_id = ? LIMIT 1`,
    [activityId, userId]
  );

  const row = result.rows[0];
  if (!row) {
    throw new ActivityNotFoundError();
  }

  return mapJoinedRowToActivityDTO(row);
}

export async function updateUserActivity(
  userId: string,
  activityId: string,
  input: ValidatedActivityInput
): Promise<ActivityDTO> {
  return withTransaction(async (client) => {
    const existingResult = await client.query<{
      id: string | number;
      emission_factor_id: string | number;
      activity_type_id: string | number;
      activity_date: string;
      factor_value: string;
    }>(
      `
        SELECT
          al.id,
          al.emission_factor_id,
          ef.activity_type_id,
          CAST(al.activity_date AS CHAR) AS activity_date,
          CAST(ef.factor_kg_co2e_per_unit AS CHAR) AS factor_value
        FROM activity_logs al
        INNER JOIN emission_factors ef ON ef.id = al.emission_factor_id
        WHERE al.id = ? AND al.user_id = ?
        FOR UPDATE
      `,
      [activityId, userId]
    );

    const existing = existingResult.rows[0];
    if (!existing) {
      throw new ActivityNotFoundError();
    }

    const activityType = await resolveActiveActivityType(
      client,
      input.activityTypeId,
      input.unit
    );

    const existingDate = formatDateOnly(existing.activity_date);
    const onlyQuantityChanged =
      String(existing.activity_type_id) === activityType.id &&
      existingDate === input.activityDate;

    let factorId = String(existing.emission_factor_id);
    let factorValue = existing.factor_value;

    if (!onlyQuantityChanged) {
      const nextFactor = await findApplicableEmissionFactor(
        client,
        activityType.id,
        activityType.unit,
        input.activityDate
      );
      factorId = nextFactor.id;
      factorValue = nextFactor.factorValue;
    }

    const recalculatedCo2e = calculateCarbonEmissions(input.quantity, factorValue, 6);

    await client.query(
      `
        UPDATE activity_logs
        SET
          emission_factor_id = ?,
          quantity = ?,
          calculated_co2e = ?,
          activity_date = ?
        WHERE id = ? AND user_id = ?
      `,
      [factorId, input.quantity, recalculatedCo2e, input.activityDate, activityId, userId]
    );

    const joined = await client.query<JoinedActivityRow>(
      `${JOINED_SELECT_CLAUSE} WHERE al.id = ? AND al.user_id = ? LIMIT 1`,
      [activityId, userId]
    );

    return mapJoinedRowToActivityDTO(joined.rows[0]);
  });
}

export async function deleteUserActivity(
  userId: string,
  activityId: string
): Promise<void> {
  const result = await query(
    `
      DELETE FROM activity_logs
      WHERE id = ? AND user_id = ?
    `,
    [activityId, userId]
  );

  if ((result.rowCount ?? 0) === 0) {
    throw new ActivityNotFoundError();
  }
}

export async function getUserActivitySummary(
  userId: string,
  filters: ActivityFilterCriteria = {}
): Promise<ActivitySummaryDTO> {
  const { whereSql, params } = buildActivityFilterWhereClause(userId, filters);

  const totalsResult = await query<{
    total_activities: string | number;
    total_emissions: string | number;
    distinct_types: string | number;
  }>(
    `
      SELECT
        CAST(COUNT(*) AS CHAR) AS total_activities,
        CAST(COALESCE(SUM(al.calculated_co2e), 0) AS CHAR) AS total_emissions,
        CAST(COUNT(DISTINCT ef.activity_type_id) AS CHAR) AS distinct_types
      FROM activity_logs al
      INNER JOIN emission_factors ef ON ef.id = al.emission_factor_id
      INNER JOIN activity_types at ON at.id = ef.activity_type_id
      WHERE ${whereSql}
    `,
    params
  );

  const categoryResult = await query<{
    category: 'Transportation' | 'Energy' | 'Lifestyle';
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
      WHERE ${whereSql}
      GROUP BY at.category
      ORDER BY SUM(al.calculated_co2e) DESC
    `,
    params
  );

  const recentResult = await query<JoinedActivityRow>(
    `
      ${JOINED_SELECT_CLAUSE}
      WHERE ${whereSql}
      ORDER BY al.activity_date DESC, al.id DESC
      LIMIT 1
    `,
    params
  );

  const totalsRow = totalsResult.rows[0];

  return {
    totalActivities: Number(totalsRow?.total_activities ?? 0),
    totalEmissionsKg: Number(totalsRow?.total_emissions ?? 0),
    distinctActivityTypesCount: Number(totalsRow?.distinct_types ?? 0),
    categoryTotals: categoryResult.rows.map((row) => ({
      category: row.category,
      totalEmissionsKg: Number(row.total_emissions),
      activityCount: Number(row.activity_count),
    })),
    mostRecentActivity: recentResult.rows[0]
      ? mapJoinedRowToActivityDTO(recentResult.rows[0])
      : null,
  };
}

export async function listActivitiesForExport(
  userId: string,
  filters: ValidatedActivityListQuery,
  maxRows = 5000
): Promise<CsvExportRow[]> {
  const safeMax = Math.min(Math.max(Math.trunc(maxRows), 1), 10_000);
  const { whereSql, params } = buildActivityFilterWhereClause(userId, filters);
  const orderBySql = SORT_ORDER_SQL[filters.sort];
  const exportParams = [...params, safeMax + 1];

  const result = await query<{
    activity_date: Date | string;
    category: string;
    activity_type_name: string;
    quantity: string | number;
    unit: string;
    factor_kg_co2e_per_unit: string | number;
    calculated_co2e: string | number;
    source: string;
  }>(
    `
      SELECT
        CAST(al.activity_date AS CHAR) AS activity_date,
        at.category,
        at.name AS activity_type_name,
        CAST(al.quantity AS CHAR) AS quantity,
        at.unit,
        CAST(ef.factor_kg_co2e_per_unit AS CHAR) AS factor_kg_co2e_per_unit,
        CAST(al.calculated_co2e AS CHAR) AS calculated_co2e,
        ef.source
      FROM activity_logs al
      INNER JOIN emission_factors ef ON ef.id = al.emission_factor_id
      INNER JOIN activity_types at ON at.id = ef.activity_type_id
      WHERE ${whereSql}
      ORDER BY ${orderBySql}
      LIMIT ?
    `,
    exportParams
  );

  if (result.rows.length > safeMax) {
    throw new ExportLimitExceededError(
      `Matching activities exceed the ${safeMax.toLocaleString()}-row CSV export limit. Narrow your date range or filters and try again.`
    );
  }

  return result.rows.map((row) => ({
    activityDate: formatDateOnly(row.activity_date),
    category: row.category,
    activityTypeName: row.activity_type_name,
    quantityRaw: String(row.quantity),
    unit: row.unit,
    factorKgCo2ePerUnit: String(row.factor_kg_co2e_per_unit),
    calculatedCo2eRaw: String(row.calculated_co2e),
    source: row.source,
  }));
}

export async function listRecentUserActivities(
  userId: string,
  limit = 5
): Promise<ActivityDTO[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 20);
  const result = await query<JoinedActivityRow>(
    `
      ${JOINED_SELECT_CLAUSE}
      WHERE al.user_id = ?
      ORDER BY al.activity_date DESC, al.created_at DESC, al.id DESC
      LIMIT ?
    `,
    [userId, safeLimit]
  );

  return result.rows.map(mapJoinedRowToActivityDTO);
}
