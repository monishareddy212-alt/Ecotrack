import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { closeDatabasePool } from '../connection';
import { seedActivityTypes } from './seedActivityTypes';
import { seedEmissionFactors } from './seedEmissionFactors';

const __filename = fileURLToPath(import.meta.url);

export async function runAllSeeds(): Promise<{
  activityTypesInserted: number;
  emissionFactorsUpserted: number;
}> {
  const activityTypesInserted = await seedActivityTypes();
  const emissionFactorsUpserted = await seedEmissionFactors();
  return { activityTypesInserted, emissionFactorsUpserted };
}

const isMainModule =
  process.argv[1] !== undefined && /seedAll\.(ts|js|mjs)$/.test(process.argv[1]);

if (isMainModule) {
  runAllSeeds()
    .then(async (summary) => {
      console.log(
        `Seed complete: ${summary.activityTypesInserted} new activity_types, ${summary.emissionFactorsUpserted} verified emission_factors.`
      );
      await closeDatabasePool();
    })
    .catch(async (error) => {
      console.error('Database seeding failed:', error instanceof Error ? error.message : error);
      await closeDatabasePool().catch(() => undefined);
      process.exit(1);
    });
}
