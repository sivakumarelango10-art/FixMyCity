import { randomUUID } from 'node:crypto';
import type { Complaint, ComplaintAttachment, Department, User } from '@prisma/client';
import {
  CATEGORY_META,
  OPEN_STATUSES,
  PRIORITY_RANK,
  SOCKET_EVENTS,
  formatTrackingId,
  haversineMeters,
  textSimilarity,
  type ComplaintDetail,
  type ComplaintListItem,
  type ComplaintListQuery,
  type CreateComplaintBody,
  type CreatedComplaint,
  type NearbyComplaint,
  type NearbyQuery,
  type PaginationMeta,
  type PublicMapComplaint,
  type PublicMapQuery,
  type PublicStats,
  type TimelineEvent,
} from '@fixmycity/shared';
import { Prisma, prisma, type Tx } from '../../lib/prisma.js';
import { notFound, validationError } from '../../lib/errors.js';
import { pageMeta } from '../../lib/http.js';
import { attachmentDto, attachmentUrl, classificationDto, departmentSummary } from '../../lib/mappers.js';
import type { AuthUser } from '../../middleware/auth.js';
import { audit } from '../../services/audit.js';
import { createNotifications, publishNotifications } from '../../services/notifications.js';
import { emitComplaintEvent } from '../../sockets/index.js';
import { storage } from '../../services/storage.js';
import { classifyComplaint } from '../ai/classifier.service.js';
import { canViewComplaint, complaintScope, permissionsFor } from './complaints.access.js';
import { attachmentKey, processImages, removeKeys, storeImages } from './media.service.js';

/* ------------------------------------------------------------------ */
/* Mapping                                                             */
/* ------------------------------------------------------------------ */

type ListRow = Complaint & {
  assignedDepartment: Pick<Department, 'id' | 'code' | 'name'> | null;
  attachments: Pick<ComplaintAttachment, 'id' | 'complaintId'>[];
  citizen?: Pick<User, 'id' | 'name'>;
};

const listInclude = {
  assignedDepartment: { select: { id: true, code: true, name: true } },
  attachments: { where: { kind: 'EVIDENCE' as const }, select: { id: true, complaintId: true }, take: 1, orderBy: { uploadedAt: 'asc' as const } },
};

export function toListItem(c: ListRow, includeCitizen = false): ComplaintListItem {
  const first = c.attachments[0];
  return {
    id: c.id,
    trackingId: c.trackingId,
    title: c.title,
    category: c.category,
    priority: c.priority,
    status: c.currentStatus,
    address: c.address,
    latitude: c.latitude,
    longitude: c.longitude,
    department: departmentSummary(c.assignedDepartment),
    thumbnailUrl: first ? attachmentUrl(first.complaintId, first.id, 'thumb') : null,
    isDemo: c.isDemo,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    ...(includeCitizen && c.citizen ? { citizen: { id: c.citizen.id, name: c.citizen.name } } : {}),
  };
}

/* ------------------------------------------------------------------ */
/* Creation                                                            */
/* ------------------------------------------------------------------ */

/** Reserves the next tracking number from the column's Postgres sequence (collision-safe). */
async function nextTrackingNumber(tx: Tx): Promise<number> {
  const rows = await tx.$queryRaw<{ value: bigint }[]>`SELECT nextval(pg_get_serial_sequence('complaints', 'trackingNumber')) AS value`;
  const value = rows[0]?.value;
  if (value === undefined) throw new Error('Could not reserve a tracking number');
  return Number(value);
}

