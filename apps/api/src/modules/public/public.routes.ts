import { Router } from 'express';
import { announcementListQuerySchema, publicMapQuerySchema, uuidSchema } from '@fixmycity/shared';
import { ok, paginated, param, parse } from '../../lib/http.js';
import { currentUser, requireCitizen } from '../../middleware/auth.js';
import { citizenDashboard } from '../analytics/analytics.service.js';
import * as announcements from '../announcements/announcements.service.js';
import { publicMap, publicStats } from '../complaints/complaints.service.js';
import { listPublicDepartments } from '../departments/departments.service.js';

/** Endpoints that work without signing in. They only ever return public-safe data. */
export const publicRouter = Router();

publicRouter.get('/map', async (req, res) => {
  const query = parse(publicMapQuerySchema, req.query);
  res.set('Cache-Control', 'no-store');
  ok(res, await publicMap(query, req.user?.id ?? null));
});

publicRouter.get('/stats', async (_req, res) => {
  ok(res, await publicStats());
});

export const departmentsRouter = Router();
departmentsRouter.get('/', async (_req, res) => {
  ok(res, await listPublicDepartments());
});

export const announcementsRouter = Router();
announcementsRouter.get('/', async (req, res) => {
  const query = parse(announcementListQuerySchema, req.query);
  const { data, meta } = await announcements.listLive(query);
  paginated(res, data, meta);
});
announcementsRouter.get('/:id', async (req, res) => {
  ok(res, await announcements.getLive(parse(uuidSchema, param(req, 'id'))));
});

export const dashboardRouter = Router();
dashboardRouter.get('/', requireCitizen, async (req, res) => {
  ok(res, await citizenDashboard(currentUser(req)));
});
