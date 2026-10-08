import { describe, expect, it } from 'vitest';
import { TRACKING_ID_PATTERN } from '@fixmycity/shared';
import { prisma } from '../src/lib/prisma.js';
import { ACCOUNTS, POTHOLE, jpeg, login, png, submitComplaint } from './helpers.js';

describe('complaint submission', () => {
  it('stores a complaint with photo, location, history, classification and a sequential tracking ID', async () => {
    const citizen = await login(ACCOUNTS.citizen);
    const first = await submitComplaint(citizen);
    const second = await submitComplaint(citizen, { title: 'Second pothole near MG Road junction' });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.data.trackingId).toMatch(TRACKING_ID_PATTERN);
    expect(first.body.data.trackingId).not.toBe(second.body.data.trackingId);

    const a = await prisma.complaint.findUniqueOrThrow({ where: { id: first.body.data.id }, include: { attachments: true, statusHistory: true, classifications: true } });
    const b = await prisma.complaint.findUniqueOrThrow({ where: { id: second.body.data.id } });
    expect(b.trackingNumber).toBe(a.trackingNumber + 1);
    expect(a.latitude).toBeCloseTo(12.97555, 5);
    expect(a.attachments).toHaveLength(1);
    expect(a.attachments[0]!.storageKey).toMatch(/^complaints\/[0-9a-f-]+\/[0-9a-f-]+\.webp$/);
    expect(a.statusHistory.map((h) => h.newStatus)).toEqual(['SUBMITTED']);
    expect(a.classifications[0]?.suggestedCategory).toBe('POTHOLES');
    expect(a.classifications[0]?.suggestedDepartmentCode).toBe('ROADS');
    expect(a.classifications[0]?.suggestedPriority).toBe('HIGH');
    expect(a.classifications[0]?.classificationSource).toBe('RULE_BASED');
  });

  it('accepts PNG photos and serves them back re-encoded as WebP', async () => {
    const citizen = await login(ACCOUNTS.citizen);
    let req = citizen.post('/api/complaints');
    for (const [k, v] of Object.entries({ ...POTHOLE, title: 'Pothole with PNG photo attached' })) req = req.field(k, v);
    const res = await req.attach('photos', await png(), { filename: 'photo.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    const detail = await citizen.get(`/api/complaints/${res.body.data.id}`);
    const file = await citizen.get(detail.body.data.attachments[0].url);
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toBe('image/webp');
  });

  it('requires a photo', async () => {
    const citizen = await login(ACCOUNTS.citizen);
    let req = citizen.post('/api/complaints');
    for (const [k, v] of Object.entries(POTHOLE)) req = req.field(k, v);
    const res = await req;
    expect(res.status).toBe(400);
    expect(res.body.error.fields.photos).toBeTruthy();
  });

  it('validates required fields, category and location', async () => {
    const citizen = await login(ACCOUNTS.citizen);
    const cases: [Record<string, string>, string][] = [
      [{ title: '' }, 'title'],
      [{ description: 'too short' }, 'description'],
      [{ category: 'SPACESHIPS' }, 'category'],
      [{ latitude: '' }, 'latitude'],
      [{ latitude: '123.4' }, 'latitude'],
      [{ address: '' }, 'address'],
    ];
    for (const [override, field] of cases) {
      const res = await submitComplaint(citizen, override);
      expect(res.status, `field ${field}`).toBe(400);
      expect(res.body.error.fields[field], `field ${field}`).toBeTruthy();
    }
  });

  it('rejects files that are not real images even when the MIME type claims so', async () => {
    const citizen = await login(ACCOUNTS.citizen);
    let req = citizen.post('/api/complaints');
    for (const [k, v] of Object.entries(POTHOLE)) req = req.field(k, v);
    const res = await req.attach('photos', Buffer.from('this is not an image'), { filename: 'fake.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(400);
  });

  it('rejects unsupported formats and oversized files', async () => {
    const citizen = await login(ACCOUNTS.citizen);
    let gifReq = citizen.post('/api/complaints');
    for (const [k, v] of Object.entries(POTHOLE)) gifReq = gifReq.field(k, v);
    const gif = await gifReq.attach('photos', Buffer.from('GIF89a'), { filename: 'anim.gif', contentType: 'image/gif' });
    expect(gif.status).toBe(400);

    let bigReq = citizen.post('/api/complaints');
    for (const [k, v] of Object.entries(POTHOLE)) bigReq = bigReq.field(k, v);
    const big = await bigReq.attach('photos', Buffer.alloc(6 * 1024 * 1024, 1), { filename: 'huge.jpg', contentType: 'image/jpeg' });
    expect(big.status).toBe(413);
  });

  it('only citizens can submit complaints', async () => {
    const admin = await login(ACCOUNTS.admin);
    const res = await submitComplaint(admin);
    expect(res.status).toBe(403);
  });
});

describe('complaint privacy', () => {
  it('hides one citizen\'s complaint and photo from another citizen and from unrelated officers', async () => {
    const owner = await login(ACCOUNTS.citizen);
    const created = await submitComplaint(owner, { title: 'Private pothole report for access test' });
    const id = created.body.data.id as string;
    const detail = await owner.get(`/api/complaints/${id}`);
    const photoUrl = detail.body.data.attachments[0].url as string;

    const other = await login(ACCOUNTS.citizen2);
    expect((await other.get(`/api/complaints/${id}`)).status).toBe(404);
    expect((await other.get(photoUrl)).status).toBe(404);
    const water = await login(ACCOUNTS.water);
    expect((await water.get(`/api/complaints/${id}`)).status).toBe(404);

    // The other citizen's list never includes it.
    const list = await other.get('/api/complaints?pageSize=100');
    expect((list.body.data as { id: string }[]).some((c) => c.id === id)).toBe(false);
  });

  it('public map exposes no personal data', async () => {
    const res = await (await login(ACCOUNTS.citizen2)).get('/api/public/map');
    expect(res.status).toBe(200);
    const text = JSON.stringify(res.body);
    expect(text).not.toMatch(/@demo\.fixmycity\.local|citizenId|phone|description/);
  });

  it('suggests nearby possible duplicates', async () => {
    const citizen = await login(ACCOUNTS.citizen2);
    const res = await citizen.get(`/api/complaints/nearby?latitude=12.9756&longitude=77.6069&category=POTHOLES&text=pothole%20MG%20road`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('distanceMeters');
  });

  it('jpeg helper produces a valid image', async () => {
    expect((await jpeg()).length).toBeGreaterThan(100);
  });
});
