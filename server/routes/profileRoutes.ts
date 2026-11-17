import { Router, type NextFunction, type Request, type Response } from 'express';
import { DatabaseNotConfiguredError } from '../db/connection';
import { verifyCsrfToken } from '../middleware/csrf';
import { requireAuth } from '../middleware/requireAuth';
import { updateUserFullName } from '../services/authService';
import { validateProfileUpdatePayload } from '../utils/validation';

const router = Router();

router.get('/profile', requireAuth, (req: Request, res: Response) => {
  res.status(200).json({
    user: req.authUser,
  });
});

router.put(
  '/profile',
  requireAuth,
  verifyCsrfToken,
  async (req: Request, res: Response, next: NextFunction) => {
    const validation = validateProfileUpdatePayload(req.body);
    if (!validation.valid || !validation.data) {
      res.status(400).json({
        error: 'Please check your profile details.',
        fields: validation.errors,
      });
      return;
    }

    try {
      const updatedUser = await updateUserFullName(
        req.authUser!.id,
        validation.data.fullName
      );
      if (!updatedUser) {
        res.status(404).json({ error: 'User account not found.' });
        return;
      }
      res.status(200).json({
        message: 'Profile updated successfully.',
        user: updatedUser,
      });
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
