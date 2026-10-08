import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import {
  SOCKET_EVENTS,
  type AnnouncementEventPayload,
  type ComplaintEventPayload,
  type NotificationEventPayload,
} from '@fixmycity/shared';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { verifyRealtimeToken } from '../lib/crypto.js';
import { logger } from '../lib/logger.js';

/**
 * Room layout
 *   user:<id>        private events for one account
 *   admins           administrators and super admins
 *   dept:<id>        officers of one department
 *   authenticated    every signed-in socket (public announcements)
 *
 * Payloads contain identifiers and status only. Clients refetch
 * details through the REST API, which enforces permissions.
 */

let io: Server | null = null;

export function attachRealtime(server: HttpServer) {
  io = new Server(server, {
    cors: { origin: env.webOrigins, credentials: true },
    path: '/socket.io',
    serveClient: false,
  });

  io.use(async (socket, next) => {
    try {
      const token = typeof socket.handshake.auth?.token === 'string' ? socket.handshake.auth.token : '';
      const userId = token ? verifyRealtimeToken(token) : null;
      if (!userId) return next(new Error('UNAUTHORIZED'));
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, isActive: true, memberships: { select: { departmentId: true } } },
      });
      if (!user || !user.isActive) return next(new Error('UNAUTHORIZED'));
      socket.data.user = user;
      next();
    } catch (err) {
      logger.warn({ err }, 'Socket authentication failed');
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as { id: string; role: string; memberships: { departmentId: string }[] };
    socket.join(`user:${user.id}`);
    socket.join('authenticated');
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') socket.join('admins');
    if (user.role === 'DEPARTMENT_OFFICER') {
      for (const m of user.memberships) socket.join(`dept:${m.departmentId}`);
    }
    socket.emit('ready', { userId: user.id });
  });

  return io;
}

export function connectedClientCount(): number {
  return io?.engine.clientsCount ?? 0;
}

interface ComplaintRef {
  id: string;
  trackingId: string;
  currentStatus: string;
  citizenId: string;
  assignedDepartmentId: string | null;
}

/** Broadcasts a complaint lifecycle event to everyone allowed to see that complaint. */
export function emitComplaintEvent(
  event: (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS],
  complaint: ComplaintRef,
  extraDepartmentIds: (string | null | undefined)[] = [],
) {
  if (!io) return;
  const payload: ComplaintEventPayload = {
    complaintId: complaint.id,
    trackingId: complaint.trackingId,
    status: complaint.currentStatus,
    departmentId: complaint.assignedDepartmentId,
    at: new Date().toISOString(),
  };
  const rooms = new Set<string>(['admins', `user:${complaint.citizenId}`]);
  for (const deptId of [complaint.assignedDepartmentId, ...extraDepartmentIds]) {
    if (deptId) rooms.add(`dept:${deptId}`);
  }
  io.to([...rooms]).emit(event, payload);
}

export function emitNotification(userId: string, payload: NotificationEventPayload) {
  io?.to(`user:${userId}`).emit(SOCKET_EVENTS.NOTIFICATION_CREATED, payload);
}

export function emitAnnouncement(payload: AnnouncementEventPayload) {
  io?.to('authenticated').emit(SOCKET_EVENTS.ANNOUNCEMENT_PUBLISHED, payload);
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}

/** Moves an officer's live sockets into the rooms of their current departments. */
export async function refreshUserRooms(userId: string) {
  if (!io) return;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isActive: true, memberships: { select: { departmentId: true } } },
  });
  const sockets = await io.in(`user:${userId}`).fetchSockets();
  for (const socket of sockets) {
    if (!user || !user.isActive) {
      socket.disconnect(true);
      continue;
    }
    for (const room of socket.rooms) {
      if (room.startsWith('dept:') || room === 'admins') socket.leave(room);
    }
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') socket.join('admins');
    if (user.role === 'DEPARTMENT_OFFICER') for (const m of user.memberships) socket.join(`dept:${m.departmentId}`);
  }
}

export async function closeRealtime() {
  await io?.close();
  io = null;
}
