import type { NextFunction, Request, Response } from 'express';
import type { Department, Session, User } from '@prisma/client';
import type { Role } from '@fixmycity/shared';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { sha256 } from '../lib/crypto.js';
import { forbidden, unauthorized } from '../lib/errors.js';

export const SESSION_COOKIE = 'fmc_session';

export type AuthUser = User & { memberships: { departmentId: string; department: Pick<Department, 'id' | 'code' | 'name'> }[] };

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
    session?: Session;
  }
}

export function sessionCookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeMs,
  };
}

const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

/** Resolves the session cookie into req.user. Never throws for anonymous requests. */
export async function loadSession(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (!token) return next();

  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: {
      user: {
        include: { memberships: { select: { departmentId: true, department: { select: { id: true, code: true, name: true } } } } },
      },
    },
  });

  const now = new Date();
  if (!session || session.expiresAt <= now || !session.user.isActive) {
    if (session && session.expiresAt <= now) await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    return next();
  }

  // Sliding expiry: refresh when less than half of the lifetime remains.
  const remaining = session.expiresAt.getTime() - now.getTime();
  const shouldExtend = remaining < env.sessionTtlMs / 2;
  const shouldTouch = now.getTime() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS;
  if (shouldExtend || shouldTouch) {
    const expiresAt = shouldExtend ? new Date(now.getTime() + env.sessionTtlMs) : session.expiresAt;
    await prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: now, expiresAt } });
    if (shouldExtend) res.cookie(SESSION_COOKIE, token, sessionCookieOptions(env.sessionTtlMs));
  }

  const { user, ...sessionOnly } = session;
  req.user = user;
  req.session = sessionOnly;
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(unauthorized());
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}

export const requireAdmin = requireRole('ADMIN', 'SUPER_ADMIN');
export const requireStaff = requireRole('DEPARTMENT_OFFICER', 'ADMIN', 'SUPER_ADMIN');
export const requireCitizen = requireRole('CITIZEN');

/** Narrowing helper for handlers mounted behind requireAuth. */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw unauthorized();
  return req.user;
}

export function departmentIdsOf(user: AuthUser): string[] {
  return user.memberships.map((m) => m.departmentId);
}
