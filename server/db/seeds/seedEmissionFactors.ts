import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { closeDatabasePool, isDatabaseConfigured, withTransaction } from '../connection';
import { seedActivityTypes } from './seedActivityTypes';

const __filename = fileURLToPath(import.meta.url);

export interface SeedEmissionFactor {
  category: 'Transportation' | 'Energy' | 'Lifestyle';
  activityName: string;
  unit: string;
  factorKgCo2ePerUnit: string;
  source: string;
  sourceUrl: string;
  referenceYear: number;
  effectiveDate: string;
  geographicScope: string;
  notes: string;
}

/**
 * Verified emission factors from published government, IPCC, and official conversion datasets.
 * Note: Lifestyle meal types (Plant-Based Meal, Meat-Based Meal) are intentionally not seeded
 * with arbitrary constants because food lifecycle emissions vary widely by ingredients and
 * production methods; see docs/DBMS_ARCHITECTURE.md for documented setup instructions.
 */
export const VERIFIED_EMISSION_FACTORS: readonly SeedEmissionFactor[] = [
  {
    category: 'Transportation',
    activityName: 'Car Travel',
    unit: 'km',
    factorKgCo2ePerUnit: '0.14000000',
    source: 'India GHG Program — India Specific Road Transport Emission Factors (Hatchback <1400 cc Gasoline, with 8% uplift)',
    sourceUrl: 'https://indiaghgp.org/',
    referenceYear: 2015,
    effectiveDate: '2015-01-01',
    geographicScope: 'India',
    notes: 'Tailpipe CO2 factor per vehicle-km for typical Indian petrol hatchback (<1400 cc) including 8% real-world uplift; excludes upstream WTT emissions.',
  },
  {
    category: 'Transportation',
    activityName: 'Motorcycle Travel',
    unit: 'km',
    factorKgCo2ePerUnit: '0.05160000',
    source: 'India GHG Program — India Specific Road Transport Emission Factors (Two-wheelers Petrol baseline)',
    sourceUrl: 'https://indiaghgp.org/',
    referenceYear: 2015,
    effectiveDate: '2015-01-01',
    geographicScope: 'India',
    notes: 'Average petrol two-wheeler tailpipe CO2 factor per vehicle-km; varies by engine displacement and fuel economy (35-60 km/L).',
  },
  {
    category: 'Transportation',
    activityName: 'Bus Travel',
    unit: 'km',
    factorKgCo2ePerUnit: '0.01516000',
    source: 'India GHG Program — India Specific Road Transport Emission Factors (Intracity Bus, passenger-km basis)',
    sourceUrl: 'https://indiaghgp.org/',
    referenceYear: 2015,
    effectiveDate: '2015-01-01',
    geographicScope: 'India',
    notes: 'Per passenger-km factor assuming typical Indian intracity bus occupancy rates; actual emissions vary with load factor and fuel type.',
  },
  {
    category: 'Transportation',
    activityName: 'Metro Travel',
    unit: 'km',
    factorKgCo2ePerUnit: '0.02860000',
    source: 'UK DESNZ / Defra — Greenhouse Gas Reporting: Conversion Factors 2024 (Light rail and tram average)',
    sourceUrl: 'https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting',
    referenceYear: 2024,
    effectiveDate: '2024-06-01',
    geographicScope: 'UK proxy (uniform Indian city metro emission factor unavailable in India GHG Program)',
    notes: 'Per passenger-km weighted light rail/metro proxy; Indian metro systems vary by regional grid mix and occupancy.',
  },
  {
    category: 'Energy',
    activityName: 'Electricity Consumption',
    unit: 'kWh',
    factorKgCo2ePerUnit: '0.72700000',
    source: 'Central Electricity Authority (CEA), Ministry of Power, Govt. of India — CO2 Baseline Database Version 20.0 (FY 2023-24)',
    sourceUrl: 'https://cea.nic.in/',
    referenceYear: 2024,
    effectiveDate: '2024-04-01',
    geographicScope: 'India (All-India weighted average grid)',
    notes: 'Weighted average emission factor (0.727 tCO2/MWh = 0.727 kg CO2/kWh) across all grid-connected conventional and renewable generation adjusted for cross-border transfers.',
  },
  {
    category: 'Energy',
    activityName: 'LPG Cooking Gas',
    unit: 'kg',
    factorKgCo2ePerUnit: '2.98463000',
    source: '2006 IPCC Guidelines for National Greenhouse Gas Inventories (Vol. 2 Energy, Ch. 2 Stationary Combustion: 63,100 kg CO2/TJ x 47.3 TJ/Gg)',
    sourceUrl: 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html',
    referenceYear: 2006,
    effectiveDate: '2006-04-01',
    geographicScope: 'Global Tier 1 default',
    notes: 'Derived directly from IPCC Tier 1 default CO2 emission factor (63.1 kg CO2/GJ) and default NCV (47.3 GJ/tonne) for LPG stationary combustion.',
  },
];

export async function seedEmissionFactors(): Promise<number> {
  if (!isDatabaseConfigured()) {
    throw new Error(
      'Cannot seed emission factors: DATABASE_URL is not set. Configure DATABASE_URL in .env before running db:seed.'
    );
  }

  await seedActivityTypes();

  return withTransaction(async (client) => {
    let insertedOrUpdatedCount = 0;

    for (const item of VERIFIED_EMISSION_FACTORS) {
      const typeResult = await client.query<{ id: string }>(
        `
          SELECT id
          FROM activity_types
          WHERE category = $1 AND name = $2
          LIMIT 1
        `,
        [item.category, item.activityName]
      );

      const activityType = typeResult.rows[0];
      if (!activityType) {
        continue;
      }

      const result = await client.query(
        `
          INSERT INTO emission_factors (
            activity_type_id,
            factor_kg_co2e_per_unit,
            unit,
            source,
            source_url,
            reference_year,
            effective_date,
            geographic_scope,
            notes
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            factor_kg_co2e_per_unit = VALUES(factor_kg_co2e_per_unit),
            unit = VALUES(unit),
            source_url = VALUES(source_url),
            reference_year = VALUES(reference_year),
            geographic_scope = VALUES(geographic_scope),
            notes = VALUES(notes)
        `,
        [
          activityType.id,
          item.factorKgCo2ePerUnit,
          item.unit,
          item.source,
          item.sourceUrl,
          item.referenceYear,
          item.effectiveDate,
          item.geographicScope,
          item.notes,
        ]
      );

      insertedOrUpdatedCount += result.rowCount ?? 0;
    }

    return insertedOrUpdatedCount;
  });
}

const isMainModule =
  process.argv[1] !== undefined && /seedEmissionFactors\.(ts|js|mjs)$/.test(process.argv[1]);

if (isMainModule) {
  seedEmissionFactors()
    .then(async (count) => {
      console.log(`Emission factors seed complete. Upserted ${count} verified emission_factors rows.`);
      await closeDatabasePool();
    })
    .catch(async (error) => {
      console.error('Emission factors seed failed:', error instanceof Error ? error.message : error);
      await closeDatabasePool().catch(() => undefined);
      process.exit(1);
    });
}
