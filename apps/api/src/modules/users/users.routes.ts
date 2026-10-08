import { Router } from 'express';
import { changePasswordSchema, updateProfileSchema, uuidSchema } from '@fixmycity/shared';
import { clientIp, ok, param, parse } from '../../lib/http.js';
import { currentUser, requireAuth } from '../../middleware/auth.js';
import * as service from './users.service.js';

export const usersRouter = Router();
usersRouter.use(requireAuth);

usersRouter.patch('/me', async (req, res) => {
  const input = parse(updateProfileSchema, req.body);
  ok(res, await service.updateProfile(currentUser(req), input, clientIp(req)));
});

usersRouter.post('/me/password', async (req, res) => {
  const input = parse(changePasswordSchema, req.body);
  await service.changePassword(currentUser(req), req.session?.id, input, clientIp(req));
  ok(res, { message: 'Password updated. Other devices have been signed out.' });
});

usersRouter.get('/me/sessions', async (req, res) => {
  ok(res, await service.listSessions(currentUser(req), req.session?.id));
});

usersRouter.delete('/me/sessions/:sessionId', async (req, res) => {
  const sessionId = parse(uuidSchema, param(req, 'sessionId'));
  await service.revokeSession(currentUser(req), sessionId, clientIp(req));
  ok(res, { revoked: true });
});
