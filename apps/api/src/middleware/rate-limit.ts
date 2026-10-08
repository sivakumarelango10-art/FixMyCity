import type { Request } from 'express';
import { rateLimit, ipKeyGenerator, type Options } from 'express-rate-limit';
import { env } from '../config/env.js';

const json = (message: string): Partial<Options> => ({
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.isTest,
  handler: (_req, res, _next, options) => {
    res.status(options.statusCode).json({ error: { code: 'RATE_LIMITED', message } });
  },
});

const userOrIp = (req: Request) => req.user?.id ?? ipKeyGenerator(req.ip ?? '0.0.0.0');

/** Broad ceiling for the whole API. */
export const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 600,
  ...json('Too many requests. Please wait a moment and try again.'),
});

/** Login, registration and password reset. */
export const authLimiter = rateLimit({
  windowMs: 10 * 60_000,
  limit: env.isProduction ? 30 : 300,
  ...json('Too many sign-in attempts. Please wait a few minutes and try again.'),
});

/** Complaint submissions per user. */
export const complaintLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: env.isProduction ? 20 : 200,
  keyGenerator: userOrIp,
  ...json('You have submitted many reports in a short time. Please try again later.'),
});

/** AI classification calls per user. */
export const aiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 15,
  keyGenerator: userOrIp,
  ...json('Too many classification requests. Please wait a minute.'),
});

/** Demo payments per user. */
export const paymentLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  keyGenerator: userOrIp,
  ...json('Too many payment attempts. Please wait a minute.'),
});
