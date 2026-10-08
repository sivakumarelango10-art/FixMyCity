import type { Complaint, ComplaintFeedback } from '@prisma/client';
import {
  ASSIGNABLE_STATUSES,
  REOPEN_WINDOW_DAYS,
  allowedStatusUpdates,
  isAdminRole,
  type ComplaintPermissions,
} from '@fixmycity/shared';
import type { Prisma } from '../../lib/prisma.js';
import { departmentIdsOf, type AuthUser } from '../../middleware/auth.js';

type Scoped = Pick<Complaint, 'citizenId' | 'assignedDepartmentId'>;

export function isAssignedOfficer(viewer: AuthUser, complaint: Scoped): boolean {
  return (
    viewer.role === 'DEPARTMENT_OFFICER' &&
    !!complaint.assignedDepartmentId &&
    departmentIdsOf(viewer).includes(complaint.assignedDepartmentId)
  );
}

/** Who may read a complaint: its citizen, administrators, and officers of the assigned department. */
export function canViewComplaint(viewer: AuthUser, complaint: Scoped): boolean {
  if (isAdminRole(viewer.role)) return true;
  if (viewer.role === 'CITIZEN') return complaint.citizenId === viewer.id;
  return isAssignedOfficer(viewer, complaint);
}

/** Row-level filter applied to every complaint list query. */
export function complaintScope(viewer: AuthUser): Prisma.ComplaintWhereInput {
  if (isAdminRole(viewer.role)) return {};
  if (viewer.role === 'CITIZEN') return { citizenId: viewer.id };
  const ids = departmentIdsOf(viewer);
  return { assignedDepartmentId: { in: ids.length ? ids : ['00000000-0000-0000-0000-000000000000'] } };
}

export function withinReopenWindow(resolvedAt: Date | null, now = new Date()): boolean {
  if (!resolvedAt) return false;
  return now.getTime() - resolvedAt.getTime() <= REOPEN_WINDOW_DAYS * 86_400_000;
}

export function permissionsFor(
  viewer: AuthUser,
  complaint: Pick<Complaint, 'citizenId' | 'assignedDepartmentId' | 'currentStatus' | 'resolvedAt'>,
  feedback: ComplaintFeedback | null,
): ComplaintPermissions {
  const admin = isAdminRole(viewer.role);
  const officer = isAssignedOfficer(viewer, complaint);
  const owner = viewer.role === 'CITIZEN' && complaint.citizenId === viewer.id;
  const status = complaint.currentStatus;

  return {
    allowedStatuses: admin || officer ? allowedStatusUpdates(viewer.role, status) : [],
    canAssign: admin && ASSIGNABLE_STATUSES.includes(status),
    canAddPublicNote: admin || officer,
    canAddInternalNote: admin || officer,
    canReopen: owner && status === 'RESOLVED' && withinReopenWindow(complaint.resolvedAt),
    canGiveFeedback: owner && status === 'RESOLVED' && !feedback,
    canViewCitizenContact: admin || officer,
  };
}
