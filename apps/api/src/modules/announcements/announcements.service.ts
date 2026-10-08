import type { Announcement } from '@prisma/client';
import {
  type AnnouncementDto,
  type AnnouncementListQuery,
  type CreateAnnouncementInput,
  type PaginationMeta,
  type UpdateAnnouncementInput,
} from '@fixmycity/shared';
import { prisma, type Prisma } from '../../lib/prisma.js';
import { notFound, validationError } from '../../lib/errors.js';
import { pageMeta } from '../../lib/http.js';
import { announcementDto } from '../../lib/mappers.js';
import { audit } from '../../services/audit.js';
import { createNotifications, publishNotifications } from '../../services/notifications.js';
import { emitAnnouncement } from '../../sockets/index.js';

const authorInclude = { createdBy: { select: { id: true, name: true } } } as const;

/** Published, already live and not yet expired. */
function liveWhere(now = new Date()): Prisma.AnnouncementWhereInput {
  return {
    status: 'PUBLISHED',
    publishedAt: { lte: now },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };
}

export async function listLive(query: AnnouncementListQuery): Promise<{ data: AnnouncementDto[]; meta: PaginationMeta }> {
  const where: Prisma.AnnouncementWhereInput = {
    AND: [
      liveWhere(),
      query.category ? { category: query.category } : {},
      query.from ? { publishedAt: { gte: new Date(`${query.from}T00:00:00.000Z`) } } : {},
      query.search ? { OR: [{ title: { contains: query.search, mode: 'insensitive' } }, { content: { contains: query.search, mode: 'insensitive' } }] } : {},
    ],
  };
  const [total, rows] = await prisma.$transaction([
    prisma.announcement.count({ where }),
    prisma.announcement.findMany({
      where,
      include: authorInclude,
      orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return { data: rows.map(announcementDto), meta: pageMeta(query.page, query.pageSize, total) };
}

export async function getLive(id: string): Promise<AnnouncementDto> {
  const row = await prisma.announcement.findFirst({ where: { AND: [{ id }, liveWhere()] }, include: authorInclude });
  if (!row) throw notFound('Announcement');
  return announcementDto(row);
}

export async function latestLive(take = 3): Promise<AnnouncementDto[]> {
  const rows = await prisma.announcement.findMany({ where: liveWhere(), include: authorInclude, orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }], take });
  return rows.map(announcementDto);
}

export async function listAll(query: AnnouncementListQuery): Promise<{ data: AnnouncementDto[]; meta: PaginationMeta }> {
  const where: Prisma.AnnouncementWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.category ? { category: query.category } : {}),
    ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.announcement.count({ where }),
    prisma.announcement.findMany({ where, include: authorInclude, orderBy: [{ updatedAt: 'desc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
  ]);
  return { data: rows.map(announcementDto), meta: pageMeta(query.page, query.pageSize, total) };
}

const toDate = (v: string | null | undefined) => (v ? new Date(v) : null);

/** Broadcasts an announcement that just went live and notifies citizens about urgent ones. */
async function announceIfLive(a: Announcement, wasLive: boolean) {
  const now = new Date();
  const live = a.status === 'PUBLISHED' && !!a.publishedAt && a.publishedAt <= now && (!a.expiresAt || a.expiresAt > now);
  if (!live || wasLive) return;
  emitAnnouncement({ announcementId: a.id, title: a.title, category: a.category });
  if (a.category === 'EMERGENCY' || a.pinned) {
    const citizens = await prisma.user.findMany({ where: { role: 'CITIZEN', isActive: true }, select: { id: true }, take: 2000 });
    const notifications = await prisma.$transaction((tx) =>
      createNotifications(
        tx,
        citizens.map((c) => ({ userId: c.id, type: 'ANNOUNCEMENT' as const, title: a.title, message: a.summary ?? a.content.slice(0, 160), link: `/dashboard/announcements?open=${a.id}` })),
      ),
    );
    publishNotifications(notifications);
  }
}

function isLive(a: Announcement, now = new Date()) {
  return a.status === 'PUBLISHED' && !!a.publishedAt && a.publishedAt <= now && (!a.expiresAt || a.expiresAt > now);
}

export async function createAnnouncement(actorId: string, input: CreateAnnouncementInput, ip: string | null) {
  const publishedAt = input.status === 'PUBLISHED' ? (toDate(input.publishedAt) ?? new Date()) : toDate(input.publishedAt);
  const created = await prisma.$transaction(async (tx) => {
    const row = await tx.announcement.create({
      data: {
        title: input.title,
        summary: input.summary || null,
        content: input.content,
        category: input.category,
        status: input.status,
        pinned: input.pinned,
        publishedAt,
        expiresAt: toDate(input.expiresAt),
        createdById: actorId,
      },
      include: authorInclude,
    });
    await audit({ actorId, action: 'announcement.created', entityType: 'announcement', entityId: row.id, metadata: { title: row.title, status: row.status }, ipAddress: ip }, tx);
    return row;
  });
  await announceIfLive(created, false);
  return announcementDto(created);
}

export async function updateAnnouncement(actorId: string, id: string, input: UpdateAnnouncementInput, ip: string | null) {
  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) throw notFound('Announcement');
  const wasLive = isLive(existing);

  const nextPublishedAt =
    input.publishedAt !== undefined
      ? toDate(input.publishedAt)
      : input.status === 'PUBLISHED' && !existing.publishedAt
        ? new Date()
        : existing.publishedAt;
  const nextExpiresAt = input.expiresAt !== undefined ? toDate(input.expiresAt) : existing.expiresAt;
  if (nextPublishedAt && nextExpiresAt && nextExpiresAt <= nextPublishedAt) {
    throw validationError('Expiry must be after the publication date.', { expiresAt: 'Expiry must be after the publication date.' });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.announcement.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.summary !== undefined ? { summary: input.summary || null } : {}),
        ...(input.content !== undefined ? { content: input.content } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.pinned !== undefined ? { pinned: input.pinned } : {}),
        publishedAt: nextPublishedAt,
        expiresAt: nextExpiresAt,
      },
      include: authorInclude,
    });
    const action =
      input.status && input.status !== existing.status
        ? input.status === 'PUBLISHED'
          ? 'announcement.published'
          : input.status === 'ARCHIVED'
            ? 'announcement.archived'
            : 'announcement.unpublished'
        : 'announcement.updated';
    await audit({ actorId, action, entityType: 'announcement', entityId: id, metadata: { title: row.title, changes: Object.keys(input) }, ipAddress: ip }, tx);
    return row;
  });
  await announceIfLive(updated, wasLive);
  return announcementDto(updated);
}

/** Drafts are deleted outright; anything that was ever published is archived to keep the record. */
export async function removeAnnouncement(actorId: string, id: string, ip: string | null) {
  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) throw notFound('Announcement');
  if (existing.status === 'DRAFT' && !existing.publishedAt) {
    await prisma.$transaction(async (tx) => {
      await tx.announcement.delete({ where: { id } });
      await audit({ actorId, action: 'announcement.deleted', entityType: 'announcement', entityId: id, metadata: { title: existing.title }, ipAddress: ip }, tx);
    });
    return { deleted: true, archived: false };
  }
  await prisma.$transaction(async (tx) => {
    await tx.announcement.update({ where: { id }, data: { status: 'ARCHIVED' } });
    await audit({ actorId, action: 'announcement.archived', entityType: 'announcement', entityId: id, metadata: { title: existing.title }, ipAddress: ip }, tx);
  });
  return { deleted: false, archived: true };
}

