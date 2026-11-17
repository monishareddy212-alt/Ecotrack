import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildActivitiesCsv,
  buildCsvExportFilename,
  sanitizeAndEscapeCsvCell,
} from './csvExport';

test('sanitizeAndEscapeCsvCell escapes commas, quotes, and neutralizes formula injection', () => {
  assert.equal(sanitizeAndEscapeCsvCell('Car Travel'), 'Car Travel');
  assert.equal(sanitizeAndEscapeCsvCell('India GHG, 2015 "v1"'), '"India GHG, 2015 ""v1"""');

  assert.equal(sanitizeAndEscapeCsvCell('=CMD|"/C calc"!A0'), '"\'=CMD|""/C calc""!A0"');
  assert.equal(sanitizeAndEscapeCsvCell('+SUM(A1:A2)'), "'+SUM(A1:A2)");
  assert.equal(sanitizeAndEscapeCsvCell('-1+1'), "'-1+1");
  assert.equal(sanitizeAndEscapeCsvCell('@SUM(1,1)'), `"'@SUM(1,1)"`);
  assert.equal(sanitizeAndEscapeCsvCell('@SUM'), "'@SUM");
  assert.equal(sanitizeAndEscapeCsvCell('\t1+1'), "'\t1+1");
});

test('buildActivitiesCsv produces UTF-8 CSV with header row for empty and non-empty records', () => {
  const emptyCsv = buildActivitiesCsv([]);
  assert.ok(emptyCsv.startsWith('\uFEFFActivity Date,Category,Activity Type'));

  const populated = buildActivitiesCsv([
    {
      activityDate: '2026-11-16',
      category: 'Transportation',
      activityTypeName: 'Car Travel',
      quantityRaw: '25.500',
      unit: 'km',
      factorKgCo2ePerUnit: '0.14000000',
      calculatedCo2eRaw: '3.570000',
      source: 'India GHG Program, Hatchback',
    },
  ]);

  const lines = populated.replace(/^\uFEFF/, '').trim().split('\r\n');
  assert.equal(lines.length, 2);
  assert.match(lines[1], /^2026-11-16,Transportation,Car Travel,25\.500,km,0\.14000000,3\.570000,"India GHG Program, Hatchback"$/);
});

test('buildCsvExportFilename derives meaningful sanitized filenames', () => {
  assert.equal(
    buildCsvExportFilename('2026-11-01', '2026-11-30'),
    'ecotrack-emissions-2026-11.csv'
  );
  assert.equal(
    buildCsvExportFilename('2026-10-15', '2026-11-15'),
    'ecotrack-emissions-2026-10-15_to_2026-11-15.csv'
  );
  assert.equal(buildCsvExportFilename(), 'ecotrack-emissions-all.csv');
});
