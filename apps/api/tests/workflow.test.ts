import { beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { ACCOUNTS, departmentId, login, submitComplaint, type Client } from './helpers.js';

/**
 * The hackathon workflow end to end through the API:
 * citizen reports -> admin assigns -> officer works and resolves -> citizen tracks.
 */
describe('complaint lifecycle', () => {
  let citizen: Client;
  let admin: Client;
  let roads: Client;
  let water: Client;
  let complaintId: string;
  let roadsId: string;

  beforeAll(async () => {
    citizen = await login(ACCOUNTS.citizen);
    admin = await login(ACCOUNTS.admin);
    roads = await login(ACCOUNTS.roads);
    water = await login(ACCOUNTS.water);
    const res = await submitComplaint(citizen, { title: 'Lifecycle pothole near MG Road' });
    complaintId = res.body.data.id;
    roadsId = await departmentId(admin, 'ROADS');
  });

  it('new complaint shows up for administrators but not for officers yet', async () => {
    const adminList = await admin.get('/api/admin/complaints?departmentId=unassigned&pageSize=50');
    expect((adminList.body.data as { id: string }[]).some((c) => c.id === complaintId)).toBe(true);
    expect((await roads.get(`/api/complaints/${complaintId}`)).status).toBe(404);
  });

  it('citizens and officers cannot assign', async () => {
    expect((await citizen.patch(`/api/admin/complaints/${complaintId}/assign`).send({ departmentId: roadsId })).status).toBe(403);
    expect((await roads.patch(`/api/admin/complaints/${complaintId}/assign`).send({ departmentId: roadsId })).status).toBe(403);
  });

  it('admin assigns to Road Maintenance; history, review outcome, notifications and audit are recorded atomically', async () => {
    const res = await admin.patch(`/api/admin/complaints/${complaintId}/assign`).send({ departmentId: roadsId, priority: 'HIGH', notes: 'Barricade first.' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ASSIGNED');

    const c = await prisma.complaint.findUniqueOrThrow({
      where: { id: complaintId },
      include: { assignments: true, statusHistory: { orderBy: { createdAt: 'asc' } }, classifications: true },
    });
    expect(c.assignedDepartmentId).toBe(roadsId);
    expect(c.priority).toBe('HIGH');
    expect(c.assignments).toHaveLength(1);
    expect(c.statusHistory.map((h) => h.newStatus)).toEqual(['SUBMITTED', 'ASSIGNED']);
    expect(c.classifications[0]?.reviewOutcome).toBe('ACCEPTED');

    const citizenNote = await prisma.notification.findFirst({ where: { user: { email: ACCOUNTS.citizen.email }, type: 'COMPLAINT_ASSIGNED', link: { contains: complaintId } } });
    const officerNote = await prisma.notification.findFirst({ where: { user: { email: ACCOUNTS.roads.email }, type: 'COMPLAINT_ASSIGNED', link: { contains: complaintId } } });
    expect(citizenNote).toBeTruthy();
    expect(officerNote).toBeTruthy();
    expect(await prisma.auditLog.count({ where: { entityId: complaintId, action: 'complaint.assigned' } })).toBe(1);
  });

  it('assigning the same department again is refused', async () => {
    const res = await admin.patch(`/api/admin/complaints/${complaintId}/assign`).send({ departmentId: roadsId });
    expect(res.status).toBe(409);
  });

  it('only the assigned department can act on it', async () => {
    expect((await roads.get(`/api/complaints/${complaintId}`)).status).toBe(200);
    expect((await water.get(`/api/complaints/${complaintId}`)).status).toBe(404);
    expect((await water.patch(`/api/complaints/${complaintId}/status`).send({ status: 'IN_PROGRESS' })).status).toBe(404);
  });

  it('rejects invalid transitions and role-forbidden transitions', async () => {
    const skip = await roads.patch(`/api/complaints/${complaintId}/status`).send({ status: 'RESOLVED', resolutionSummary: 'Skipping the work stage entirely.' });
    expect(skip.status).toBe(422);
    const assign = await roads.patch(`/api/complaints/${complaintId}/status`).send({ status: 'ASSIGNED' });
    expect(assign.status).toBe(400);
    const citizenTry = await citizen.patch(`/api/complaints/${complaintId}/status`).send({ status: 'IN_PROGRESS' });
    expect(citizenTry.status).toBe(403);
  });

  it('officer starts work and posts a public progress note and an internal note', async () => {
    expect((await roads.patch(`/api/complaints/${complaintId}/status`).send({ status: 'IN_PROGRESS' })).status).toBe(200);
    expect((await roads.post(`/api/complaints/${complaintId}/notes`).send({ body: 'Crew on site, patching tonight.', visibility: 'PUBLIC' })).status).toBe(201);
    expect((await roads.post(`/api/complaints/${complaintId}/notes`).send({ body: 'Need extra asphalt from depot 3.', visibility: 'INTERNAL' })).status).toBe(201);
  });

  it('resolution requires details, then persists them', async () => {
    const missing = await roads.patch(`/api/complaints/${complaintId}/status`).send({ status: 'RESOLVED' });
    expect(missing.status).toBe(400);
    const ok = await roads.patch(`/api/complaints/${complaintId}/status`).send({ status: 'RESOLVED', resolutionSummary: 'Pothole filled and resurfaced with hot-mix asphalt.' });
    expect(ok.status).toBe(200);
    const c = await prisma.complaint.findUniqueOrThrow({ where: { id: complaintId } });
    expect(c.currentStatus).toBe('RESOLVED');
    expect(c.resolutionSummary).toMatch(/hot-mix/);
    expect(c.resolvedAt).toBeInstanceOf(Date);
  });

  it('citizen sees the full ordered timeline without internal notes, plus notifications', async () => {
    const res = await citizen.get(`/api/complaints/${complaintId}`);
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.status).toBe('RESOLVED');
    expect(d.resolutionSummary).toMatch(/hot-mix/);
    const types = (d.timeline as { type: string; toStatus?: string; visibility?: string; createdAt: string }[]).map((e) => e.toStatus ?? e.type);
    expect(types).toEqual(['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'NOTE', 'RESOLVED']);
    const times = (d.timeline as { createdAt: string }[]).map((e) => e.createdAt);
    expect([...times].sort()).toEqual(times);
    expect(JSON.stringify(d.timeline)).not.toMatch(/extra asphalt/);
    expect(d.permissions.canReopen).toBe(true);
    expect(d.permissions.canGiveFeedback).toBe(true);

    const staffView = await admin.get(`/api/complaints/${complaintId}`);
    expect(JSON.stringify(staffView.body.data.timeline)).toMatch(/extra asphalt/);

    const notes = await citizen.get('/api/notifications?pageSize=50');
    const titles = (notes.body.data as { title: string }[]).map((n) => n.title).join('\n');
    const tracking = d.trackingId as string;
    expect(titles).toContain(`${tracking}: Resolved`);
    expect(titles).toContain(`${tracking}: In progress`);
    expect(titles).toContain(`Update on ${tracking}`);
  });

  it('citizen rates the resolution once and can reopen it', async () => {
    expect((await citizen.post(`/api/complaints/${complaintId}/feedback`).send({ rating: 4, comment: 'Quick work' })).status).toBe(201);
    expect((await citizen.post(`/api/complaints/${complaintId}/feedback`).send({ rating: 5 })).status).toBe(409);
    const other = await login(ACCOUNTS.citizen2);
    expect((await other.post(`/api/complaints/${complaintId}/reopen`).send({ reason: 'It is broken again, please fix.' })).status).toBe(404);
    const reopen = await citizen.post(`/api/complaints/${complaintId}/reopen`).send({ reason: 'The patch washed away in the rain.' });
    expect(reopen.status).toBe(200);
    expect(reopen.body.data.status).toBe('REOPENED');
    // Officer can resume work on a reopened complaint.
    expect((await roads.patch(`/api/complaints/${complaintId}/status`).send({ status: 'IN_PROGRESS' })).status).toBe(200);
  });

  it('every status change was audited and history stayed consistent with the current status', async () => {
    const c = await prisma.complaint.findUniqueOrThrow({ where: { id: complaintId }, include: { statusHistory: { orderBy: { createdAt: 'asc' } } } });
    expect(c.statusHistory.at(-1)?.newStatus).toBe(c.currentStatus);
    for (let i = 1; i < c.statusHistory.length; i++) {
      expect(c.statusHistory[i]!.previousStatus).toBe(c.statusHistory[i - 1]!.newStatus);
    }
    const audited = await prisma.auditLog.count({ where: { entityId: complaintId, action: { in: ['complaint.status_changed', 'complaint.reopened'] } } });
    expect(audited).toBe(4);
  });

  it('concurrent status updates cannot both succeed', async () => {
    const res = await submitComplaint(citizen, { title: 'Race condition pothole report' });
    const id = res.body.data.id as string;
    await admin.patch(`/api/admin/complaints/${id}/assign`).send({ departmentId: roadsId });
    const results = await Promise.all([
      roads.patch(`/api/complaints/${id}/status`).send({ status: 'IN_PROGRESS' }),
      roads.patch(`/api/complaints/${id}/status`).send({ status: 'IN_PROGRESS' }),
      admin.patch(`/api/complaints/${id}/status`).send({ status: 'IN_PROGRESS' }),
    ]);
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    const history = await prisma.complaintStatusHistory.count({ where: { complaintId: id, newStatus: 'IN_PROGRESS' } });
    expect(history).toBe(1);
  });
});
