import rateLimit from 'express-rate-limit';

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many sign-in attempts from this IP. Please wait 15 minutes and try again.',
    code: 'RATE_LIMITED',
  },
});

export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many registration attempts from this IP. Please try again later.',
    code: 'RATE_LIMITED',
  },
});
