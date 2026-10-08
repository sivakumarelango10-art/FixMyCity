import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { afterAll } from 'vitest';
import { ACCOUNTS, ensureServer, login, server } from './helpers.js';

const app = server;
afterAll(() => new Promise<void>((r) => server.close(() => r())));

describe('analytics', () => {
  it('server is listening', async () => {
    await ensureServer();
  });

  it('returns database-derived figures', async () => {
    const admin = await login(ACCOUNTS.admin);
    const res = await admin.get('/api/admin/analytics?days=30');
    expect(res.status).toBe(200);
    const a = res.body.data;
    expect(a.totals.total).toBeGreaterThan(0);
    expect(a.byStatus.reduce((s: number, x: { count: number }) => s + x.count, 0)).toBe(a.totals.total);
    expect(a.trend).toHaveLength(30);
    expect(a.departmentWorkload.length).toBe(a.activeDepartments);
    // Average is only shown with enough resolved complaints.
    if (a.resolvedSampleSize < 3) expect(a.averageResolutionHours).toBeNull();
  });
});

describe('announcements', () => {
  it('drafts are private, published notices are public, expired ones disappear', async () => {
    const admin = await login(ACCOUNTS.admin);
    const draft = await admin.post('/api/admin/announcements').send({
      title: 'Draft notice for testing',
      content: 'This draft must not be visible to the public at all.',
      category: 'GENERAL',
      status: 'DRAFT',
    });
    expect(draft.status).toBe(201);
    const publicList = async () => ((await request(app).get('/api/announcements?pageSize=50')).body.data as { id: string }[]).map((a) => a.id);
    expect(await publicList()).not.toContain(draft.body.data.id);

    const published = await admin.patch(`/api/admin/announcements/${draft.body.data.id}`).send({ status: 'PUBLISHED' });
    expect(published.status).toBe(200);
    expect(await publicList()).toContain(draft.body.data.id);

    const past = new Date(Date.now() - 60_000).toISOString();
    const expired = await admin.post('/api/admin/announcements').send({
      title: 'Expired notice for testing',
      content: 'This notice expired a minute ago and must be hidden.',
      category: 'ADVISORY',
      status: 'PUBLISHED',
      publishedAt: new Date(Date.now() - 3_600_000).toISOString(),
      expiresAt: past,
    });
    expect(expired.status).toBe(201);
    expect(await publicList()).not.toContain(expired.body.data.id);
  });

  it('validates dates and deletes drafts but archives published notices', async () => {
    const admin = await login(ACCOUNTS.admin);
    const bad = await admin.post('/api/admin/announcements').send({
      title: 'Backwards dates',
      content: 'Expiry before publication must be rejected.',
      category: 'GENERAL',
      publishedAt: '2026-10-10T10:00:00.000Z',
      expiresAt: '2026-10-09T10:00:00.000Z',
    });
    expect(bad.status).toBe(400);

    const draft = await admin.post('/api/admin/announcements').send({ title: 'Delete me draft', content: 'A draft that will be deleted outright.', category: 'GENERAL' });
    expect((await admin.del(`/api/admin/announcements/${draft.body.data.id}`)).body.data).toEqual({ deleted: true, archived: false });

    const pub = await admin.post('/api/admin/announcements').send({ title: 'Archive me notice', content: 'A published notice that will be archived.', category: 'GENERAL', status: 'PUBLISHED' });
    expect((await admin.del(`/api/admin/announcements/${pub.body.data.id}`)).body.data).toEqual({ deleted: false, archived: true });
  });

  it('citizens cannot manage announcements', async () => {
    const citizen = await login(ACCOUNTS.citizen);
    expect((await citizen.post('/api/admin/announcements').send({ title: 'Hack', content: 'Should never be allowed here.', category: 'GENERAL' })).status).toBe(403);
  });
});

describe('departments, users and audit log', () => {
  it('admin creates an officer who only sees their department', async () => {
    const admin = await login(ACCOUNTS.admin);
    const depts = (await admin.get('/api/admin/departments')).body.data as { id: string; code: string; stats: { officers: number } }[];
    const lighting = depts.find((d) => d.code === 'LIGHTING')!;
    const created = await admin.post('/api/admin/users').send({ name: 'Night Shift Officer', email: 'night.officer@example.com', password: 'abc12345', role: 'DEPARTMENT_OFFICER', departmentId: lighting.id });
    expect(created.status).toBe(201);
    const officer = await login({ email: 'night.officer@example.com', password: 'abc12345' });
    const list = (await officer.get('/api/department/complaints?pageSize=100')).body.data as { department: { code: string } | null }[];
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((c) => c.department?.code === 'LIGHTING')).toBe(true);
  });

  it('officers must belong to a department', async () => {
    const admin = await login(ACCOUNTS.admin);
    const res = await admin.post('/api/admin/users').send({ name: 'No Dept', email: 'nodept@example.com', password: 'abc12345', role: 'DEPARTMENT_OFFICER' });
    expect(res.status).toBe(400);
  });

  it('department codes are unique', async () => {
    const admin = await login(ACCOUNTS.admin);
    const res = await admin.post('/api/admin/departments').send({ name: 'Another Roads', code: 'ROADS', description: 'Duplicate code test' });
    expect(res.status).toBe(409);
  });

  it('audit log records sensitive actions without secrets', async () => {
    const admin = await login(ACCOUNTS.admin);
    const res = await admin.get('/api/admin/audit-logs?pageSize=100');
    expect(res.status).toBe(200);
    const text = JSON.stringify(res.body.data);
    expect(text).toMatch(/complaint\.assigned/);
    expect(text).toMatch(/auth\.login/);
    expect(text).not.toMatch(/passwordHash|tokenHash|Admin@2026|fmc_session/);
  });
});
