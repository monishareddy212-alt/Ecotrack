import mysql, { type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';
import { loadServerConfig } from '../config/env';

export class DatabaseNotConfiguredError extends Error {
  readonly code = 'DATABASE_NOT_CONFIGURED';

  constructor(
    message = 'DATABASE_URL is not configured. Add your MySQL connection string (e.g. mysql://user:pass@host:3306/db) to .env to enable database features.'
  ) {
    super(message);
    this.name = 'DatabaseNotConfiguredError';
  }
}

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  insertId?: number;
}

export interface DbClient {
  query<T = any>(text: string, params?: readonly unknown[]): Promise<QueryResult<T>>;
}

export type PoolClient = DbClient;

let poolInstance: Pool | null = null;
let lastPoolError: string | null = null;

export function isDatabaseConfigured(): boolean {
  return Boolean(loadServerConfig().databaseUrl);
}

export function getPool(): Pool {
  if (poolInstance) {
    return poolInstance;
  }

  const config = loadServerConfig();
  if (!config.databaseUrl) {
    throw new DatabaseNotConfiguredError();
  }

  let sslConfig: any = undefined;
  if (config.databaseSsl) {
    sslConfig =
      typeof config.databaseSsl === 'object'
        ? config.databaseSsl
        : { rejectUnauthorized: false };
  }

  poolInstance = mysql.createPool({
    uri: config.databaseUrl,
    ssl: sslConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+00:00',
    dateStrings: true,
    decimalNumbers: false,
    multipleStatements: true,
  });

  return poolInstance;
}

export function normalizeSql(sql: string): string {
  return sql
    // Remove PostgreSQL type casts
    .replace(/::(numeric|date|text|timestamptz|int|bigint)/gi, '')
    // Replace PostgreSQL ILIKE with LIKE
    .replace(/\bILIKE\b/gi, 'LIKE')
    // Remove table alias from FOR UPDATE OF al -> FOR UPDATE
    .replace(/\bFOR\s+UPDATE\s+OF\s+[a-zA-Z0-9_]+\b/gi, 'FOR UPDATE')
    // Replace $1, $2, ... placeholders with ?
    .replace(/\$\d+/g, '?');
}

export function formatQueryResult<T>(rawRows: any): QueryResult<T> {
  let rows: T[] = [];
  let rowCount = 0;
  let insertId: number | undefined;

  if (Array.isArray(rawRows)) {
    rows = rawRows as T[];
    rowCount = rawRows.length;
  } else if (rawRows && typeof rawRows === 'object') {
    const header = rawRows as ResultSetHeader;
    rowCount = header.affectedRows ?? 0;
    if (typeof header.insertId === 'number' && header.insertId > 0) {
      insertId = header.insertId;
      rows = [{ id: header.insertId } as unknown as T];
    }
  }

  return { rows, rowCount, insertId };
}

export async function query<T = any>(
  text: string,
  params: readonly unknown[] = []
): Promise<QueryResult<T>> {
  const pool = getPool();
  const normalizedSql = normalizeSql(text);
  const [result] = await pool.query(normalizedSql, params as any[]);
  return formatQueryResult<T>(result);
}

export async function withTransaction<T>(
  callback: (client: DbClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const connection: PoolConnection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const client: DbClient = {
      async query<R = any>(text: string, params: readonly unknown[] = []): Promise<QueryResult<R>> {
        const normalizedSql = normalizeSql(text);
        const [result] = await connection.query(normalizedSql, params as any[]);
        return formatQueryResult<R>(result);
      },
    };

    const result = await callback(client);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    connection.release();
  }
}

export interface DatabaseHealthStatus {
  configured: boolean;
  connected: boolean;
  status: 'connected' | 'unconfigured' | 'error';
  message: string;
}

export async function testDatabaseConnection(): Promise<DatabaseHealthStatus> {
  if (!isDatabaseConfigured()) {
    return {
      configured: false,
      connected: false,
      status: 'unconfigured',
      message: 'DATABASE_URL is not set.',
    };
  }

  try {
    const pool = getPool();
    await pool.query('SELECT 1 AS ok');
    lastPoolError = null;
    return {
      configured: true,
      connected: true,
      status: 'connected',
      message: 'MySQL connection healthy.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    return {
      configured: true,
      connected: false,
      status: 'error',
      message: lastPoolError ? `${message} (${lastPoolError})` : message,
    };
  }
}

export async function closeDatabasePool(): Promise<void> {
  if (poolInstance) {
    const current = poolInstance;
    poolInstance = null;
    await current.end();
  }
}
