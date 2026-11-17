import { Router, type NextFunction, type Request, type Response } from 'express';
import { DatabaseNotConfiguredError } from '../db/connection';
import { verifyCsrfToken } from '../middleware/csrf';
import { requireAuth } from '../middleware/requireAuth';
import {
  ActivityNotFoundError,
  ActivityTypeNotFoundError,
  EmissionFactorUnavailableError,
  UnsupportedUnitError,
  createActivity,
  deleteUserActivity,
  getUserActivityById,
  getUserActivitySummary,
  listActiveActivityTypes,
  listUserActivities,
  updateUserActivity,
} from '../services/activityService';
import {
  isPositiveIntegerId,
  validateActivityListQuery,
  validateActivityPayload,
} from '../utils/activityValidation';

const router = Router();

function handleActivityError(error: unknown, res: Response, next: NextFunction): void {
  if (error instanceof DatabaseNotConfiguredError) {
    res.status(503).json({ error: error.message, code: error.code });
    return;
  }
  if (error instanceof ActivityTypeNotFoundError || error instanceof UnsupportedUnitError) {
    res.status(400).json({ error: error.message, code: error.code });
    return;
  }
  if (error instanceof EmissionFactorUnavailableError) {
    res.status(422).json({ error: error.message, code: error.code });
    return;
  }
  if (error instanceof ActivityNotFoundError) {
    res.status(404).json({ error: error.message, code: error.code });
    return;
  }
  next(error);
}

router.get('/activity-types', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await listActiveActivityTypes();
    res.status(200).json({ items });
  } catch (error) {
    handleActivityError(error, res, next);
  }
});

router.get(
  '/activities/summary',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const queryValidation = validateActivityListQuery({
      category: req.query.category,
      activityTypeId: req.query.activityTypeId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      minEmissions: req.query.minEmissions,
      maxEmissions: req.query.maxEmissions,
      search: req.query.search,
    });
    if (!queryValidation.valid || !queryValidation.data) {
      res.status(400).json({
        error: 'Invalid summary filter parameters.',
        fields: queryValidation.errors,
      });
      return;
    }

    try {
      const summary = await getUserActivitySummary(req.authUser!.id, {
        category: queryValidation.data.category,
        activityTypeId: queryValidation.data.activityTypeId,
        startDate: queryValidation.data.startDate,
        endDate: queryValidation.data.endDate,
        minEmissions: queryValidation.data.minEmissions,
        maxEmissions: queryValidation.data.maxEmissions,
        search: queryValidation.data.search,
      });
      res.status(200).json({ summary });
    } catch (error) {
      handleActivityError(error, res, next);
    }
  }
);

router.get('/activities', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const queryValidation = validateActivityListQuery(req.query as Record<string, unknown>);
  if (!queryValidation.valid || !queryValidation.data) {
    res.status(400).json({
      error: 'Invalid filter or pagination parameters.',
      fields: queryValidation.errors,
    });
    return;
  }

  try {
    const data = await listUserActivities(req.authUser!.id, queryValidation.data);
    res.status(200).json(data);
  } catch (error) {
    handleActivityError(error, res, next);
  }
});

router.post(
  '/activities',
  requireAuth,
  verifyCsrfToken,
  async (req: Request, res: Response, next: NextFunction) => {
    const validation = validateActivityPayload(req.body);
    if (!validation.valid || !validation.data) {
      res.status(400).json({
        error: 'Please review the highlighted activity fields.',
        fields: validation.errors,
      });
      return;
    }

    try {
      const activity = await createActivity(req.authUser!.id, validation.data);
      res.status(201).json({
        message: 'Activity saved and carbon emissions calculated.',
        activity,
      });
    } catch (error) {
      handleActivityError(error, res, next);
    }
  }
);

router.get(
  '/activities/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const activityId = req.params.id;
    if (!isPositiveIntegerId(activityId)) {
      res.status(400).json({ error: 'Invalid activity ID.' });
      return;
    }

    try {
      const activity = await getUserActivityById(req.authUser!.id, activityId);
      res.status(200).json({ activity });
    } catch (error) {
      handleActivityError(error, res, next);
    }
  }
);

router.put(
  '/activities/:id',
  requireAuth,
  verifyCsrfToken,
  async (req: Request, res: Response, next: NextFunction) => {
    const activityId = req.params.id;
    if (!isPositiveIntegerId(activityId)) {
      res.status(400).json({ error: 'Invalid activity ID.' });
      return;
    }

    const validation = validateActivityPayload(req.body);
    if (!validation.valid || !validation.data) {
      res.status(400).json({
        error: 'Please review the highlighted activity fields.',
        fields: validation.errors,
      });
      return;
    }

    try {
      const activity = await updateUserActivity(req.authUser!.id, activityId, validation.data);
      res.status(200).json({
        message: 'Activity updated and emissions recalculated.',
        activity,
      });
    } catch (error) {
      handleActivityError(error, res, next);
    }
  }
);

router.delete(
  '/activities/:id',
  requireAuth,
  verifyCsrfToken,
  async (req: Request, res: Response, next: NextFunction) => {
    const activityId = req.params.id;
    if (!isPositiveIntegerId(activityId)) {
      res.status(400).json({ error: 'Invalid activity ID.' });
      return;
    }

    try {
      await deleteUserActivity(req.authUser!.id, activityId);
      res.status(200).json({ message: 'Activity deleted successfully.' });
    } catch (error) {
      handleActivityError(error, res, next);
    }
  }
);

export default router;
