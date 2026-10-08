import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { randomToken, safeEqual } from '../lib/crypto.js';
import { AppError } from '../lib/errors.js';

export const CSRF_COOKIE = 'fmc_csrf';
export const CSRF_HEADER = 'x-csrf-token';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function setCsrfCookie(res: Response, token = randomToken(24)) {
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false, // readable by the web app so it can echo it in a header
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge: env.sessionTtlMs,
  });
  return token;
}

/**
 * Double-submit CSRF protection combined with an Origin check.
 * Unsafe requests must echo the csrf cookie in the X-CSRF-Token header,
 * which a cross-site page cannot read or forge.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  const cookieToken = req.cookies?.[CSRF_COOKIE] as string | undefined;
  if (!cookieToken) setCsrfCookie(res);

  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get('origin');
  if (origin && !env.webOrigins.includes(origin)) {
    return next(new AppError(403, 'BAD_ORIGIN', 'Request origin is not allowed.'));
  }

  const headerToken = req.get(CSRF_HEADER);
  if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
    return next(new AppError(403, 'CSRF_FAILED', 'Your session security token is missing or expired. Refresh the page and try again.'));
  }
  next();
}
