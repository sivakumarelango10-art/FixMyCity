import { Router } from 'express';
import { billListQuerySchema, idempotencyKeySchema, uuidSchema } from '@fixmycity/shared';
import { clientIp, ok, param, parse } from '../../lib/http.js';
import { currentUser, requireAdmin, requireCitizen } from '../../middleware/auth.js';
import { paymentLimiter } from '../../middleware/rate-limit.js';
import * as service from './utilities.service.js';

export const utilitiesRouter = Router();

utilitiesRouter.use(requireCitizen);

utilitiesRouter.get('/bills', async (req, res) => {
  const query = parse(billListQuerySchema, req.query);
  ok(res, await service.listBills(currentUser(req).id, query));
});

utilitiesRouter.get('/bills/:billId', async (req, res) => {
  const billId = parse(uuidSchema, param(req, 'billId'));
  ok(res, await service.getBill(currentUser(req).id, billId));
});

utilitiesRouter.post('/bills/:billId/demo-pay', paymentLimiter, async (req, res) => {
  const billId = parse(uuidSchema, param(req, 'billId'));
  const key = parse(idempotencyKeySchema, req.get('idempotency-key') ?? '');
  const result = await service.demoPay(currentUser(req).id, billId, key, clientIp(req));
  ok(res, result, result.replayed ? 200 : 201);
});

utilitiesRouter.get('/payment-history', async (req, res) => {
  ok(res, await service.paymentHistory(currentUser(req).id));
});

utilitiesRouter.get('/payments/:paymentId', async (req, res) => {
  const paymentId = parse(uuidSchema, param(req, 'paymentId'));
  ok(res, await service.getPayment(currentUser(req).id, paymentId));
});

export const adminUtilitiesRouter = Router();
adminUtilitiesRouter.use(requireAdmin);
adminUtilitiesRouter.get('/', async (_req, res) => {
  ok(res, await service.adminOverview());
});
