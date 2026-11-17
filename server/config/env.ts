import crypto from 'crypto';
import type { ConnectionOptions } from 'tls';

export interface ServerConfig {
  port: number;
  nodeEnv: string;
  isProduction: boolean;
  databaseUrl: string | null;
  databaseSsl: boolean | ConnectionOptions;
  sessionSecret: string;
  hasExplicitSessionSecret: boolean;
}

const EPHEMERAL_DEV_SESSION_SECRET = crypto.randomBytes(32).toString('hex');

export function resolveDbSslConfig(
  databaseUrl: string | null,
  databaseSslEnv?: string
): boolean | ConnectionOptions {
  if (!databaseUrl) {
    return false;
  }

  const normalizedOverride = databaseSslEnv?.trim().toLowerCase();
  if (normalizedOverride === 'false' || normalizedOverride === 'disable') {
    return false;
  }
  if (normalizedOverride === 'no-verify') {
    return { rejectUnauthorized: false };
  }
  if (normalizedOverride === 'true' || normalizedOverride === 'require') {
    return { rejectUnauthorized: true };
  }

  try {
    const parsed = new URL(databaseUrl.replace(/^mysql2?:/i, 'http:'));
    const sslParam = parsed.searchParams.get('ssl')?.toLowerCase();
    const sslMode = parsed.searchParams.get('sslmode')?.toLowerCase();
    const host = parsed.hostname.toLowerCase();

    if (sslParam === 'false' || sslMode === 'disable') {
      return false;
    }

    if (sslParam === 'no-verify' || sslMode === 'no-verify') {
      return { rejectUnauthorized: false };
    }

    if (
      host.includes('aivencloud.com') ||
      host.includes('psdb.cloud') ||
      host.includes('neon.tech') ||
      sslMode === 'require' ||
      sslMode === 'verify-ca' ||
      sslMode === 'verify-full'
    ) {
      return { rejectUnauthorized: true };
    }

    if (host.includes('render.com') || host.startsWith('dpg-') || host.includes('railway')) {
      return { rejectUnauthorized: false };
    }

    if (host === 'localhost' || host === '127.0.0.1' || host === 'mysql' || host === 'postgres') {
      return false;
    }
  } catch {
    // Fallback to SSL in production for remote connections
  }

  return process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false;
}

export const resolvePgSslConfig = resolveDbSslConfig;

export function loadServerConfig(): ServerConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  const port = Number(process.env.PORT) || 3000;
  const rawDatabaseUrl = process.env.DATABASE_URL?.trim() || '';
  const databaseUrl = rawDatabaseUrl.length > 0 ? rawDatabaseUrl : null;
  const rawSessionSecret = process.env.SESSION_SECRET?.trim() || '';

  if (isProduction && rawSessionSecret.length < 32) {
    throw new Error(
      'SESSION_SECRET must be configured with at least 32 characters in production.'
    );
  }

  const hasExplicitSessionSecret = rawSessionSecret.length >= 16;
  const sessionSecret = hasExplicitSessionSecret
    ? rawSessionSecret
    : EPHEMERAL_DEV_SESSION_SECRET;

  return {
    port,
    nodeEnv,
    isProduction,
    databaseUrl,
    databaseSsl: resolveDbSslConfig(databaseUrl, process.env.DATABASE_SSL),
    sessionSecret,
    hasExplicitSessionSecret,
  };
}
