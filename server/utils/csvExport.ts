export interface CsvExportRow {
  activityDate: string;
  category: string;
  activityTypeName: string;
  quantityRaw: string;
  unit: string;
  factorKgCo2ePerUnit: string;
  calculatedCo2eRaw: string;
  source: string;
}

export const CSV_EXPORT_HEADERS = [
  'Activity Date',
  'Category',
  'Activity Type',
  'Quantity',
  'Unit',
  'Emission Factor (kg CO2e/unit)',
  'Estimated Emissions (kg CO2e)',
  'Emission Factor Source',
] as const;

const FORMULA_INJECTION_PREFIX_RE = /^[=+\-@\t\r]/;

/**
 * Neutralizes spreadsheet formula injection (CSV injection) and applies RFC-4180 quoting.
 */
export function sanitizeAndEscapeCsvCell(rawValue: string | number | null | undefined): string {
  const str = rawValue === null || rawValue === undefined ? '' : String(rawValue);
  const safeValue = FORMULA_INJECTION_PREFIX_RE.test(str) ? `'${str}` : str;

  if (/[",\r\n]/.test(safeValue)) {
    return `"${safeValue.replace(/"/g, '""')}"`;
  }
  return safeValue;
}

export function buildActivitiesCsv(rows: readonly CsvExportRow[]): string {
  const lines: string[] = [
    CSV_EXPORT_HEADERS.map((header) => sanitizeAndEscapeCsvCell(header)).join(','),
  ];

  for (const row of rows) {
    const cells = [
      row.activityDate,
      row.category,
      row.activityTypeName,
      row.quantityRaw,
      row.unit,
      row.factorKgCo2ePerUnit,
      row.calculatedCo2eRaw,
      row.source,
    ];
    lines.push(cells.map((cell) => sanitizeAndEscapeCsvCell(cell)).join(','));
  }

  // UTF-8 BOM ensures Excel opens UTF-8 characters cleanly without encoding drift
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export function buildCsvExportFilename(startDate?: string, endDate?: string): string {
  const cleanDate = (val?: string) => (val && /^\d{4}-\d{2}-\d{2}$/.test(val) ? val : null);
  const s = cleanDate(startDate);
  const e = cleanDate(endDate);

  if (s && e) {
    if (s.slice(0, 7) === e.slice(0, 7) && s.endsWith('-01')) {
      return `ecotrack-emissions-${s.slice(0, 7)}.csv`;
    }
    return `ecotrack-emissions-${s}_to_${e}.csv`;
  }
  if (s) {
    return `ecotrack-emissions-from-${s}.csv`;
  }
  if (e) {
    return `ecotrack-emissions-until-${e}.csv`;
  }
  return 'ecotrack-emissions-all.csv';
}
