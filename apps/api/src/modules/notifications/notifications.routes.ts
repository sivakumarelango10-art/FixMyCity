import { Router } from 'express';
import { notificationListQuerySchema, uuidSchema } from '@fixmycity/shared';
import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/errors.js';
import { ok, pageMeta, paginated, param, parse } from '../../lib/http.js';
import { notificationDto } from '../../lib/mappers.js';
import { currentUser, requireAuth } from '../../middleware/auth.js';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get('/', async (req, res) => {
  const user = currentUser(req);
  const query = parse(notificationListQuerySchema, req.query);
  const where = { userId: user.id, ...(query.unreadOnly ? { isRead: false } : {}) };
  const [total, unread, rows] = await prisma.$transaction([
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: user.id, isRead: false } }),
    prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
  ]);
  res.set('X-Unread-Count', String(unread));
  paginated(res, rows.map(notificationDto), pageMeta(query.page, query.pageSize, total));
});

notificationsRouter.get('/unread-count', async (req, res) => {
  const count = await prisma.notification.count({ where: { userId: currentUser(req).id, isRead: false } });
  ok(res, { count });
});

notificationsRouter.patch('/:id/read', async (req, res) => {
  const id = parse(uuidSchema, param(req, 'id'));
  const user = currentUser(req);
  // updateMany scopes the write to the caller's own notifications.
  const result = await prisma.notification.updateMany({ where: { id, userId: user.id }, data: { isRead: true, readAt: new Date() } });
  if (result.count === 0) throw notFound('Notification');
  ok(res, { id, isRead: true });
});

notificationsRouter.post('/read-all', async (req, res) => {
  const result = await prisma.notification.updateMany({
    where: { userId: currentUser(req).id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  ok(res, { updated: result.count });
});
