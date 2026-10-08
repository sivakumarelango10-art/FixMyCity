import type { Complaint, ComplaintStatus, Notification } from '@prisma/client';
import {
  ASSIGNABLE_STATUSES,
  CATEGORY_META,
  SOCKET_EVENTS,
  STATUS_LABELS,
  canUpdateStatus,
  isAdminRole,
  isValidTransition,
  statusRequiresReason,
  statusRequiresResolution,
  type AddNoteInput,
  type AssignComplaintInput,
  type ClassificationDto,
  type FeedbackInput,
  type UpdateStatusInput,
} from '@fixmycity/shared';
import { prisma, type Tx } from '../../lib/prisma.js';
import { conflict, forbidden, notFound, unprocessable, validationError } from '../../lib/errors.js';
import { classificationDto } from '../../lib/mappers.js';
import type { AuthUser } from '../../middleware/auth.js';
import { audit } from '../../services/audit.js';
import { createNotifications, publishNotifications, type NotificationInput } from '../../services/notifications.js';
import { emitComplaintEvent } from '../../sockets/index.js';
import { classifyComplaint } from '../ai/classifier.service.js';
import { canViewComplaint, isAssignedOfficer, withinReopenWindow } from './complaints.access.js';
import { attachmentKey, processImages, removeKeys, storeImages } from './media.service.js';

/** Locks the complaint row for the rest of the transaction so concurrent updates serialize. */
async function lockComplaint(tx: Tx, id: string): Promise<Complaint> {
  await tx.$queryRaw`SELECT id FROM complaints WHERE id = ${id}::uuid FOR UPDATE`;
  const complaint = await tx.complaint.findUnique({ where: { id } });
  if (!complaint) throw notFound('Complaint');
  return complaint;
}

async function officersOf(tx: Tx, departmentId: string): Promise<string[]> {
  const members = await tx.departmentMembership.findMany({
    where: { departmentId, user: { isActive: true, role: 'DEPARTMENT_OFFICER' } },
    select: { userId: true },
  });
  return members.map((m) => m.userId);
}

const citizenLink = (id: string) => `/dashboard/complaints/${id}`;
const officerLink = (id: string) => `/department/assigned/${id}`;

/* ------------------------------------------------------------------ */
/* Assignment                                                          */
/* ------------------------------------------------------------------ */

