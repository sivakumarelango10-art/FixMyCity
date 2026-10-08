import { Router, type Request } from 'express';
import {
  analyticsQuerySchema,
  announcementListQuerySchema,
  assignComplaintSchema,
  auditListQuerySchema,
  complaintListQuerySchema,
  createAnnouncementSchema,
  createDepartmentSchema,
  createStaffSchema,
  REOPEN_WINDOW_DAYS,
  updateAnnouncementSchema,
  updateDepartmentSchema,
  updateStatusSchema,
  updateUserSchema,
  userListQuerySchema,
  uuidSchema,
  type SystemStatus,
} from '@fixmycity/shared';
import { env } from '../../config/env.js';
import { prisma, type Prisma } from '../../lib/prisma.js';
import { clientIp, ok, pageMeta, paginated, param, parse } from '../../lib/http.js';
import { auditDto } from '../../lib/mappers.js';
import { currentUser, requireAdmin } from '../../middleware/auth.js';
import { storage } from '../../services/storage.js';
import { connectedClientCount } from '../../sockets/index.js';
import { aiProviderStatus } from '../ai/classifier.service.js';
import * as analytics from '../analytics/analytics.service.js';
import * as announcements from '../announcements/announcements.service.js';
import * as complaints from '../complaints/complaints.service.js';
import * as workflow from '../complaints/workflow.service.js';
import * as departments from '../departments/departments.service.js';
import * as users from '../users/users.service.js';
import { adminUtilitiesRouter } from '../utilities/utilities.routes.js';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

const id = (req: Request, name = 'id') => parse(uuidSchema, param(req, name));

/* Complaints -------------------------------------------------------- */

adminRouter.get('/complaints', async (req, res) => {
  const query = parse(complaintListQuerySchema, req.query);
  const { data, meta } = await complaints.listComplaints(currentUser(req), query);
  paginated(res, data, meta);
});

adminRouter.get('/complaints/:id', async (req, res) => {
  ok(res, await complaints.getComplaintDetail(currentUser(req), id(req)));
});

adminRouter.patch('/complaints/:id/assign', async (req, res) => {
  const input = parse(assignComplaintSchema, req.body);
  const complaint = await workflow.assignComplaint(currentUser(req), id(req), input, clientIp(req));
  ok(res, { id: complaint.id, status: complaint.currentStatus, departmentId: complaint.assignedDepartmentId });
});

adminRouter.patch('/complaints/:id/status', async (req, res) => {
  const input = parse(updateStatusSchema, req.body);
  const { complaint } = await workflow.updateStatus(currentUser(req), id(req), input, clientIp(req));
  ok(res, { id: complaint.id, status: complaint.currentStatus });
});

adminRouter.post('/complaints/:id/classify', async (req, res) => {
  ok(res, await workflow.reclassify(currentUser(req), id(req), clientIp(req)), 201);
});

/* Analytics --------------------------------------------------------- */

adminRouter.get('/analytics', async (req, res) => {
  const { days } = parse(analyticsQuerySchema, req.query);
  ok(res, await analytics.adminAnalytics(days));
});

/* Departments ------------------------------------------------------- */

adminRouter.get('/departments', async (_req, res) => {
  ok(res, await departments.listDepartmentsWithStats());
});

adminRouter.post('/departments', async (req, res) => {
  const input = parse(createDepartmentSchema, req.body);
  ok(res, await departments.createDepartment(currentUser(req).id, input, clientIp(req)), 201);
});

adminRouter.patch('/departments/:id', async (req, res) => {
  const input = parse(updateDepartmentSchema, req.body);
  ok(res, await departments.updateDepartment(currentUser(req).id, id(req), input, clientIp(req)));
});

/* Users ------------------------------------------------------------- */

adminRouter.get('/users', async (req, res) => {
  const query = parse(userListQuerySchema, req.query);
  const { data, meta } = await users.listUsers(query);
  paginated(res, data, meta);
});

adminRouter.post('/users', async (req, res) => {
  const input = parse(createStaffSchema, req.body);
  ok(res, await users.createStaff(currentUser(req), input, clientIp(req)), 201);
});

adminRouter.patch('/users/:id', async (req, res) => {
  const input = parse(updateUserSchema, req.body);
  ok(res, await users.updateUser(currentUser(req), id(req), input, clientIp(req)));
});

/* Announcements ----------------------------------------------------- */

adminRouter.get('/announcements', async (req, res) => {
  const query = parse(announcementListQuerySchema, req.query);
  const { data, meta } = await announcements.listAll(query);
  paginated(res, data, meta);
});

adminRouter.post('/announcements', async (req, res) => {
  const input = parse(createAnnouncementSchema, req.body);
  ok(res, await announcements.createAnnouncement(currentUser(req).id, input, clientIp(req)), 201);
});

adminRouter.patch('/announcements/:id', async (req, res) => {
  const input = parse(updateAnnouncementSchema, req.body);
  ok(res, await announcements.updateAnnouncement(currentUser(req).id, id(req), input, clientIp(req)));
});

adminRouter.delete('/announcements/:id', async (req, res) => {
  ok(res, await announcements.removeAnnouncement(currentUser(req).id, id(req), clientIp(req)));
});

/* Utilities --------------------------------------------------------- */

adminRouter.use('/utilities', adminUtilitiesRouter);

/* Audit log --------------------------------------------------------- */

adminRouter.get('/audit-logs', async (req, res) => {
  const query = parse(auditListQuerySchema, req.query);
  const where: Prisma.AuditLogWhereInput = {
    ...(query.entityType ? { entityType: query.entityType } : {}),
    ...(query.action ? { action: { startsWith: query.action } } : {}),
    ...(query.search
      ? { OR: [{ entityId: { contains: query.search } }, { action: { contains: query.search, mode: 'insensitive' } }, { actor: { name: { contains: query.search, mode: 'insensitive' } } }] }
      : {}),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  paginated(res, rows.map(auditDto), pageMeta(query.page, query.pageSize, total));
});

/* System status ----------------------------------------------------- */

adminRouter.get('/system', async (_req, res) => {
  let dbOk = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbOk = false;
  }
  const status: SystemStatus = {
    ai: aiProviderStatus(),
    storage: { driver: storage.driver, durable: storage.durable },
    email: { configured: env.smtpEnabled },
    realtime: { connectedClients: connectedClientCount() },
    environment: env.NODE_ENV,
    reopenWindowDays: REOPEN_WINDOW_DAYS,
    database: { ok: dbOk },
  };
  ok(res, status);
});
