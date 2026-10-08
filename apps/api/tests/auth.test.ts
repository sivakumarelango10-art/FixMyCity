import { describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import request from 'supertest';
import { afterAll } from 'vitest';
import { ACCOUNTS, ORIGIN, client, ensureServer, login, server } from './helpers.js';

const app = server;
afterAll(() => new Promise<void>((r) => server.close(() => r())));

describe('health endpoints', () => {
  it('server is listening', async () => {
    await ensureServer();
  });

  it('serves an informative root, liveness and readiness', async () => {
    const root = await request(app).get('/');
    expect(root.status).toBe(200);
    expect(root.body.service).toBe('FixMyCity API');
    const live = await request(app).get('/health');
    expect(live.status).toBe(200);
    expect(live.body.status).toBe('ok');
    const ready = await request(app).get('/ready');
    expect(ready.status).toBe(200);
    expect(ready.body.checks.database.ok).toBe(true);
  });
});

describe('registration', () => {
  it('creates a citizen account and ignores any attempt to self-assign a role', async () => {
    const c = await client();
    const res = await c.post('/api/auth/register').send({ name: 'Test Citizen', email: 'Test.Citizen@Example.com', password: 'abc12345', role: 'ADMIN' });
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('CITIZEN');
    expect(res.body.data.email).toBe('test.citizen@example.com');
    const me = await c.get('/api/auth/me');
    expect(me.status).toBe(200);
    // New citizens get simulated utility bills.
    const bills = await c.get('/api/utilities/bills');
    expect(bills.body.data.length).toBeGreaterThan(0);
  });

  it('stores an argon2id hash, never the password', async () => {
    const user = await prisma.user.findUnique({ where: { email: 'test.citizen@example.com' } });
    expect(user?.passwordHash.startsWith('$argon2id$')).toBe(true);
    expect(user?.passwordHash).not.toContain('abc12345');
  });

  it('rejects duplicate emails and invalid input with field messages', async () => {
    const c = await client();
    const dup = await c.post('/api/auth/register').send({ name: 'Again', email: 'test.citizen@example.com', password: 'abc12345' });
    expect(dup.status).toBe(409);
    const bad = await c.post('/api/auth/register').send({ name: 'A', email: 'not-an-email', password: 'short' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(bad.body.error.fields)).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });
});

describe('login and sessions', () => {
  it('rejects invalid credentials with a generic message', async () => {
    const c = await client();
    const wrong = await c.post('/api/auth/login').send({ email: ACCOUNTS.citizen.email, password: 'wrong-password1' });
    const unknown = await c.post('/api/auth/login').send({ email: 'nobody@example.com', password: 'whatever123' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
  });

  it('sets an HttpOnly SameSite=Lax session cookie and persists the session', async () => {
    const c = await client();
    const res = await c.post('/api/auth/login').send(ACCOUNTS.citizen);
    expect(res.status).toBe(200);
    const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    const session = cookies.find((h) => h.startsWith('fmc_session='));
    expect(session).toMatch(/HttpOnly/i);
    expect(session).toMatch(/SameSite=Lax/i);
    expect((await c.get('/api/auth/me')).body.data.email).toBe(ACCOUNTS.citizen.email);
  });

  it('logout destroys the session server-side', async () => {
    const c = await login(ACCOUNTS.citizen);
    expect((await c.post('/api/auth/logout')).status).toBe(200);
    expect((await c.get('/api/auth/me')).status).toBe(401);
  });

  it('expired sessions are rejected', async () => {
    const c = await login(ACCOUNTS.citizen2);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: ACCOUNTS.citizen2.email } });
    await prisma.session.updateMany({ where: { userId: user.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await c.get('/api/auth/me')).status).toBe(401);
  });

  it('deactivated accounts cannot sign in', async () => {
    const c = await client();
    await c.post('/api/auth/register').send({ name: 'Soon Inactive', email: 'inactive@example.com', password: 'abc12345' });
    await prisma.user.update({ where: { email: 'inactive@example.com' }, data: { isActive: false } });
    const res = await (await client()).post('/api/auth/login').send({ email: 'inactive@example.com', password: 'abc12345' });
    expect(res.status).toBe(403);
  });
});

describe('CSRF and origin protection', () => {
  it('rejects state-changing requests without the CSRF header', async () => {
    const c = await login(ACCOUNTS.citizen);
    const res = await c.agent.post('/api/notifications/read-all').set('Origin', ORIGIN);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_FAILED');
  });

  it('rejects a mismatched CSRF token', async () => {
    const c = await login(ACCOUNTS.citizen);
    const res = await c.agent.post('/api/notifications/read-all').set('Origin', ORIGIN).set('X-CSRF-Token', 'forged-token-value');
    expect(res.status).toBe(403);
  });

  it('rejects requests from a foreign origin even with a token', async () => {
    const c = await login(ACCOUNTS.citizen);
    const res = await c.agent.post('/api/notifications/read-all').set('Origin', 'https://evil.example').set('X-CSRF-Token', c.csrf);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('BAD_ORIGIN');
  });

  it('accepts legitimate requests with the token', async () => {
    const c = await login(ACCOUNTS.citizen);
    expect((await c.post('/api/notifications/read-all')).status).toBe(200);
  });
});

describe('role-based access', () => {
  it('blocks anonymous access to protected APIs', async () => {
    expect((await request(app).get('/api/complaints')).status).toBe(401);
    expect((await request(app).get('/api/admin/analytics')).status).toBe(401);
  });

  it('blocks citizens and officers from admin APIs', async () => {
    const citizen = await login(ACCOUNTS.citizen);
    const officer = await login(ACCOUNTS.roads);
    expect((await citizen.get('/api/admin/analytics')).status).toBe(403);
    expect((await officer.get('/api/admin/users')).status).toBe(403);
    expect((await citizen.get('/api/department/overview')).status).toBe(403);
  });

  it('prevents privilege escalation through user management', async () => {
    const admin = await login(ACCOUNTS.admin);
    const me = (await admin.get('/api/auth/me')).body.data;
    const self = await admin.patch(`/api/admin/users/${me.id}`).send({ role: 'CITIZEN' });
    expect(self.status).toBe(422);
    const createAdmin = await admin.post('/api/admin/users').send({ name: 'Sneaky Admin', email: 'sneaky@example.com', password: 'abc12345', role: 'ADMIN' });
    expect(createAdmin.status).toBe(403);
    const superAdmin = await login(ACCOUNTS.superAdmin);
    const allowed = await superAdmin.post('/api/admin/users').send({ name: 'New Admin', email: 'new.admin@example.com', password: 'abc12345', role: 'ADMIN' });
    expect(allowed.status).toBe(201);
  });
});
