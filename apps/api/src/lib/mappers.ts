import type {
  AIClassification,
  Announcement,
  AuditLog,
  ComplaintAttachment,
  Department,
  DemoPayment,
  Notification,
  User,
  UtilityAccount,
  UtilityBill,
} from '@prisma/client';
import {
  UTILITY_LABELS,
  type AnnouncementDto,
  type AttachmentDto,
  type AuditLogDto,
  type BillDto,
  type ClassificationDto,
  type ComplaintCategory,
  type DepartmentCode,
  type DepartmentSummary,
  type NotificationDto,
  type PaymentDto,
  type SessionUser,
} from '@fixmycity/shared';
import type { Prisma } from '@prisma/client';

export const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
export const money = (d: Prisma.Decimal | number | null | undefined) =>
  d === null || d === undefined ? '0.00' : Number(d).toFixed(2);

export function departmentSummary(d: Pick<Department, 'id' | 'code' | 'name'> | null | undefined): DepartmentSummary | null {
  return d ? { id: d.id, code: d.code, name: d.name } : null;
}

export function sessionUserDto(
  user: User & { memberships?: { department: Pick<Department, 'id' | 'code' | 'name'> }[] },
): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    ward: user.ward,
    avatarUrl: user.avatarUrl,
    departments: (user.memberships ?? []).map((m) => departmentSummary(m.department)!),
    createdAt: user.createdAt.toISOString(),
  };
}

export function attachmentUrl(complaintId: string, attachmentId: string, size?: 'thumb') {
  return `/api/complaints/${complaintId}/attachments/${attachmentId}${size ? `?size=${size}` : ''}`;
}

export function attachmentDto(a: ComplaintAttachment): AttachmentDto {
  return {
    id: a.id,
    url: attachmentUrl(a.complaintId, a.id),
    mimeType: a.mimeType,
    fileSize: a.fileSize,
    width: a.width,
    height: a.height,
    kind: a.kind,
    uploadedAt: a.uploadedAt.toISOString(),
  };
}

export function classificationDto(
  c: AIClassification & { suggestedDepartment?: Pick<Department, 'id' | 'code' | 'name'> | null },
): ClassificationDto {
  return {
    id: c.id,
    suggestedCategory: c.suggestedCategory as ComplaintCategory,
    suggestedDepartmentCode: c.suggestedDepartmentCode as DepartmentCode,
    suggestedDepartment: departmentSummary(c.suggestedDepartment ?? null),
    suggestedPriority: c.suggestedPriority,
    explanation: c.explanation,
    source: c.classificationSource,
    model: c.model,
    signals: c.signals,
    reviewOutcome: c.reviewOutcome,
    createdAt: c.createdAt.toISOString(),
  };
}

export function notificationDto(n: Notification): NotificationDto {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    link: n.link,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  };
}

export function announcementDto(a: Announcement & { createdBy?: Pick<User, 'id' | 'name'> | null }): AnnouncementDto {
  return {
    id: a.id,
    title: a.title,
    summary: a.summary,
    content: a.content,
    category: a.category,
    status: a.status,
    publishedAt: iso(a.publishedAt),
    expiresAt: iso(a.expiresAt),
    pinned: a.pinned,
    isDemo: a.isDemo,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    author: a.createdBy ? { id: a.createdBy.id, name: a.createdBy.name } : null,
  };
}

export function auditDto(a: AuditLog & { actor?: Pick<User, 'id' | 'name' | 'role'> | null }): AuditLogDto {
  return {
    id: a.id,
    action: a.action,
    entityType: a.entityType,
    entityId: a.entityId,
    metadata: (a.metadata as Record<string, unknown> | null) ?? null,
    createdAt: a.createdAt.toISOString(),
    actor: a.actor ? { id: a.actor.id, name: a.actor.name, role: a.actor.role } : null,
  };
}

export function paymentDto(p: DemoPayment, bill: UtilityBill & { account: UtilityAccount }): PaymentDto {
  return {
    id: p.id,
    billId: p.billId,
    referenceNumber: p.referenceNumber,
    amount: money(p.amount),
    status: p.status,
    serviceType: bill.account.serviceType,
    billingPeriod: bill.billingPeriod,
    demoAccountNumber: bill.account.demoAccountNumber,
    createdAt: p.createdAt.toISOString(),
    isDemo: true,
  };
}

export function billDto(
  bill: UtilityBill & { account: UtilityAccount; successfulPayment?: DemoPayment | null },
  now = new Date(),
): BillDto {
  const labels = UTILITY_LABELS[bill.account.serviceType];
  return {
    id: bill.id,
    serviceType: bill.account.serviceType,
    serviceLabel: labels.label,
    provider: labels.provider,
    demoAccountNumber: bill.account.demoAccountNumber,
    amount: money(bill.amount),
    billingPeriod: bill.billingPeriod,
    periodStart: bill.periodStart.toISOString(),
    periodEnd: bill.periodEnd.toISOString(),
    dueDate: bill.dueDate.toISOString(),
    status: bill.status,
    isOverdue: bill.status === 'UNPAID' && bill.dueDate < now,
    unitsConsumed: bill.unitsConsumed === null ? null : money(bill.unitsConsumed),
    unitLabel: bill.unitLabel,
    paidAt: iso(bill.paidAt),
    payment: bill.successfulPayment ? paymentDto(bill.successfulPayment, bill) : null,
    isDemo: true,
  };
}
