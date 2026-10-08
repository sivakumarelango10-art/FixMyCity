import type { ComplaintCategory, ComplaintStatus, Priority } from '@prisma/client';
import {
  COMPLAINT_STATUSES,
  OPEN_STATUSES,
  PRIORITIES,
  type AdminAnalytics,
  type CitizenDashboard,
  type DepartmentOverview,
  type StatusCounts,
} from '@fixmycity/shared';
import { prisma } from '../../lib/prisma.js';
import { auditDto, billDto, departmentSummary, money } from '../../lib/mappers.js';
import { departmentIdsOf, type AuthUser } from '../../middleware/auth.js';
import { latestLive } from '../announcements/announcements.service.js';
import { buildTimeline, byUrgency, toListItem } from '../complaints/complaints.service.js';

/** Averages are only shown once this many resolved complaints exist. */
const MIN_RESOLVED_FOR_AVERAGE = 3;

const listInclude = {
  assignedDepartment: { select: { id: true, code: true, name: true } },
  attachments: { where: { kind: 'EVIDENCE' as const }, select: { id: true, complaintId: true }, take: 1 },
};

function emptyCounts(): StatusCounts {
  return Object.fromEntries(COMPLAINT_STATUSES.map((s) => [s, 0])) as StatusCounts;
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ */
/* Citizen                                                             */
/* ------------------------------------------------------------------ */

export async function citizenDashboard(user: AuthUser): Promise<CitizenDashboard> {
  const now = new Date();
  const [grouped, unpaid, recent, unreadNotifications, announcements, activityRows] = await Promise.all([
    prisma.complaint.groupBy({ by: ['currentStatus'], where: { citizenId: user.id }, _count: { _all: true } }),
    prisma.utilityBill.findMany({
      where: { status: 'UNPAID', account: { citizenId: user.id } },
      include: { account: true, successfulPayment: true },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.complaint.findMany({ where: { citizenId: user.id }, include: listInclude, orderBy: { updatedAt: 'desc' }, take: 5 }),
    prisma.notification.count({ where: { userId: user.id, isRead: false } }),
    latestLive(3),
    prisma.complaint.findMany({
      where: { citizenId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 6,
      include: {
        assignedDepartment: { select: { id: true, code: true, name: true } },
        citizen: { select: { id: true, name: true, email: true, phone: true } },
        attachments: { take: 0 },
        statusHistory: { include: { changedBy: { select: { id: true, name: true, role: true } } } },
        assignments: {
          include: {
            assignedBy: { select: { id: true, name: true, role: true } },
            department: { select: { id: true, code: true, name: true } },
            previousDepartment: { select: { id: true, code: true, name: true } },
          },
        },
        notes: { where: { visibility: 'PUBLIC' }, include: { author: { select: { id: true, name: true, role: true } } } },
        classifications: { take: 0, include: { suggestedDepartment: { select: { id: true, code: true, name: true } } } },
        feedback: true,
      },
    }),
  ]);

  const counts = emptyCounts();
  for (const g of grouped) counts[g.currentStatus] = g._count._all;
  const total = grouped.reduce((s, g) => s + g._count._all, 0);

  const recentActivity = activityRows
    .flatMap((c) =>
      buildTimeline(c, false).map((event) => ({ ...event, complaint: { id: c.id, trackingId: c.trackingId, title: c.title } })),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);

  const outstanding = unpaid.reduce((s, b) => s + Number(b.amount), 0);

  return {
    counts: { ...counts, total },
    pendingBills: { count: unpaid.length, totalAmount: money(outstanding), overdue: unpaid.filter((b) => b.dueDate < now).length },
    upcomingBills: unpaid.slice(0, 4).map((b) => billDto(b, now)),
    recentComplaints: recent.map((c) => toListItem(c)),
    recentActivity,
    unreadNotifications,
    latestAnnouncements: announcements,
  };
}

/* ------------------------------------------------------------------ */
/* Department officer                                                  */
/* ------------------------------------------------------------------ */

export async function departmentOverview(user: AuthUser): Promise<DepartmentOverview> {
  const ids = departmentIdsOf(user);
  const scope = { assignedDepartmentId: { in: ids } };
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [grouped, resolvedThisMonth, urgentRows, recentRows, avgRows] = await Promise.all([
    prisma.complaint.groupBy({ by: ['currentStatus'], where: scope, _count: { _all: true } }),
    prisma.complaint.count({ where: { ...scope, currentStatus: 'RESOLVED', resolvedAt: { gte: monthStart } } }),
    prisma.complaint.findMany({
      where: { ...scope, currentStatus: { in: ['ASSIGNED', 'IN_PROGRESS', 'REOPENED'] }, priority: { in: ['HIGH', 'CRITICAL'] } },
      include: listInclude,
      take: 20,
    }),
    prisma.complaint.findMany({ where: scope, include: listInclude, orderBy: { updatedAt: 'desc' }, take: 6 }),
    ids.length
      ? prisma.$queryRaw<{ n: number; avg: number | null }[]>`
          SELECT COUNT(*)::int AS n, AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600)::float AS avg
          FROM complaints WHERE "resolvedAt" IS NOT NULL AND "assignedDepartmentId" = ANY(${ids}::uuid[])`
      : Promise.resolve([{ n: 0, avg: null }]),
  ]);
  const count = (s: ComplaintStatus) => grouped.find((g) => g.currentStatus === s)?._count._all ?? 0;
  const avg = avgRows[0];

  return {
    departments: user.memberships.map((m) => departmentSummary(m.department)!),
    counts: {
      assigned: count('ASSIGNED'),
      inProgress: count('IN_PROGRESS'),
      reopened: count('REOPENED'),
      resolvedThisMonth,
      total: grouped.reduce((s, g) => s + g._count._all, 0),
    },
    urgent: urgentRows.map((c) => toListItem(c)).sort(byUrgency).slice(0, 5),
    recent: recentRows.map((c) => toListItem(c)),
    averageResolutionHours: avg && avg.n >= MIN_RESOLVED_FOR_AVERAGE && avg.avg !== null ? Math.round(avg.avg * 10) / 10 : null,
  };
}

export async function departmentHistory(user: AuthUser, page: number, pageSize: number) {
  const ids = departmentIdsOf(user);
  const where = { assignedDepartmentId: { in: ids }, currentStatus: 'RESOLVED' as const };
  const [total, resolved, myActions] = await Promise.all([
    prisma.complaint.count({ where }),
    prisma.complaint.findMany({ where, include: listInclude, orderBy: { resolvedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.complaintStatusHistory.findMany({
      where: { changedById: user.id },
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: { complaint: { select: { id: true, trackingId: true, title: true } } },
    }),
  ]);
  return {
    resolved: resolved.map((c) => ({ ...toListItem(c), resolvedAt: c.resolvedAt?.toISOString() ?? null, resolutionSummary: c.resolutionSummary })),
    meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    myActions: myActions.map((h) => ({
      id: h.id,
      fromStatus: h.previousStatus,
      toStatus: h.newStatus,
      reason: h.reason,
      createdAt: h.createdAt.toISOString(),
      complaint: h.complaint,
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Administration                                                      */
/* ------------------------------------------------------------------ */

export async function adminAnalytics(days: number): Promise<AdminAnalytics> {
  const since = new Date(Date.now() - (days - 1) * 86_400_000);
  since.setHours(0, 0, 0, 0);

  const [byStatusRows, byCategoryRows, byPriorityRows, avgRows, submittedRows, resolvedRows, workloadRows, departments, weeklyRows, hotspotRows, recentAudit] =
    await Promise.all([
      prisma.complaint.groupBy({ by: ['currentStatus'], _count: { _all: true } }),
      prisma.complaint.groupBy({ by: ['category'], _count: { _all: true } }),
      prisma.complaint.groupBy({ by: ['priority'], _count: { _all: true } }),
      prisma.$queryRaw<{ n: number; avg: number | null }[]>`
        SELECT COUNT(*)::int AS n, AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600)::float AS avg
        FROM complaints WHERE "resolvedAt" IS NOT NULL`,
      prisma.$queryRaw<{ day: Date; n: number }[]>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::int AS n
        FROM complaints WHERE "createdAt" >= ${since} GROUP BY 1`,
      prisma.$queryRaw<{ day: Date; n: number }[]>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::int AS n
        FROM complaint_status_history WHERE "newStatus" = 'RESOLVED' AND "createdAt" >= ${since} GROUP BY 1`,
      prisma.complaint.groupBy({ by: ['assignedDepartmentId', 'currentStatus'], where: { assignedDepartmentId: { not: null } }, _count: { _all: true } }),
      prisma.department.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
      prisma.$queryRaw<{ week: Date; avg: number; n: number }[]>`
        SELECT date_trunc('week', "resolvedAt") AS week,
               AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600)::float AS avg,
               COUNT(*)::int AS n
        FROM complaints
        WHERE "resolvedAt" IS NOT NULL AND "resolvedAt" >= now() - interval '12 weeks'
        GROUP BY 1 ORDER BY 1`,
      prisma.$queryRaw<{ lat: number; lng: number; category: ComplaintCategory; n: number; address: string }[]>`
        SELECT round(latitude::numeric, 3)::float AS lat, round(longitude::numeric, 3)::float AS lng,
               category, COUNT(*)::int AS n, MIN(address) AS address
        FROM complaints GROUP BY 1, 2, 3 HAVING COUNT(*) >= 2 ORDER BY n DESC LIMIT 5`,
      prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { actor: { select: { id: true, name: true, role: true } } } }),
    ]);

  const totals = emptyCounts();
  for (const r of byStatusRows) totals[r.currentStatus] = r._count._all;
  const total = byStatusRows.reduce((s, r) => s + r._count._all, 0);
  const open = OPEN_STATUSES.reduce((s, st) => s + totals[st], 0);

  // Fill every day in range so the trend chart has no gaps.
  const submittedByDay = new Map(submittedRows.map((r) => [dayKey(new Date(r.day)), r.n]));
  const resolvedByDay = new Map(resolvedRows.map((r) => [dayKey(new Date(r.day)), r.n]));
  const trend: AdminAnalytics['trend'] = [];
  for (let i = 0; i < days; i++) {
    const key = dayKey(new Date(since.getTime() + i * 86_400_000));
    trend.push({ date: key, submitted: submittedByDay.get(key) ?? 0, resolved: resolvedByDay.get(key) ?? 0 });
  }

  const avg = avgRows[0];
  return {
    rangeDays: days,
    totals: { ...totals, total, open },
    averageResolutionHours: avg && avg.n >= MIN_RESOLVED_FOR_AVERAGE && avg.avg !== null ? Math.round(avg.avg * 10) / 10 : null,
    resolvedSampleSize: avg?.n ?? 0,
    activeDepartments: departments.length,
    byCategory: byCategoryRows.map((r) => ({ category: r.category, count: r._count._all })).sort((a, b) => b.count - a.count),
    byStatus: COMPLAINT_STATUSES.map((s) => ({ status: s, count: totals[s] })),
    byPriority: PRIORITIES.map((p) => ({ priority: p as Priority, count: byPriorityRows.find((r) => r.priority === p)?._count._all ?? 0 })),
    trend,
    departmentWorkload: departments.map((d) => {
      const rows = workloadRows.filter((w) => w.assignedDepartmentId === d.id);
      const c = (s: ComplaintStatus) => rows.filter((r) => r.currentStatus === s).reduce((sum, r) => sum + r._count._all, 0);
      return { departmentId: d.id, name: d.name, code: d.code, assigned: c('ASSIGNED') + c('REOPENED'), inProgress: c('IN_PROGRESS'), resolved: c('RESOLVED') };
    }),
    resolutionTrend: weeklyRows.map((w) => ({ week: dayKey(new Date(w.week)), averageHours: Math.round(w.avg * 10) / 10, count: w.n })),
    repeatHotspots: hotspotRows.map((h) => ({ address: h.address, category: h.category, count: h.n })),
    recentActivity: recentAudit.map(auditDto),
  };
}