export async function assignComplaint(admin: AuthUser, id: string, input: AssignComplaintInput, ip: string | null) {
  if (!isAdminRole(admin.role)) throw forbidden();

  let previousDepartmentId: string | null = null;
  const { complaint, notifications } = await prisma.$transaction(async (tx) => {
    const current = await lockComplaint(tx, id);
    if (!ASSIGNABLE_STATUSES.includes(current.currentStatus)) {
      throw unprocessable(`A ${STATUS_LABELS[current.currentStatus].toLowerCase()} complaint cannot be assigned.`, 'INVALID_TRANSITION');
    }
    const department = await tx.department.findUnique({ where: { id: input.departmentId } });
    if (!department || !department.active) throw validationError('Choose an active department.', { departmentId: 'Choose an active department.' });
    if (current.assignedDepartmentId === department.id && current.currentStatus === 'ASSIGNED' && !input.priority && !input.category) {
      throw conflict(`This complaint is already assigned to ${department.name}.`, 'ALREADY_ASSIGNED');
    }

    previousDepartmentId = current.assignedDepartmentId;
    const reassigned = !!previousDepartmentId && previousDepartmentId !== department.id;
    const now = new Date();

    await tx.complaintAssignment.create({
      data: { complaintId: id, departmentId: department.id, previousDepartmentId, assignedById: admin.id, assignedAt: now, notes: input.notes || null },
    });
    if (current.currentStatus !== 'ASSIGNED') {
      await tx.complaintStatusHistory.create({
        data: {
          complaintId: id,
          previousStatus: current.currentStatus,
          newStatus: 'ASSIGNED',
          changedById: admin.id,
          reason: reassigned ? `Reassigned to ${department.name}.` : `Assigned to ${department.name}.`,
          createdAt: now,
        },
      });
    }
    const updated = await tx.complaint.update({
      where: { id },
      data: {
        assignedDepartmentId: department.id,
        currentStatus: 'ASSIGNED',
        ...(input.priority ? { priority: input.priority } : {}),
        ...(input.category ? { category: input.category } : {}),
      },
    });

    // Record whether the administrator followed or overrode the suggestion.
    const latest = await tx.aIClassification.findFirst({ where: { complaintId: id }, orderBy: { createdAt: 'desc' } });
    if (latest && latest.reviewOutcome === 'PENDING') {
      const followed =
        latest.suggestedDepartmentId === department.id &&
        (!input.category || input.category === latest.suggestedCategory) &&
        (!input.priority || input.priority === latest.suggestedPriority);
      await tx.aIClassification.update({
        where: { id: latest.id },
        data: { reviewOutcome: followed ? 'ACCEPTED' : 'OVERRIDDEN', reviewedById: admin.id, reviewedAt: now },
      });
    }

    const items: NotificationInput[] = [
      {
        userId: updated.citizenId,
        type: 'COMPLAINT_ASSIGNED',
        title: `${updated.trackingId} assigned to ${department.name}`,
        message: `Your complaint "${updated.title}" is now with the ${department.name}.`,
        link: citizenLink(id),
      },
      ...(await officersOf(tx, department.id)).map((userId) => ({
        userId,
        type: 'COMPLAINT_ASSIGNED' as const,
        title: `New assignment: ${updated.trackingId}`,
        message: `"${updated.title}" at ${updated.address} was assigned to your department.`,
        link: officerLink(id),
      })),
    ];
    const notifications = await createNotifications(tx, items);
    await audit(
      {
        actorId: admin.id,
        action: reassigned ? 'complaint.reassigned' : 'complaint.assigned',
        entityType: 'complaint',
        entityId: id,
        metadata: {
          trackingId: updated.trackingId,
          departmentId: department.id,
          department: department.name,
          previousDepartmentId,
          priority: updated.priority,
          category: updated.category,
          aiOutcome: latest?.reviewOutcome === 'PENDING' ? 'reviewed' : null,
        },
        ipAddress: ip,
      },
      tx,
    );
    return { complaint: updated, notifications };
  });

  emitComplaintEvent(SOCKET_EVENTS.COMPLAINT_ASSIGNED, complaint, [previousDepartmentId]);
  publishNotifications(notifications);
  return complaint;
}

/* ------------------------------------------------------------------ */
/* Status changes                                                      */
/* ------------------------------------------------------------------ */

function statusMessage(to: ComplaintStatus, title: string, reason?: string | null): string {
  switch (to) {
    case 'UNDER_REVIEW':
      return `"${title}" is being reviewed by a municipal administrator.`;
    case 'IN_PROGRESS':
      return `Work has started on "${title}".`;
    case 'RESOLVED':
      return `"${title}" was marked resolved.${reason ? ` ${reason}` : ''}`;
    case 'REJECTED':
      return `"${title}" was closed without action.${reason ? ` Reason: ${reason}` : ''}`;
    case 'REOPENED':
      return `"${title}" was reopened.${reason ? ` Reason: ${reason}` : ''}`;
    default:
      return `"${title}" is now ${STATUS_LABELS[to].toLowerCase()}.`;
  }
}

