import { Router, type NextFunction, type Request, type Response } from 'express';
import { DatabaseNotConfiguredError } from '../db/connection';
import { requireAuth } from '../middleware/requireAuth';
import { getUserRecommendations } from '../services/recommendationService';
import { validateAnalyticsPeriodQuery } from '../utils/analyticsDates';

const router = Router();

router.get(
  '/recommendations',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const validation = validateAnalyticsPeriodQuery(req.query as Record<string, unknown>);
    if (!validation.valid || !validation.data) {
      res.status(400).json({
        error: 'Invalid month or year parameters.',
        fields: validation.errors,
      });
      return;
    }

    try {
      const data = await getUserRecommendations(
        req.authUser!.id,
        validation.data.year,
        validation.data.month
      );
      res.status(200).json(data);
    } catch (error) {
      if (error instanceof DatabaseNotConfiguredError) {
        res.status(503).json({ error: error.message, code: error.code });
        return;
      }
      next(error);
    }
  }
);

export default router;
