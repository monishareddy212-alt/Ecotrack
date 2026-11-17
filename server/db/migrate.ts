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
      // Split statements by semicolon (ignoring comments) to run individual commands cleanly
      const statements = sql
        .split(/;\s*[\r\n]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.length > 0) {
          await client.query(statement);
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