export async function updateStatus(actor: AuthUser, id: string, input: UpdateStatusInput, ip: string | null) {
  const target = input.status;
  if (target === 'ASSIGNED') {
    throw validationError('Use the assignment action to route a complaint to a department.', { status: 'Use the assignment action instead.' });
  }
  if (statusRequiresReason(target) && !input.reason?.trim()) {
    throw validationError('Add a short reason for this change.', { reason: 'A reason is required for this status.' });
  }
  if (statusRequiresResolution(target) && (input.resolutionSummary?.trim().length ?? 0) < 10) {
    throw validationError('Describe what was done to resolve the issue (at least 10 characters).', {
      resolutionSummary: 'Describe what was done to resolve the issue (at least 10 characters).',
    });
  }

  let previousStatus: ComplaintStatus = 'SUBMITTED';
  const { complaint, notifications } = await prisma.$transaction(async (tx) => {
    const current = await lockComplaint(tx, id);
    if (!canViewComplaint(actor, current)) throw notFound('Complaint');
    if (actor.role === 'DEPARTMENT_OFFICER' && !isAssignedOfficer(actor, current)) throw forbidden();
    if (actor.role === 'CITIZEN') throw forbidden('Citizens can reopen resolved complaints from the complaint page.');

    previousStatus = current.currentStatus;
    if (!isValidTransition(current.currentStatus, target)) {
      throw unprocessable(
        `A complaint cannot move from ${STATUS_LABELS[current.currentStatus]} to ${STATUS_LABELS[target]}.`,
        'INVALID_TRANSITION',
      );
    }
    if (!canUpdateStatus(actor.role, current.currentStatus, target)) {
      throw forbidden(`Your role cannot move a complaint from ${STATUS_LABELS[current.currentStatus]} to ${STATUS_LABELS[target]}.`);
    }

    const now = new Date();
    const reason = target === 'RESOLVED' ? input.resolutionSummary!.trim() : input.reason?.trim() || null;
    await tx.complaintStatusHistory.create({
      data: { complaintId: id, previousStatus: current.currentStatus, newStatus: target, changedById: actor.id, reason, createdAt: now },
    });
    const updated = await tx.complaint.update({
      where: { id },
      data: {
        currentStatus: target,
        ...(target === 'RESOLVED' ? { resolvedAt: now, resolvedById: actor.id, resolutionSummary: input.resolutionSummary!.trim() } : {}),
        ...(target === 'REOPENED' ? { resolvedAt: null, resolvedById: null, resolutionSummary: null } : {}),
      },
    });

    const items: NotificationInput[] = [
      {
        userId: updated.citizenId,
        type: target === 'RESOLVED' ? 'COMPLAINT_RESOLVED' : 'COMPLAINT_STATUS',
        title: `${updated.trackingId}: ${STATUS_LABELS[target]}`,
        message: statusMessage(target, updated.title, reason),
        link: citizenLink(id),
      },
    ];
    if (target === 'REOPENED' && updated.assignedDepartmentId) {
      for (const userId of await officersOf(tx, updated.assignedDepartmentId)) {
        items.push({ userId, type: 'COMPLAINT_STATUS', title: `Reopened: ${updated.trackingId}`, message: statusMessage(target, updated.title, reason), link: officerLink(id) });
      }
    }
    const notifications = await createNotifications(tx, items);
    await audit(
      {
        actorId: actor.id,
        action: 'complaint.status_changed',
        entityType: 'complaint',
        entityId: id,
        metadata: { trackingId: updated.trackingId, from: current.currentStatus, to: target, reason },
        ipAddress: ip,
      },
      tx,
    );
    return { complaint: updated, notifications };
  });

  emitComplaintEvent(SOCKET_EVENTS.COMPLAINT_STATUS_CHANGED, complaint);
  if (complaint.currentStatus === 'RESOLVED') emitComplaintEvent(SOCKET_EVENTS.COMPLAINT_RESOLVED, complaint);
  publishNotifications(notifications);
  return { complaint, previousStatus };
}

