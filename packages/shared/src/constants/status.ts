import type { Role } from './domain';

export const COMPLAINT_STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'REJECTED',
  'REOPENED',
] as const;
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

export const STATUS_LABELS: Record<ComplaintStatus, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
  REOPENED: 'Reopened',
};

export const STATUS_DESCRIPTIONS: Record<ComplaintStatus, string> = {
  SUBMITTED: 'Received and waiting for a municipal reviewer.',
  UNDER_REVIEW: 'A municipal administrator is reviewing the report.',
  ASSIGNED: 'Routed to the responsible department.',
  IN_PROGRESS: 'The department has started work on site.',
  RESOLVED: 'The department has marked the issue as fixed.',
  REJECTED: 'Closed without action. A reason is recorded.',
  REOPENED: 'Reopened after resolution for further work.',
};

/** Statuses that count as "still open" for dashboards and workloads. */
export const OPEN_STATUSES: readonly ComplaintStatus[] = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'ASSIGNED',
  'IN_PROGRESS',
  'REOPENED',
];

/** The happy path shown as a progress rail on the tracking page. */
export const STATUS_PROGRESSION: readonly ComplaintStatus[] = ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];

/**
 * The full state machine. Every status change in the system, whoever
 * performs it, must be an edge in this graph.
 *
 * ASSIGNED is only reachable through the dedicated assignment action
 * (it needs a department), never through a bare status update.
 */
export const STATUS_TRANSITIONS: Record<ComplaintStatus, readonly ComplaintStatus[]> = {
  SUBMITTED: ['UNDER_REVIEW', 'ASSIGNED', 'REJECTED'],
  UNDER_REVIEW: ['ASSIGNED', 'REJECTED'],
  ASSIGNED: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['REOPENED'],
  REJECTED: ['UNDER_REVIEW'],
  REOPENED: ['UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS'],
};

/** Which edges each role may walk through the status-update endpoint. */
const ROLE_EDGES: Record<Role, Partial<Record<ComplaintStatus, readonly ComplaintStatus[]>>> = {
  CITIZEN: {
    RESOLVED: ['REOPENED'],
  },
  DEPARTMENT_OFFICER: {
    ASSIGNED: ['IN_PROGRESS'],
    IN_PROGRESS: ['RESOLVED'],
    REOPENED: ['IN_PROGRESS'],
  },
  ADMIN: {
    SUBMITTED: ['UNDER_REVIEW', 'REJECTED'],
    UNDER_REVIEW: ['REJECTED'],
    ASSIGNED: ['IN_PROGRESS'],
    IN_PROGRESS: ['RESOLVED'],
    RESOLVED: ['REOPENED'],
    REJECTED: ['UNDER_REVIEW'],
    REOPENED: ['UNDER_REVIEW', 'IN_PROGRESS'],
  },
  SUPER_ADMIN: {
    SUBMITTED: ['UNDER_REVIEW', 'REJECTED'],
    UNDER_REVIEW: ['REJECTED'],
    ASSIGNED: ['IN_PROGRESS'],
    IN_PROGRESS: ['RESOLVED'],
    RESOLVED: ['REOPENED'],
    REJECTED: ['UNDER_REVIEW'],
    REOPENED: ['UNDER_REVIEW', 'IN_PROGRESS'],
  },
};

/** Statuses from which an administrator may (re)assign a department. */
export const ASSIGNABLE_STATUSES: readonly ComplaintStatus[] = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'ASSIGNED',
  'IN_PROGRESS',
  'REOPENED',
];

export function isValidTransition(from: ComplaintStatus, to: ComplaintStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

/** Status changes a role may perform via the status-update action. */
export function allowedStatusUpdates(role: Role, from: ComplaintStatus): ComplaintStatus[] {
  const edges = ROLE_EDGES[role][from] ?? [];
  return edges.filter((to) => to !== 'ASSIGNED' && isValidTransition(from, to));
}

export function canUpdateStatus(role: Role, from: ComplaintStatus, to: ComplaintStatus): boolean {
  return allowedStatusUpdates(role, from).includes(to);
}

/** Transitions that must carry a written reason. */
export function statusRequiresReason(to: ComplaintStatus): boolean {
  return to === 'REJECTED' || to === 'REOPENED';
}

/** Transitions that must carry resolution details. */
export function statusRequiresResolution(to: ComplaintStatus): boolean {
  return to === 'RESOLVED';
}
