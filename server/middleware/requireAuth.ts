import type { NextFunction, Request, Response } from 'express';
import { isDatabaseConfigured } from '../db/connection';
import { getUserById } from '../services/authService';

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!isDatabaseConfigured()) {
    res.status(503).json({
      error: 'Database connection is not configured on the server.',
      code: 'DATABASE_NOT_CONFIGURED',
    });
    return;
  }

  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({
      error: 'Authentication required. Please sign in to continue.',
      code: 'UNAUTHENTICATED',
    });
    return;
  }

  try {
    const user = await getUserById(userId);
    if (!user) {
      req.session.destroy(() => undefined);
      res.status(401).json({
        error: 'Your session is no longer valid. Please sign in again.',
        code: 'SESSION_INVALID',
      });
      return;
    }

    req.authUser = user;
    next();
  } catch (error) {
    next(error);
  }
}
