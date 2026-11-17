import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { closeDatabasePool, isDatabaseConfigured, withTransaction } from '../connection';

const __filename = fileURLToPath(import.meta.url);

export interface SeedActivityType {
  category: 'Transportation' | 'Energy' | 'Lifestyle';
  name: string;
  unit: string;
}

export const INITIAL_ACTIVITY_TYPES: readonly SeedActivityType[] = [
  { category: 'Transportation', name: 'Car Travel', unit: 'km' },
  { category: 'Transportation', name: 'Motorcycle Travel', unit: 'km' },
  { category: 'Transportation', name: 'Bus Travel', unit: 'km' },
  { category: 'Transportation', name: 'Metro Travel', unit: 'km' },
  { category: 'Energy', name: 'Electricity Consumption', unit: 'kWh' },
  { category: 'Energy', name: 'LPG Cooking Gas', unit: 'kg' },
  { category: 'Lifestyle', name: 'Plant-Based Meal', unit: 'meals' },
  { category: 'Lifestyle', name: 'Meat-Based Meal', unit: 'meals' },
];

export async function seedActivityTypes(): Promise<number> {
  if (!isDatabaseConfigured()) {
    throw new Error(
      'Cannot seed activity types: DATABASE_URL is not set. Configure DATABASE_URL in .env before running db:seed.'
    );
  }

  return withTransaction(async (client) => {
    let insertedCount = 0;

    for (const item of INITIAL_ACTIVITY_TYPES) {
      const result = await client.query(
        `
          INSERT INTO activity_types (category, name, unit, is_active)
          VALUES (?, ?, ?, TRUE)
          ON DUPLICATE KEY UPDATE is_active = VALUES(is_active)
        `,
        [item.category, item.name, item.unit]
      );
      // In MySQL, affectedRows is 1 for insert, 2 for update, 0 for no change
      if (result.rowCount === 1) {
        insertedCount++;
      }
    }

    return insertedCount;
  });
}

const isMainModule =
  process.argv[1] !== undefined && /seedActivityTypes\.(ts|js|mjs)$/.test(process.argv[1]);

if (isMainModule) {
  seedActivityTypes()
    .then(async (inserted) => {
      console.log(`Seed complete. Inserted ${inserted} new activity_types rows (idempotent).`);
      await closeDatabasePool();
    })
    .catch(async (error) => {
      console.error('Seed failed:', error instanceof Error ? error.message : error);
      await closeDatabasePool().catch(() => undefined);
      process.exit(1);
    });
}
