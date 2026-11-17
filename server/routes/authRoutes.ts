import { Router, type NextFunction, type Request, type Response } from 'express';
import { loadServerConfig } from '../config/env';
import { DatabaseNotConfiguredError, isDatabaseConfigured } from '../db/connection';
import { ensureSessionCsrfToken, generateCsrfToken, verifyCsrfToken } from '../middleware/csrf';
import { loginRateLimiter, registerRateLimiter } from '../middleware/rateLimit';
import { requireAuth } from '../middleware/requireAuth';
import {
  EmailAlreadyRegisteredError,
  InvalidCredentialsError,
  authenticateUser,
  registerUser,
  updateUserFullName,
} from '../services/authService';
import {
  validateLoginPayload,
  validateProfileUpdatePayload,
  validateRegisterPayload,
} from '../utils/validation';

const router = Router();

function ensureDbAvailable(res: Response): boolean {
  if (!isDatabaseConfigured()) {
    res.status(503).json({
      error: 'Database connection is not configured. Add DATABASE_URL to enable authentication.',
      code: 'DATABASE_NOT_CONFIGURED',
    });
    return false;
  }
  return true;
}

function handleAuthError(error: unknown, res: Response, next: NextFunction): void {
  if (error instanceof DatabaseNotConfiguredError) {
    res.status(503).json({ error: error.message, code: error.code });
    return;
  }
  if (error instanceof EmailAlreadyRegisteredError) {
    res.status(409).json({ error: error.message, code: error.code });
    return;
  }
  if (error instanceof InvalidCredentialsError) {
    res.status(401).json({ error: error.message, code: error.code });
    return;
  }
  next(error);
}

router.get('/csrf', (req: Request, res: Response) => {
  const csrfToken = ensureSessionCsrfToken(req);
  req.session.save((err) => {
    if (err) {
      console.error('EcoTrack: Error saving session during /csrf:', err);
      res.status(500).json({ error: 'Unable to initialize session token. Please ensure MySQL database is accessible.' });
      return;
    }
    res.status(200).json({ csrfToken });
  });
});

router.post(
  '/register',
  registerRateLimiter,
  verifyCsrfToken,
  async (req: Request, res: Response, next: NextFunction) => {
    if (!ensureDbAvailable(res)) return;

    const validation = validateRegisterPayload(req.body);
    if (!validation.valid || !validation.data) {
      res.status(400).json({
        error: 'Please review the highlighted fields.',
        fields: validation.errors,
      });
      return;
    }

    try {
      const user = await registerUser({
        fullName: validation.data.fullName,
        email: validation.data.email,
        password: validation.data.password,
      });

      res.status(201).json({
        message: 'Account created successfully. Please sign in to continue.',
        user,
      });
    } catch (error) {
      handleAuthError(error, res, next);
    }
  }
);

router.post(
  '/login',
  loginRateLimiter,
  verifyCsrfToken,
  async (req: Request, res: Response, next: NextFunction) => {
    if (!ensureDbAvailable(res)) return;

    const validation = validateLoginPayload(req.body);
    if (!validation.valid || !validation.data) {
      res.status(400).json({
        error: 'Please provide both a valid email address and password.',
        fields: validation.errors,
      });
      return;
    }

    try {
      const user = await authenticateUser({
        email: validation.data.email,
        password: validation.data.password,
      });

      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((regenErr) => {
          if (regenErr) {
            reject(regenErr);
            return;
          }
          req.session.userId = user.id;
          req.session.csrfToken = generateCsrfToken();
          req.session.save((saveErr) => {
            if (saveErr) {
              reject(saveErr);
              return;
            }
            resolve();
          });
        });
      });

      res.status(200).json({
        message: 'Signed in successfully.',
        user,
        csrfToken: req.session.csrfToken,
      });
    } catch (error) {
      handleAuthError(error, res, next);
    }
  }
);

router.post(
  '/logout',
  verifyCsrfToken,
  (req: Request, res: Response, next: NextFunction) => {
    const config = loadServerConfig();
    req.session.destroy((err) => {
      if (err) {
        next(err);
        return;
      }
      res.clearCookie('ecotrack.sid', {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.isProduction,
        path: '/',
      });
      res.status(200).json({ message: 'Signed out successfully.' });
    });
  }
);

router.get('/me', requireAuth, (req: Request, res: Response) => {
  const csrfToken = ensureSessionCsrfToken(req);
  res.status(200).json({
    user: req.authUser,
    csrfToken,
  });
});

router.patch(
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
      handleAuthError(error, res, next);
    }
  }
);

export default router;
