import { ApiError, apiRequest } from './apiClient';
import type { ActivityListQueryParams } from './activityApi';
import type { MonthlyCarbonReport } from '../types/ecotrack';

export async function fetchMonthlyReport(params: {
  year?: number;
  month?: number;
} = {}): Promise<MonthlyCarbonReport> {
  const sp = new URLSearchParams();
  if (params.year !== undefined) sp.set('year', String(params.year));
  if (params.month !== undefined) sp.set('month', String(params.month));
  const qs = sp.toString();
  const url = qs ? `/api/reports/monthly?${qs}` : '/api/reports/monthly';
  const data = await apiRequest<{ report: MonthlyCarbonReport }>(url);
  return data.report;
}

function parseFilenameFromContentDisposition(headerValue: string | null): string {
  if (!headerValue) return 'ecotrack-emissions.csv';
  const match = /filename="?([^";\n]+)"?/i.exec(headerValue);
  return match?.[1]?.trim() || 'ecotrack-emissions.csv';
}

export async function downloadActivitiesCsv(
  params: Omit<ActivityListQueryParams, 'page' | 'limit'> = {}
): Promise<string> {
  const searchParams = new URLSearchParams();

  if (params.category && params.category !== 'All') {
    searchParams.set('category', params.category);
  }
  if (params.activityTypeId) {
    searchParams.set('activityTypeId', params.activityTypeId);
  }
  if (params.startDate) {
    searchParams.set('startDate', params.startDate);
  }
  if (params.endDate) {
    searchParams.set('endDate', params.endDate);
  }
  if (params.minEmissions !== undefined && params.minEmissions.trim() !== '') {
    searchParams.set('minEmissions', params.minEmissions.trim());
  }
  if (params.maxEmissions !== undefined && params.maxEmissions.trim() !== '') {
    searchParams.set('maxEmissions', params.maxEmissions.trim());
  }
  if (params.search?.trim()) {
    searchParams.set('search', params.search.trim());
  }
  if (params.sort) {
    searchParams.set('sort', params.sort);
  }

  const query = searchParams.toString();
  const url = query ? `/api/reports/export?${query}` : '/api/reports/export';

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'text/csv, application/json' },
  });

  if (!response.ok) {
    let message = `Unable to export CSV (HTTP ${response.status}).`;
    let code: string | undefined;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
      };
      if (typeof payload.error === 'string') {
        message = payload.error;
      }
      if (typeof payload.code === 'string') {
        code = payload.code;
      }
    }
    throw new ApiError(message, response.status, code);
  }

  const blob = await response.blob();
  const filename = parseFilenameFromContentDisposition(
    response.headers.get('content-disposition')
  );

  const objectUrl = window.URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } finally {
    window.URL.revokeObjectURL(objectUrl);
  }

  return filename;
}
