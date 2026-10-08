import { createServer, type Server } from 'node:http';
import request from 'supertest';
import sharp from 'sharp';
import { createApp } from '../src/app.js';

export const app = createApp();
export const ORIGIN = 'http://localhost:3000';

/**
 * One listening HTTP server per test file. Passing the bare app to supertest
 * creates a new ephemeral server per request, which intermittently is not yet
 * listening on Windows under load.
 */
export const server: Server = createServer(app);
let listening: Promise<void> | null = null;
export function ensureServer(): Promise<void> {
  listening ??= new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  return listening;
}

export const ACCOUNTS = {
  citizen: { email: 'citizen@demo.fixmycity.local', password: 'Citizen@2026' },
  citizen2: { email: 'imran@demo.fixmycity.local', password: 'Citizen@2026' },
  admin: { email: 'admin@demo.fixmycity.local', password: 'Admin@2026' },
  superAdmin: { email: 'superadmin@demo.fixmycity.local', password: 'SuperAdmin@2026' },
  roads: { email: 'roads.officer@demo.fixmycity.local', password: 'Officer@2026' },
  water: { email: 'water.officer@demo.fixmycity.local', password: 'Officer@2026' },
} as const;

export interface Client {
  agent: ReturnType<typeof request.agent>;
  csrf: string;
  get: (path: string) => request.Test;
  post: (path: string) => request.Test;
  patch: (path: string) => request.Test;
  del: (path: string) => request.Test;
}

/** A cookie-keeping client that sends the double-submit CSRF token like the web app does. */
export async function client(): Promise<Client> {
  await ensureServer();
  const agent = request.agent(server);
  const res = await agent.get('/api/auth/csrf');
  const csrf = res.body.data.csrfToken as string;
  const withCsrf = (t: request.Test) => t.set('X-CSRF-Token', csrf).set('Origin', ORIGIN);
  return {
    agent,
    csrf,
    get: (p) => agent.get(p),
    post: (p) => withCsrf(agent.post(p)),
    patch: (p) => withCsrf(agent.patch(p)),
    del: (p) => withCsrf(agent.delete(p)),
  };
}

export async function login(account: { email: string; password: string }): Promise<Client> {
  const c = await client();
  const res = await c.post('/api/auth/login').send(account);
  if (res.status !== 200) throw new Error(`Login failed for ${account.email}: ${res.status} ${JSON.stringify(res.body)}`);
  // Login rotates the CSRF cookie; pick up the new value.
  const fresh = await c.agent.get('/api/auth/csrf');
  const csrf = fresh.body.data.csrfToken as string;
  const withCsrf = (t: request.Test) => t.set('X-CSRF-Token', csrf).set('Origin', ORIGIN);
  return { ...c, csrf, post: (p) => withCsrf(c.agent.post(p)), patch: (p) => withCsrf(c.agent.patch(p)), del: (p) => withCsrf(c.agent.delete(p)) };
}

export async function jpeg(width = 640, height = 480): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 70, g: 62, b: 55 } } }).jpeg().toBuffer();
}

export async function png(width = 320, height = 240): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 30, g: 120, b: 200 } } }).png().toBuffer();
}

export const POTHOLE = {
  title: 'Large pothole near MG Road',
  description: 'Large pothole near MG Road affecting daily commuters. Two-wheelers swerve around it.',
  category: 'POTHOLES',
  latitude: '12.97555',
  longitude: '77.60685',
  address: 'MG Road, near metro station exit B',
};

/** Submits a complaint as the given citizen and returns the API payload. */
export async function submitComplaint(c: Client, overrides: Partial<typeof POTHOLE> = {}) {
  const fields = { ...POTHOLE, ...overrides };
  let req = c.post('/api/complaints');
  for (const [k, v] of Object.entries(fields)) req = req.field(k, v);
  const res = await req.attach('photos', await jpeg(), { filename: 'pothole.jpg', contentType: 'image/jpeg' });
  return res;
}

export async function departmentId(c: Client, code: string): Promise<string> {
  const res = await c.get('/api/departments');
  const dept = (res.body.data as { id: string; code: string }[]).find((d) => d.code === code);
  if (!dept) throw new Error(`Department ${code} not found`);
  return dept.id;
}
