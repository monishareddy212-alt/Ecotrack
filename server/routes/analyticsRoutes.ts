import { Router, type NextFunction, type Request, type Response } from 'express';
import { DatabaseNotConfiguredError } from '../db/connection';
import { requireAuth } from '../middleware/requireAuth';
import {
  getAnalyticsOverview,
  getCategoryBreakdown,
  getDailyTrend,
  getMonthlyTrend,
  getRecentAnalyticsActivities,
  getTopCategory,
} from '../services/analyticsService';
import { validateAnalyticsPeriodQuery } from '../utils/analyticsDates';

const router = Router();

function handleAnalyticsError(error: unknown, res: Response, next: NextFunction): void {
  if (error instanceof DatabaseNotConfiguredError) {
    res.status(503).json({ error: error.message, code: error.code });
    return;
  }
  next(error);
}

router.get(
  '/analytics/overview',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const validation = validateAnalyticsPeriodQuery(req.query as Record<string, unknown>);
    if (!validation.valid || !validation.data) {
      res.status(400).json({
        error: 'Invalid analytics period parameters.',
        fields: validation.errors,
      });
      return;
    }

    try {
      const overview = await getAnalyticsOverview(
        req.authUser!.id,
        validation.data.year,
        validation.data.month
      );
      res.status(200).json({ overview });
    } catch (error) {
      handleAnalyticsError(error, res, next);
    }
  }
);

router.get(
  '/analytics/monthly-trend',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const validation = validateAnalyticsPeriodQuery(req.query as Record<string, unknown>);
    if (!validation.valid || !validation.data) {
      res.status(400).json({
        error: 'Invalid monthly trend parameters.',
        fields: validation.errors,
      });
      return;
    }

    try {
      const trend = await getMonthlyTrend(
        req.authUser!.id,
        validation.data.year,
        validation.data.month,
        validation.data.range
      );
      res.status(200).json({ trend });
    } catch (error) {
      handleAnalyticsError(error, res, next);
    }
  }
);

router.get(
  '/analytics/category-breakdown',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const validation = validateAnalyticsPeriodQuery(req.query as Record<string, unknown>);
    if (!validation.valid || !validation.data) {
      res.status(400).json({
        error: 'Invalid category breakdown parameters.',
        fields: validation.errors,
      });
      return;
    }

    try {
      const breakdown = await getCategoryBreakdown(
        req.authUser!.id,
        validation.data.year,
        validation.data.month
      );
      res.status(200).json({ breakdown });
    } catch (error) {
      handleAnalyticsError(error, res, next);
    }
  }
);

router.get(
  '/analytics/daily-trend',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const validation = validateAnalyticsPeriodQuery(req.query as Record<string, unknown>);
    if (!validation.valid || !validation.data) {
      res.status(400).json({
        error: 'Invalid daily trend parameters.',
        fields: validation.errors,
      });
      return;
    }

    try {
      const dailyTrend = await getDailyTrend(
        req.authUser!.id,
        validation.data.year,
        validation.data.month
      );
      res.status(200).json({ dailyTrend });
    } catch (error) {
      handleAnalyticsError(error, res, next);
    }
  }
);

router.get(
  '/analytics/top-category',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const validation = validateAnalyticsPeriodQuery(req.query as Record<string, unknown>);
    if (!validation.valid || !validation.data) {
      res.status(400).json({
        error: 'Invalid top-category parameters.',
        fields: validation.errors,
      });
      return;
    }

    try {
      const topCategory = await getTopCategory(
        req.authUser!.id,
        validation.data.year,
        validation.data.month
      );
      res.status(200).json({ topCategory });
    } catch (error) {
      handleAnalyticsError(error, res, next);
    }
  }
);

router.get(
  '/analytics/recent-activities',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    let limit = 5;
    if (req.query.limit !== undefined && String(req.query.limit).trim() !== '') {
      const parsed = Number(req.query.limit);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20) {
        res.status(400).json({
          error: 'Invalid limit parameter.',
          fields: { limit: 'Limit must be an integer between 1 and 20.' },
        });
        return;
      }
      limit = parsed;
    }

    try {
      const items = await getRecentAnalyticsActivities(req.authUser!.id, limit);
      res.status(200).json({ items });
    } catch (error) {
      handleAnalyticsError(error, res, next);
    }
  }
);

export default router;
