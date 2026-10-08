import { Router } from 'express';
import { classifyComplaintSchema } from '@fixmycity/shared';
import { ok, parse } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { aiLimiter } from '../../middleware/rate-limit.js';
import { classifyComplaint } from './classifier.service.js';

export const aiRouter = Router();

/** Preview classification for a draft complaint. Advisory only; nothing is stored. */
aiRouter.post('/classify-complaint', requireAuth, aiLimiter, async (req, res) => {
  const input = parse(classifyComplaintSchema, req.body);
  const result = await classifyComplaint(input);
  ok(res, result);
});
