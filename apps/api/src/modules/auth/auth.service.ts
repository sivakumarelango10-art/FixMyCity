import type { Request, Response } from 'express';
import type { RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput } from '@fixmycity/shared';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { burnPasswordCheck, hashPassword, randomToken, sha256, verifyPassword } from '../../lib/crypto.js';
import { AppError, conflict } from '../../lib/errors.js';
import { clientIp } from '../../lib/http.js';
import { SESSION_COOKIE, sessionCookieOptions, type AuthUser } from '../../middleware/auth.js';
import { setCsrfCookie } from '../../middleware/csrf.js';
import { audit } from '../../services/audit.js';
import { sendMail } from '../../services/mailer.js';
import { createNotifications } from '../../services/notifications.js';
import { provisionDemoUtilities } from '../utilities/utilities.service.js';

const userInclude = {
  memberships: { select: { departmentId: true, department: { select: { id: true, code: true, name: true } } } },
} as const;

const INVALID_LOGIN = 'The email or password is incorrect.';

/** Creates a session row and sets the HttpOnly cookie. */
async function startSession(req: Request, res: Response, userId: string) {
  const token = randomToken(32);
  await prisma.session.create({
    data: {
      tokenHash: sha256(token),
      userId,
      expiresAt: new Date(Date.now() + env.sessionTtlMs),
      userAgent: req.get('user-agent')?.slice(0, 300) ?? null,
      ipAddress: clientIp(req),
    },
  });
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions(env.sessionTtlMs));
  // Rotate the CSRF token on every sign-in.
  setCsrfCookie(res);
}

export async function register(req: Request, res: Response, input: RegisterInput): Promise<AuthUser> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict('An account with this email already exists. Try signing in instead.', 'EMAIL_TAKEN');

  const passwordHash = await hashPassword(input.password);
  // Self-registration always creates a citizen. Staff accounts are created by administrators.
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { name: input.name, email: input.email, passwordHash, phone: input.phone || null, role: 'CITIZEN' },
      include: userInclude,
    });
    await createNotifications(tx, [
      {
        userId: created.id,
        type: 'SYSTEM',
        title: 'Welcome to FixMyCity',
        message: 'Your account is ready. Report an issue, follow its progress and explore the demo utility hub.',
        link: '/dashboard',
      },
    ]);
    await audit({ actorId: created.id, action: 'auth.register', entityType: 'user', entityId: created.id, ipAddress: clientIp(req) }, tx);
    return created;
  });

  // Give new citizens a set of clearly simulated utility bills to explore.
  await provisionDemoUtilities(user.id);
  await startSession(req, res, user.id);
  return user;
}

export async function login(req: Request, res: Response, input: LoginInput): Promise<AuthUser> {
  const user = await prisma.user.findUnique({ where: { email: input.email }, include: userInclude });
  if (!user) {
    await burnPasswordCheck(input.password);
    throw new AppError(401, 'INVALID_CREDENTIALS', INVALID_LOGIN);
  }
  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) {
    await audit({ actorId: user.id, action: 'auth.login_failed', entityType: 'user', entityId: user.id, ipAddress: clientIp(req) });
    throw new AppError(401, 'INVALID_CREDENTIALS', INVALID_LOGIN);
  }
  if (!user.isActive) throw new AppError(403, 'ACCOUNT_DISABLED', 'This account has been deactivated. Contact a municipal administrator.');

  await startSession(req, res, user.id);
  await audit({ actorId: user.id, action: 'auth.login', entityType: 'user', entityId: user.id, ipAddress: clientIp(req) });
  return user;
}

export async function logout(req: Request, res: Response) {
  if (req.session) {
    await prisma.session.delete({ where: { id: req.session.id } }).catch(() => undefined);
    await audit({ actorId: req.user?.id ?? null, action: 'auth.logout', entityType: 'user', entityId: req.user?.id, ipAddress: clientIp(req) });
  }
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

const RESET_TTL_MS = 30 * 60 * 1000;

export async function forgotPassword(req: Request, input: ForgotPasswordInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // Same response whether or not the account exists, to avoid account enumeration.
  if (!user || !user.isActive) return;

  const token = randomToken(32);
  await prisma.passwordResetToken.create({
    data: { tokenHash: sha256(token), userId: user.id, expiresAt: new Date(Date.now() + RESET_TTL_MS) },
  });
  const origin = env.webOrigins[0] ?? 'http://localhost:3000';
  const link = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
  await sendMail({
    to: user.email,
    subject: 'Reset your FixMyCity password',
    text: `Hello ${user.name},\n\nUse this link within 30 minutes to choose a new password:\n${link}\n\nIf you did not request this, you can ignore this email.`,
  });
  await audit({ actorId: user.id, action: 'auth.password_reset_requested', entityType: 'user', entityId: user.id, ipAddress: clientIp(req) });
}

export async function resetPassword(req: Request, input: ResetPasswordInput) {
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(input.token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError(400, 'INVALID_TOKEN', 'This reset link is invalid or has expired. Request a new one.');
  }
  const passwordHash = await hashPassword(input.password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Signing out everywhere protects accounts after a reset.
    prisma.session.deleteMany({ where: { userId: record.userId } }),
  ]);
  await audit({ actorId: record.userId, action: 'auth.password_reset', entityType: 'user', entityId: record.userId, ipAddress: clientIp(req) });
}
