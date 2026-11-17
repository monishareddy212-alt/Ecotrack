import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';

const SAFE_HTTP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function ensureSessionCsrfToken(req: Request): string {
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCsrfToken();
  }
  return req.session.csrfToken;
}

export function tokensMatch(expected: string, provided: string): boolean {
  const expectedBuf = Buffer.from(expected, 'utf8');
  const providedBuf = Buffer.from(provided, 'utf8');
  if (expectedBuf.length !== providedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

export function verifyCsrfToken(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_HTTP_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  const sessionToken = req.session?.csrfToken;
  const headerToken = req.get('x-csrf-token');
  const bodyToken =
    typeof req.body === 'object' && req.body !== null && typeof req.body._csrf === 'string'
      ? req.body._csrf
      : undefined;
  const providedToken = headerToken || bodyToken || '';

  if (!sessionToken || !providedToken || !tokensMatch(sessionToken, providedToken)) {
    res.status(403).json({
      error: 'Invalid or missing CSRF token. Refresh the page and try again.',
      code: 'CSRF_INVALID',
    });
    return;
  }

  next();
}
