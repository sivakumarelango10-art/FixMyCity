import type { Request, Response } from 'express';
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from '@fixmycity/shared';
import { ok, parse } from '../../lib/http.js';
import { signRealtimeToken } from '../../lib/crypto.js';
import { sessionUserDto } from '../../lib/mappers.js';
import { currentUser } from '../../middleware/auth.js';
import { CSRF_COOKIE, setCsrfCookie } from '../../middleware/csrf.js';
import * as service from './auth.service.js';

export async function register(req: Request, res: Response) {
  const input = parse(registerSchema, req.body);
  const user = await service.register(req, res, input);
  ok(res, sessionUserDto(user), 201);
}

export async function login(req: Request, res: Response) {
  const input = parse(loginSchema, req.body);
  const user = await service.login(req, res, input);
  ok(res, sessionUserDto(user));
}

export async function logout(req: Request, res: Response) {
  await service.logout(req, res);
  ok(res, { signedOut: true });
}

export async function me(req: Request, res: Response) {
  ok(res, sessionUserDto(currentUser(req)));
}

/** Issues (or re-issues) the double-submit CSRF cookie. */
export function csrf(req: Request, res: Response) {
  const existing = req.cookies?.[CSRF_COOKIE] as string | undefined;
  const token = existing ?? setCsrfCookie(res);
  ok(res, { csrfToken: token });
}

export function socketToken(req: Request, res: Response) {
  const user = currentUser(req);
  ok(res, { token: signRealtimeToken(user.id), expiresIn: 300 });
}

export async function forgotPassword(req: Request, res: Response) {
  const input = parse(forgotPasswordSchema, req.body);
  await service.forgotPassword(req, input);
  ok(res, { message: 'If an account exists for that email, a reset link has been sent.' });
}

export async function resetPassword(req: Request, res: Response) {
  const input = parse(resetPasswordSchema, req.body);
  await service.resetPassword(req, input);
  ok(res, { message: 'Your password has been updated. Sign in with the new password.' });
}