export async function createComplaint(
  user: AuthUser,
  body: CreateComplaintBody,
  files: Express.Multer.File[],
  ip: string | null,
): Promise<CreatedComplaint> {
  if (files.length === 0) {
    throw validationError('Attach at least one photo of the issue.', { photos: 'Attach at least one photo of the issue.' });
  }

  const images = await processImages(files);
  const classification = await classifyComplaint({ title: body.title, description: body.description, category: body.category });
  const suggestedDepartment = await prisma.department.findUnique({ where: { code: classification.suggestedDepartmentCode } });

  const complaintId = randomUUID();
  const storedKeys = await storeImages(complaintId, images);

  try {
    const { complaint, classificationRow, notifications } = await prisma.$transaction(async (tx) => {
      const trackingNumber = await nextTrackingNumber(tx);
      const createdAt = new Date();
      const complaint = await tx.complaint.create({
        data: {
          id: complaintId,
          trackingNumber,
          trackingId: formatTrackingId(createdAt.getFullYear(), trackingNumber),
          citizenId: user.id,
          title: body.title,
          description: body.description,
          additionalNotes: body.additionalNotes || null,
          category: body.category,
          priority: 'MEDIUM',
          currentStatus: 'SUBMITTED',
          latitude: body.latitude,
          longitude: body.longitude,
          address: body.address,
          createdAt,
        },
      });
      await tx.complaintAttachment.createMany({
        data: images.map((img) => ({
          id: img.id,
          complaintId,
          uploadedById: user.id,
          storageKey: attachmentKey(complaintId, img.id),
          originalName: img.originalName,
          mimeType: 'image/webp',
          fileSize: img.size,
          width: img.width,
          height: img.height,
          kind: 'EVIDENCE' as const,
        })),
      });
      await tx.complaintStatusHistory.create({
        data: { complaintId, previousStatus: null, newStatus: 'SUBMITTED', changedById: user.id, reason: 'Complaint submitted by citizen.' },
      });
      const classificationRow = await tx.aIClassification.create({
        data: {
          complaintId,
          suggestedCategory: classification.suggestedCategory,
          suggestedDepartmentCode: classification.suggestedDepartmentCode,
          suggestedDepartmentId: suggestedDepartment?.id ?? null,
          suggestedPriority: classification.suggestedPriority,
          explanation: classification.fallbackReason
            ? `${classification.explanation} (Fallback used: ${classification.fallbackReason}.)`
            : classification.explanation,
          classificationSource: classification.source,
          model: classification.model,
          signals: classification.signals,
        },
        include: { suggestedDepartment: { select: { id: true, code: true, name: true } } },
      });
      const notifications = await createNotifications(tx, [
        {
          userId: user.id,
          type: 'COMPLAINT_RECEIVED',
          title: `Complaint received: ${complaint.trackingId}`,
          message: `"${complaint.title}" was saved and is waiting for review by a municipal administrator.`,
          link: `/dashboard/complaints/${complaint.id}`,
        },
      ]);
      await audit(
        {
          actorId: user.id,
          action: 'complaint.created',
          entityType: 'complaint',
          entityId: complaint.id,
          metadata: { trackingId: complaint.trackingId, category: complaint.category, classificationSource: classification.source },
          ipAddress: ip,
        },
        tx,
      );
      return { complaint, classificationRow, notifications };
    });

    // Persisted first, broadcast second.
    emitComplaintEvent(SOCKET_EVENTS.COMPLAINT_CREATED, complaint);
    publishNotifications(notifications);

    return {
      id: complaint.id,
      trackingId: complaint.trackingId,
      status: complaint.currentStatus,
      classification: classificationDto(classificationRow),
    };
  } catch (err) {
    await removeKeys(storedKeys);
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/* Lists                                                               */
/* ------------------------------------------------------------------ */

function buildFilters(query: ComplaintListQuery): Prisma.ComplaintWhereInput {
  const where: Prisma.ComplaintWhereInput = {};
  if (query.status) where.currentStatus = query.status;
  if (query.category) where.category = query.category;
  if (query.priority) where.priority = query.priority;
  if (query.departmentId) where.assignedDepartmentId = query.departmentId === 'unassigned' ? null : query.departmentId;
  if (query.from || query.to) {
    where.createdAt = {
      ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
      ...(query.to ? { lte: new Date(`${query.to}T23:59:59.999Z`) } : {}),
    };
  }
  if (query.search) {
    const term = query.search;
    where.OR = [
      { trackingId: { contains: term, mode: 'insensitive' } },
      { title: { contains: term, mode: 'insensitive' } },
      { address: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
    ];
  }
  return where;
}

function buildOrder(query: ComplaintListQuery): Prisma.ComplaintOrderByWithRelationInput[] {
  const dir = query.order;
  switch (query.sort) {
    case 'priority':
      // Enum order in Postgres matches LOW < MEDIUM < HIGH < CRITICAL.
      return [{ priority: dir }, { createdAt: 'desc' }];
    case 'trackingNumber':
      return [{ trackingNumber: dir }];
    case 'title':
      return [{ title: dir }];
    case 'updatedAt':
      return [{ updatedAt: dir }];
    default:
      return [{ createdAt: dir }];
  }
}

export async function listComplaints(
  viewer: AuthUser,
  query: ComplaintListQuery,
  extraWhere: Prisma.ComplaintWhereInput = {},
): Promise<{ data: ComplaintListItem[]; meta: PaginationMeta }> {
  const where: Prisma.ComplaintWhereInput = { AND: [complaintScope(viewer), buildFilters(query), extraWhere] };
  const staff = viewer.role !== 'CITIZEN';
  const [total, rows] = await prisma.$transaction([
    prisma.complaint.count({ where }),
    prisma.complaint.findMany({
      where,
      include: { ...listInclude, ...(staff ? { citizen: { select: { id: true, name: true } } } : {}) },
      orderBy: buildOrder(query),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return { data: rows.map((r) => toListItem(r as ListRow, staff)), meta: pageMeta(query.page, query.pageSize, total) };
}

/* ------------------------------------------------------------------ */
/* Detail & timeline                                                   */
/* ------------------------------------------------------------------ */

const actorSelect = { select: { id: true, name: true, role: true } } as const;
const deptSelect = { select: { id: true, code: true, name: true } } as const;

const detailInclude = {
  assignedDepartment: deptSelect,
  citizen: { select: { id: true, name: true, email: true, phone: true } },
  attachments: { orderBy: { uploadedAt: 'asc' as const } },
  statusHistory: { include: { changedBy: actorSelect }, orderBy: { createdAt: 'asc' as const } },
  assignments: { include: { assignedBy: actorSelect, department: deptSelect, previousDepartment: deptSelect }, orderBy: { assignedAt: 'asc' as const } },
  notes: { include: { author: actorSelect }, orderBy: { createdAt: 'asc' as const } },
  classifications: { include: { suggestedDepartment: deptSelect }, orderBy: { createdAt: 'desc' as const }, take: 1 },
  feedback: true,
} satisfies Prisma.ComplaintInclude;

type DetailRow = Prisma.ComplaintGetPayload<{ include: typeof detailInclude }>;

export function buildTimeline(c: DetailRow, staffView: boolean): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const assignmentTimes = c.assignments.map((a) => a.assignedAt.getTime());

  for (const h of c.statusHistory) {
    // An assignment already describes its own move to ASSIGNED.
    if (h.newStatus === 'ASSIGNED' && assignmentTimes.some((t) => Math.abs(t - h.createdAt.getTime()) < 5000)) continue;
    events.push({
      id: `status-${h.id}`,
      type: 'STATUS',
      createdAt: h.createdAt.toISOString(),
      actor: h.changedBy,
      fromStatus: h.previousStatus,
      toStatus: h.newStatus,
      body: h.reason,
    });
  }
  for (const a of c.assignments) {
    const matching = c.statusHistory.find((h) => h.newStatus === 'ASSIGNED' && Math.abs(h.createdAt.getTime() - a.assignedAt.getTime()) < 5000);
    events.push({
      id: `assign-${a.id}`,
      type: 'ASSIGNMENT',
      createdAt: a.assignedAt.toISOString(),
      actor: a.assignedBy,
      department: departmentSummary(a.department),
      previousDepartment: departmentSummary(a.previousDepartment),
      fromStatus: matching?.previousStatus ?? null,
      toStatus: 'ASSIGNED',
      // Assignment notes are written for the department, not the public.
      body: staffView ? a.notes : null,
    });
  }
  for (const n of c.notes) {
    if (n.visibility === 'INTERNAL' && !staffView) continue;
    events.push({ id: `note-${n.id}`, type: 'NOTE', createdAt: n.createdAt.toISOString(), actor: n.author, body: n.body, visibility: n.visibility });
  }
  if (c.feedback) {
    events.push({
      id: `feedback-${c.feedback.id}`,
      type: 'FEEDBACK',
      createdAt: c.feedback.createdAt.toISOString(),
      actor: null,
      rating: c.feedback.rating,
      body: c.feedback.comment,
    });
  }
  return events.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

async function loadDetailRow(id: string) {
  return prisma.complaint.findUnique({ where: { id }, include: detailInclude });
}

export async function getComplaintDetail(viewer: AuthUser, id: string): Promise<ComplaintDetail> {
  const c = await loadDetailRow(id);
  // Not found and not permitted look identical so IDs cannot be probed.
  if (!c || !canViewComplaint(viewer, c)) throw notFound('Complaint');

  const staffView = viewer.role !== 'CITIZEN';
  const permissions = permissionsFor(viewer, c, c.feedback);
  const evidence = c.attachments.filter((a) => a.kind === 'EVIDENCE');
  const latest = c.classifications[0];

  return {
    ...toListItem({ ...c, attachments: evidence.slice(0, 1) }, staffView),
    description: c.description,
    additionalNotes: c.additionalNotes,
    resolutionSummary: c.resolutionSummary,
    resolvedAt: c.resolvedAt?.toISOString() ?? null,
    attachments: c.attachments.map(attachmentDto),
    classification: latest ? classificationDto(latest) : null,
    timeline: buildTimeline(c, staffView),
    feedback: c.feedback ? { rating: c.feedback.rating, comment: c.feedback.comment, createdAt: c.feedback.createdAt.toISOString() } : null,
    citizenContact: permissions.canViewCitizenContact ? { name: c.citizen.name, email: c.citizen.email, phone: c.citizen.phone } : null,
    permissions,
  };
}

export async function getTimeline(viewer: AuthUser, id: string): Promise<TimelineEvent[]> {
  const c = await loadDetailRow(id);
  if (!c || !canViewComplaint(viewer, c)) throw notFound('Complaint');
  return buildTimeline(c, viewer.role !== 'CITIZEN');
}

export async function getAttachmentFile(viewer: AuthUser, complaintId: string, attachmentId: string, size?: 'thumb') {
  const attachment = await prisma.complaintAttachment.findFirst({
    where: { id: attachmentId, complaintId },
    include: { complaint: { select: { citizenId: true, assignedDepartmentId: true } } },
  });
  if (!attachment || !canViewComplaint(viewer, attachment.complaint)) throw notFound('Attachment');
  const buffer =
    (size === 'thumb' ? await storage.get(attachmentKey(complaintId, attachmentId, 'thumb')) : null) ??
    (await storage.get(attachment.storageKey));
  if (!buffer) throw notFound('Attachment file');
  return { buffer, mimeType: attachment.mimeType };
}

/* ------------------------------------------------------------------ */
/* Public-safe views                                                   */
/* ------------------------------------------------------------------ */

const publicSelect = {
  id: true,
  trackingId: true,
  title: true,
  category: true,
  currentStatus: true,
  latitude: true,
  longitude: true,
  address: true,
  createdAt: true,
  isDemo: true,
  citizenId: true,
} as const;

type PublicRow = Prisma.ComplaintGetPayload<{ select: typeof publicSelect }>;

function toPublic(c: PublicRow, viewerId: string | null): PublicMapComplaint {
  return {
    id: c.id,
    trackingId: c.trackingId,
    title: c.title,
    category: c.category,
    status: c.currentStatus,
    latitude: c.latitude,
    longitude: c.longitude,
    address: c.address,
    createdAt: c.createdAt.toISOString(),
    isDemo: c.isDemo,
    isMine: viewerId !== null && c.citizenId === viewerId,
  };
}

/** Map markers. Never includes citizen identity, contact details or notes. */
export async function publicMap(query: PublicMapQuery, viewerId: string | null): Promise<PublicMapComplaint[]> {
  const rows = await prisma.complaint.findMany({
    where: {
      isPublic: true,
      ...(query.status ? { currentStatus: query.status } : { currentStatus: { not: 'REJECTED' } }),
      ...(query.category ? { category: query.category } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
              ...(query.to ? { lte: new Date(`${query.to}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
    },
    select: publicSelect,
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  return rows.map((r) => toPublic(r, viewerId));
}

/** Possible duplicates near a location, ranked by distance, category and wording. */
export async function nearbyComplaints(query: NearbyQuery, viewerId: string | null): Promise<NearbyComplaint[]> {
  const latDelta = query.radiusMeters / 111_000;
  const lonDelta = query.radiusMeters / (111_000 * Math.max(0.2, Math.cos((query.latitude * Math.PI) / 180)));
  const recentResolved = new Date(Date.now() - 30 * 86_400_000);
  const rows = await prisma.complaint.findMany({
    where: {
      isPublic: true,
      latitude: { gte: query.latitude - latDelta, lte: query.latitude + latDelta },
      longitude: { gte: query.longitude - lonDelta, lte: query.longitude + lonDelta },
      OR: [{ currentStatus: { in: [...OPEN_STATUSES] } }, { currentStatus: 'RESOLVED', resolvedAt: { gte: recentResolved } }],
    },
    select: { ...publicSelect, description: true },
    take: 100,
  });
  const origin = { latitude: query.latitude, longitude: query.longitude };
  return rows
    .map((r) => {
      const distanceMeters = Math.round(haversineMeters(origin, r));
      const wording = query.text ? textSimilarity(query.text, `${r.title} ${r.description}`) : 0;
      const sameCategory = query.category ? r.category === query.category : false;
      const groupMatch = query.category ? CATEGORY_META[r.category].group === CATEGORY_META[query.category].group : false;
      const similarity = Math.min(1, (sameCategory ? 0.5 : groupMatch ? 0.25 : 0) + wording * 0.8 + (1 - distanceMeters / query.radiusMeters) * 0.2);
      return { ...toPublic(r, viewerId), distanceMeters, similarity: Math.round(similarity * 100) / 100 };
    })
    .filter((r) => r.distanceMeters <= query.radiusMeters && (r.similarity >= 0.35 || r.distanceMeters < 60))
    .sort((a, b) => b.similarity - a.similarity || a.distanceMeters - b.distanceMeters)
    .slice(0, 5);
}

export async function publicStats(): Promise<PublicStats> {
  const [byStatus, byCategory, departments] = await Promise.all([
    prisma.complaint.groupBy({ by: ['currentStatus'], where: { isPublic: true }, _count: { _all: true } }),
    prisma.complaint.groupBy({ by: ['category'], where: { isPublic: true }, _count: { _all: true } }),
    prisma.department.count({ where: { active: true } }),
  ]);
  const count = (s: string) => byStatus.find((b) => b.currentStatus === s)?._count._all ?? 0;
  const total = byStatus.reduce((sum, b) => sum + b._count._all, 0);
  const open = OPEN_STATUSES.reduce((sum, s) => sum + count(s), 0);
  return {
    total,
    resolved: count('RESOLVED'),
    open,
    departments,
    byCategory: byCategory.map((b) => ({ category: b.category, count: b._count._all })).sort((a, b) => b.count - a.count),
  };
}

/** Sort helper used by dashboards. */
export function byUrgency(a: { priority: keyof typeof PRIORITY_RANK; createdAt: string }, b: { priority: keyof typeof PRIORITY_RANK; createdAt: string }) {
  return PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || a.createdAt.localeCompare(b.createdAt);
}
