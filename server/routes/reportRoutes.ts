import { Router, type NextFunction, type Request, type Response } from 'express';
import { DatabaseNotConfiguredError } from '../db/connection';
import { requireAuth } from '../middleware/requireAuth';
import {
  ExportLimitExceededError,
  listActivitiesForExport,
} from '../services/activityService';
import { getMonthlyCarbonReport } from '../services/reportService';
import { validateActivityListQuery } from '../utils/activityValidation';
import { validateAnalyticsPeriodQuery } from '../utils/analyticsDates';
import { buildActivitiesCsv, buildCsvExportFilename } from '../utils/csvExport';

const router = Router();

function handleReportError(error: unknown, res: Response, next: NextFunction): void {
  if (error instanceof DatabaseNotConfiguredError) {
    res.status(503).json({ error: error.message, code: error.code });
    return;
  }
  if (error instanceof ExportLimitExceededError) {
    res.status(413).json({ error: error.message, code: error.code });
    return;
  }
  next(error);
}

router.get(
  '/reports/monthly',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const validation = validateAnalyticsPeriodQuery(req.query as Record<string, unknown>);
    if (!validation.valid || !validation.data) {
      res.status(400).json({
        error: 'Invalid monthly report parameters.',
        fields: validation.errors,
      });
      return;
    }

    try {
      const report = await getMonthlyCarbonReport(
        req.authUser!.id,
        validation.data.year,
        validation.data.month
      );
      res.status(200).json({ report });
    } catch (error) {
      handleReportError(error, res, next);
    }
  }
);

router.get(
  '/reports/export',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const queryValidation = validateActivityListQuery(req.query as Record<string, unknown>);
    if (!queryValidation.valid || !queryValidation.data) {
      res.status(400).json({
        error: 'Invalid report export filter parameters.',
        fields: queryValidation.errors,
      });
      return;
    }

    try {
      const rows = await listActivitiesForExport(req.authUser!.id, queryValidation.data, 5000);
      const csv = buildActivitiesCsv(rows);
      const filename = buildCsvExportFilename(
        queryValidation.data.startDate,
        queryValidation.data.endDate
      );

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).send(csv);
    } catch (error) {
      handleReportError(error, res, next);
    }
  }
);

export default router;
