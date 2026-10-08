import { Router } from 'express';
import { z } from 'zod';
import { complaintListQuerySchema } from '@fixmycity/shared';
import { paginated, ok, parse } from '../../lib/http.js';
import { currentUser, requireRole } from '../../middleware/auth.js';
import { departmentHistory, departmentOverview } from '../analytics/analytics.service.js';
import { listComplaints } from '../complaints/complaints.service.js';

export const departmentRouter = Router();
departmentRouter.use(requireRole('DEPARTMENT_OFFICER'));

departmentRouter.get('/overview', async (req, res) => {
  ok(res, await departmentOverview(currentUser(req)));
});

/** Assigned work. The complaint scope already limits officers to their departments. */
departmentRouter.get('/complaints', async (req, res) => {
  const query = parse(complaintListQuerySchema, req.query);
  const { data, meta } = await listComplaints(currentUser(req), query);
  paginated(res, data, meta);
});

const historyQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

departmentRouter.get('/history', async (req, res) => {
  const { page, pageSize } = parse(historyQuery, req.query);
  ok(res, await departmentHistory(currentUser(req), page, pageSize));
});
