import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { closeDatabasePool, isDatabaseConfigured, query, withTransaction } from './connection';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function resolveMigrationsDir(): string {
  const candidates = [
    path.resolve(__dirname, 'migrations'),
    path.resolve(__dirname, 'server/db/migrations'),
    path.resolve(process.cwd(), 'server/db/migrations'),
    path.resolve(process.cwd(), 'db/migrations'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return path.resolve(process.cwd(), 'server/db/migrations');
}

export async function runMigrations(): Promise<string[]> {
  if (!isDatabaseConfigured()) {
    throw new Error(
      'Cannot run migrations: DATABASE_URL is not set. Configure DATABASE_URL in .env before running db:migrate.'
    );
  }

  const migrationsDir = resolveMigrationsDir();
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(150) PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const appliedResult = await query<{ version: string }>(
    'SELECT version FROM schema_migrations ORDER BY version ASC'
  );
  const applied = new Set(appliedResult.rows.map((row) => row.version));
  const newlyApplied: string[] = [];

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

    await withTransaction(async (client) => {
      // Remove SQL comment lines so statements starting with comments are not skipped
      const withoutComments = sql
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n');

      const statements = withoutComments
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        try {
          await client.query(statement);
        } catch (stmtErr: any) {
          // If index or table already exists in partial previous run, continue idempotently
          if (
            stmtErr?.code === 'ER_DUP_KEYNAME' ||
            stmtErr?.code === 'ER_TABLE_EXISTS_ERROR' ||
            stmtErr?.message?.includes('Duplicate key name') ||
            stmtErr?.message?.includes('already exists')
          ) {
            continue;
          }
          throw stmtErr;
        }
      }

      await client.query(
        'INSERT INTO schema_migrations (version) VALUES (?)',
        [file]
      );
    });

    newlyApplied.push(file);
  }

  return newlyApplied;
}

const isMainModule =
  process.argv[1] !== undefined && /migrate\.(ts|js|mjs)$/.test(process.argv[1]);

if (isMainModule) {
  runMigrations()
    .then(async (applied) => {
      if (applied.length === 0) {
        console.log('Migrations up to date. No new SQL files applied.');
      } else {
        console.log(`Applied migrations: ${applied.join(', ')}`);
      }
      await closeDatabasePool();
    })
    .catch(async (error) => {
      console.error('Migration failed:', error instanceof Error ? error.message : error);
      await closeDatabasePool().catch(() => undefined);
      process.exit(1);
    });
}
