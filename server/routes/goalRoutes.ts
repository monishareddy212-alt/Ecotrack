import { Router, type NextFunction, type Request, type Response } from 'express';
import { DatabaseNotConfiguredError } from '../db/connection';
import { verifyCsrfToken } from '../middleware/csrf';
import { requireAuth } from '../middleware/requireAuth';
import {
  DuplicateGoalError,
  GoalNotFoundError,
  createUserGoal,
  deleteUserGoal,
  getCurrentUserGoal,
  listUserGoals,
  updateUserGoal,
} from '../services/goalService';
import { isPositiveIntegerId } from '../utils/activityValidation';
import { validateAnalyticsPeriodQuery } from '../utils/analyticsDates';
import { validateGoalPayload } from '../utils/goalValidation';

const router = Router();

function handleGoalError(error: unknown, res: Response, next: NextFunction): void {
  if (error instanceof DatabaseNotConfiguredError) {
    res.status(503).json({ error: error.message, code: error.code });
    return;
  }
  if (error instanceof DuplicateGoalError) {
    res.status(409).json({ error: error.message, code: error.code });
    return;
  }
  if (error instanceof GoalNotFoundError) {
    res.status(404).json({ error: error.message, code: error.code });
    return;
  }
  next(error);
}

router.get('/goals', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await listUserGoals(req.authUser!.id);
    res.status(200).json({ items });
  } catch (error) {
    handleGoalError(error, res, next);
  }
});

// Registered BEFORE /goals/:id so "current" is never treated as an ID
router.get(
  '/goals/current',
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
      const current = await getCurrentUserGoal(
        req.authUser!.id,
        validation.data.year,
        validation.data.month
      );
      res.status(200).json(current);
    } catch (error) {
      handleGoalError(error, res, next);
    }
  }
);

router.post(
  '/goals',
  requireAuth,
  verifyCsrfToken,
  async (req: Request, res: Response, next: NextFunction) => {
    const validation = validateGoalPayload(req.body);
    if (!validation.valid || !validation.data) {
      res.status(400).json({
        error: 'Please review the highlighted sustainability goal fields.',
        fields: validation.errors,
      });
      return;
    }

    try {
      const goal = await createUserGoal(req.authUser!.id, validation.data);
      res.status(201).json({
        message: 'Monthly sustainability goal saved.',
        goal,
      });
    } catch (error) {
      handleGoalError(error, res, next);
    }
  }
);

router.put(
  '/goals/:id',
  requireAuth,
  verifyCsrfToken,
  async (req: Request, res: Response, next: NextFunction) => {
    const goalId = req.params.id;
    if (!isPositiveIntegerId(goalId)) {
      res.status(400).json({ error: 'Invalid goal ID.' });
      return;
    }

    const validation = validateGoalPayload(req.body);
    if (!validation.valid || !validation.data) {
      res.status(400).json({
        error: 'Please review the highlighted sustainability goal fields.',
        fields: validation.errors,
      });
      return;
    }

    try {
      const goal = await updateUserGoal(req.authUser!.id, goalId, validation.data);
      res.status(200).json({
        message: 'Monthly sustainability goal updated.',
        goal,
      });
    } catch (error) {
      handleGoalError(error, res, next);
    }
  }
);

router.delete(
  '/goals/:id',
  requireAuth,
  verifyCsrfToken,
  async (req: Request, res: Response, next: NextFunction) => {
    const goalId = req.params.id;
    if (!isPositiveIntegerId(goalId)) {
      res.status(400).json({ error: 'Invalid goal ID.' });
      return;
    }

    try {
      await deleteUserGoal(req.authUser!.id, goalId);
      res.status(200).json({ message: 'Monthly sustainability goal deleted.' });
    } catch (error) {
      handleGoalError(error, res, next);
    }
  }
);

export default router;
