import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Download, FileSpreadsheet } from 'lucide-react';
import { downloadActivitiesCsv, fetchMonthlyReport } from '../../services/reportApi';
import type { MonthlyCarbonReport } from '../../types/ecotrack';
import { Button } from '../ui/Button';
import { Card, CardHeader } from '../ui/Card';
import { FormError } from '../ui/FormError';
import { AnalyticsErrorState, LoadingSkeleton } from './AnalyticsStates';

export interface MonthlyReportCardProps {
  year: number;
  month: number;
  refreshTick?: number;
}

function pad2(val: number): string {
  return String(val).padStart(2, '0');
}

export function MonthlyReportCard({
  year,
  month,
  refreshTick = 0,
}: MonthlyReportCardProps) {
  const [report, setReport] = useState<MonthlyCarbonReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchMonthlyReport({ year, month });
      setReport(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to load monthly carbon report.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    void loadReport();
  }, [loadReport, refreshTick]);

  const handleDownloadMonthCsv = async () => {
    if (!report) return;
    setIsDownloading(true);
    setDownloadError(null);
    setDownloadSuccess(null);

    const startDate = report.period.monthStart;
    const endDate = `${report.period.monthKey}-${pad2(report.period.totalDays)}`;

    try {
      const filename = await downloadActivitiesCsv({
        startDate,
        endDate,
        sort: 'date_asc',
      });
      setDownloadSuccess(`Downloaded ${filename}.`);
    } catch (err: unknown) {
      setDownloadError(
        err instanceof Error
          ? err.message
          : 'Unable to download CSV report for this month.'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#DCEDE3] text-[#176B52]">
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
          </span>
          <CardHeader
            title="Monthly Carbon Report"
            description={
              report
                ? `Structured PostgreSQL report for ${report.period.monthLabel} — ${report.disclaimer}`
                : 'Structured monthly summary and CSV export backed by PostgreSQL.'
            }
          />
        </div>

        <Button
          variant="outline"
          onClick={() => void handleDownloadMonthCsv()}
          disabled={isLoading || !report || isDownloading}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          <span>{isDownloading ? 'Exporting CSV...' : 'Download CSV Report'}</span>
        </Button>
      </div>

      {downloadError ? <FormError message={downloadError} /> : null}

      {downloadSuccess ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-[#BCE0CA] bg-[#DCEDE3]/70 px-3.5 py-2.5 text-xs font-medium text-[#18392C]"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#176B52]" aria-hidden="true" />
          <span>{downloadSuccess}</span>
        </div>
      ) : null}

      {isLoading ? (
        <LoadingSkeleton variant="table" label="Generating monthly carbon report..." />
      ) : error ? (
        <AnalyticsErrorState message={error} onRetry={() => void loadReport()} />
      ) : report ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-[#E1EAE4] bg-[#F6F8F3] p-4">
              <p className="text-xs font-medium text-[#64766C]">Total Monthly Emissions</p>
              <p className="mt-1 text-xl font-bold text-[#18392C] font-mono tabular-nums">
                {report.summary.totalEmissionsKg.toFixed(2)} kg CO₂e
              </p>
              <p className="mt-1 text-xs text-[#64766C]">
                {report.summary.activityCount} recorded{' '}
                {report.summary.activityCount === 1 ? 'activity' : 'activities'} · Avg{' '}
                {report.summary.dailyAverageKg.toFixed(2)} kg/day
              </p>
            </div>

            <div className="rounded-lg border border-[#E1EAE4] bg-[#F6F8F3] p-4">
              <p className="text-xs font-medium text-[#64766C]">Highest Emission Category</p>
              <p className="mt-1 text-xl font-bold text-[#18392C]">
                {report.highestCategory ? report.highestCategory.category : 'None'}
              </p>
              <p className="mt-1 text-xs text-[#64766C]">
                {report.highestCategory
                  ? `${report.highestCategory.totalEmissionsKg.toFixed(2)} kg CO₂e (${report.highestCategory.percentageShare.toFixed(1)}%)`
                  : report.highestCategoryMessage}
              </p>
            </div>

            <div className="rounded-lg border border-[#E1EAE4] bg-[#F6F8F3] p-4">
              <p className="text-xs font-medium text-[#64766C]">Monthly Target Status</p>
              <p className="mt-1 text-xl font-bold text-[#18392C]">
                {report.goal.hasGoal && report.goal.targetCo2eKg !== null
                  ? `${report.goal.targetCo2eKg.toFixed(2)} kg CO₂e`
                  : 'No Target Set'}
              </p>
              <p className="mt-1 text-xs text-[#64766C]">
                {report.goal.hasGoal && report.goal.usagePercentage !== null
                  ? `${report.goal.statusLabel} (${report.goal.usagePercentage.toFixed(1)}% used)`
                  : report.goal.contextMessage}
              </p>
            </div>

            <div className="rounded-lg border border-[#E1EAE4] bg-[#F6F8F3] p-4">
              <p className="text-xs font-medium text-[#64766C]">vs. Previous Month</p>
              <p className="mt-1 text-xl font-bold text-[#18392C] font-mono tabular-nums">
                {report.previousMonthComparison.percentageChange !== null
                  ? `${report.previousMonthComparison.percentageChange > 0 ? '+' : ''}${report.previousMonthComparison.percentageChange.toFixed(1)}%`
                  : 'N/A'}
              </p>
              <p className="mt-1 text-xs text-[#64766C]">
                {report.previousMonthComparison.previousMonthLabel}:{' '}
                {report.previousMonthComparison.previousMonthTotalKg.toFixed(2)} kg CO₂e
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {report.categories.map((cat) => (
              <div
                key={cat.category}
                className="flex items-center justify-between rounded-lg border border-[#E1EAE4] bg-white px-4 py-3 text-xs"
              >
                <div>
                  <p className="font-semibold text-[#18392C]">{cat.category}</p>
                  <p className="text-[#64766C]">
                    {cat.activityCount}{' '}
                    {cat.activityCount === 1 ? 'activity' : 'activities'}
                  </p>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <p className="font-bold text-[#18392C]">
                    {cat.totalEmissionsKg.toFixed(2)} kg CO₂e
                  </p>
                  <p className="text-[#176B52] font-semibold">
                    {cat.percentageShare.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