/** Citizen-initiated reopening within the configured window. */
export async function reopenComplaint(citizen: AuthUser, id: string, reason: string, ip: string | null) {
  const { complaint, notifications } = await prisma.$transaction(async (tx) => {
    const current = await lockComplaint(tx, id);
    if (current.citizenId !== citizen.id) throw notFound('Complaint');
    if (current.currentStatus !== 'RESOLVED') throw unprocessable('Only resolved complaints can be reopened.', 'INVALID_TRANSITION');
    if (!withinReopenWindow(current.resolvedAt)) {
      throw unprocessable('The reopening window for this complaint has closed. Please submit a new report.', 'REOPEN_WINDOW_CLOSED');
    }
    const now = new Date();
    await tx.complaintStatusHistory.create({
      data: { complaintId: id, previousStatus: 'RESOLVED', newStatus: 'REOPENED', changedById: citizen.id, reason, createdAt: now },
    });
    const updated = await tx.complaint.update({
      where: { id },
      data: { currentStatus: 'REOPENED', resolvedAt: null, resolvedById: null, resolutionSummary: null },
    });
    const items: NotificationInput[] = [
      { userId: citizen.id, type: 'COMPLAINT_STATUS', title: `${updated.trackingId}: Reopened`, message: 'Your complaint was reopened and sent back to the department.', link: citizenLink(id) },
    ];
    if (updated.assignedDepartmentId) {
      for (const userId of await officersOf(tx, updated.assignedDepartmentId)) {
        items.push({ userId, type: 'COMPLAINT_STATUS', title: `Reopened by citizen: ${updated.trackingId}`, message: `Reason: ${reason}`, link: officerLink(id) });
      }
    }
    const notifications = await createNotifications(tx, items);
    await audit({ actorId: citizen.id, action: 'complaint.reopened', entityType: 'complaint', entityId: id, metadata: { trackingId: updated.trackingId, reason }, ipAddress: ip }, tx);
    return { complaint: updated, notifications };
  });
  emitComplaintEvent(SOCKET_EVENTS.COMPLAINT_STATUS_CHANGED, complaint);
  publishNotifications(notifications);
  return complaint;
}

/* ------------------------------------------------------------------ */
/* Notes, feedback, resolution photos                                  */
/* ------------------------------------------------------------------ */

export async function addNote(actor: AuthUser, id: string, input: AddNoteInput, ip: string | null) {
  let notifications: Notification[] = [];
  const result = await prisma.$transaction(async (tx) => {
    const complaint = await tx.complaint.findUnique({ where: { id } });
    if (!complaint || !canViewComplaint(actor, complaint)) throw notFound('Complaint');
    if (!(isAdminRole(actor.role) || isAssignedOfficer(actor, complaint))) throw forbidden('Only municipal staff can add notes.');

    const note = await tx.complaintNote.create({ data: { complaintId: id, authorId: actor.id, body: input.body, visibility: input.visibility } });
    await tx.complaint.update({ where: { id }, data: { updatedAt: new Date() } });
    if (input.visibility === 'PUBLIC') {
      notifications = await createNotifications(tx, [
        {
          userId: complaint.citizenId,
          type: 'COMPLAINT_NOTE',
          title: `Update on ${complaint.trackingId}`,
          message: input.body.length > 160 ? `${input.body.slice(0, 157)}...` : input.body,
          link: citizenLink(id),
        },
      ]);
    }
    await audit(
      { actorId: actor.id, action: 'complaint.note_added', entityType: 'complaint', entityId: id, metadata: { visibility: input.visibility, trackingId: complaint.trackingId }, ipAddress: ip },
      tx,
    );
    return { note, complaint };
  });
  emitComplaintEvent(SOCKET_EVENTS.COMPLAINT_UPDATED, result.complaint);
  publishNotifications(notifications);
  return result.note;
}

export async function submitFeedback(citizen: AuthUser, id: string, input: FeedbackInput, ip: string | null) {
  const complaint = await prisma.complaint.findUnique({ where: { id }, include: { feedback: true } });
  if (!complaint || complaint.citizenId !== citizen.id) throw notFound('Complaint');
  if (complaint.currentStatus !== 'RESOLVED') throw unprocessable('Feedback can be given once a complaint is resolved.', 'INVALID_STATE');
  if (complaint.feedback) throw conflict('You have already rated this resolution.', 'FEEDBACK_EXISTS');
  const feedback = await prisma.$transaction(async (tx) => {
    const created = await tx.complaintFeedback.create({ data: { complaintId: id, citizenId: citizen.id, rating: input.rating, comment: input.comment || null } });
    await audit({ actorId: citizen.id, action: 'complaint.feedback', entityType: 'complaint', entityId: id, metadata: { rating: input.rating }, ipAddress: ip }, tx);
    return created;
  });
  emitComplaintEvent(SOCKET_EVENTS.COMPLAINT_UPDATED, complaint);
  return feedback;
}

export async function addResolutionPhotos(actor: AuthUser, id: string, files: Express.Multer.File[], ip: string | null) {
  const complaint = await prisma.complaint.findUnique({ where: { id } });
  if (!complaint || !canViewComplaint(actor, complaint)) throw notFound('Complaint');
  if (!(isAdminRole(actor.role) || isAssignedOfficer(actor, complaint))) throw forbidden('Only municipal staff can add resolution photos.');
  if (files.length === 0) throw validationError('Attach at least one photo.', { photos: 'Attach at least one photo.' });

  const images = await processImages(files);
  const keys = await storeImages(id, images);
  try {
    await prisma.$transaction(async (tx) => {
      await tx.complaintAttachment.createMany({
        data: images.map((img) => ({
          id: img.id,
          complaintId: id,
          uploadedById: actor.id,
          storageKey: attachmentKey(id, img.id),
          originalName: img.originalName,
          mimeType: 'image/webp',
          fileSize: img.size,
          width: img.width,
          height: img.height,
          kind: 'RESOLUTION' as const,
        })),
      });
      await tx.complaint.update({ where: { id }, data: { updatedAt: new Date() } });
      await audit({ actorId: actor.id, action: 'complaint.resolution_photos', entityType: 'complaint', entityId: id, metadata: { count: images.length }, ipAddress: ip }, tx);
    });
  } catch (err) {
    await removeKeys(keys);
    throw err;
  }
  emitComplaintEvent(SOCKET_EVENTS.COMPLAINT_UPDATED, complaint);
  return images.length;
}

/** Runs the classifier again (for example after an AI provider is configured). */
export async function reclassify(admin: AuthUser, id: string, ip: string | null): Promise<ClassificationDto> {
  const complaint = await prisma.complaint.findUnique({ where: { id } });
  if (!complaint) throw notFound('Complaint');
  const result = await classifyComplaint({ title: complaint.title, description: complaint.description, category: complaint.category });
  const department = await prisma.department.findUnique({ where: { code: result.suggestedDepartmentCode } });
  const row = await prisma.aIClassification.create({
    data: {
      complaintId: id,
      suggestedCategory: result.suggestedCategory,
      suggestedDepartmentCode: result.suggestedDepartmentCode,
      suggestedDepartmentId: department?.id ?? null,
      suggestedPriority: result.suggestedPriority,
      explanation: result.fallbackReason ? `${result.explanation} (Fallback used: ${result.fallbackReason}.)` : result.explanation,
      classificationSource: result.source,
      model: result.model,
      signals: result.signals,
      reviewOutcome: complaint.assignedDepartmentId ? (complaint.assignedDepartmentId === department?.id ? 'ACCEPTED' : 'OVERRIDDEN') : 'PENDING',
    },
    include: { suggestedDepartment: { select: { id: true, code: true, name: true } } },
  });
  await audit({ actorId: admin.id, action: 'complaint.reclassified', entityType: 'complaint', entityId: id, metadata: { source: result.source, category: CATEGORY_META[result.suggestedCategory].label }, ipAddress: ip });
  return classificationDto(row);
}
