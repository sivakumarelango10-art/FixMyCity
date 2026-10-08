import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io as connect, type Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@fixmycity/shared';
import { attachRealtime, closeRealtime } from '../src/sockets/index.js';
import { ACCOUNTS, departmentId, ensureServer, login, server, submitComplaint, type Client } from './helpers.js';

let url: string;

beforeAll(async () => {
  await ensureServer();
  attachRealtime(server);
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await closeRealtime();
  await new Promise<void>((r) => server.close(() => r()));
});

async function socketFor(c: Client): Promise<{ socket: Socket; events: { name: string; payload: unknown }[] }> {
  const { body } = await c.get('/api/auth/socket-token');
  const socket = connect(url, { auth: { token: body.data.token }, transports: ['websocket'], reconnection: false });
  const events: { name: string; payload: unknown }[] = [];
  socket.onAny((name, payload) => events.push({ name, payload }));
  await new Promise<void>((resolve, reject) => {
    socket.once('ready', () => resolve());
    socket.once('connect_error', reject);
  });
  return { socket, events };
}

const settle = () => new Promise((r) => setTimeout(r, 400));

describe('realtime delivery', () => {
  it('refuses connections without a valid token', async () => {
    const socket = connect(url, { auth: { token: 'not-a-token' }, transports: ['websocket'], reconnection: false });
    const err = await new Promise<Error>((resolve) => socket.once('connect_error', resolve));
    expect(err.message).toBe('UNAUTHORIZED');
    socket.close();
  });

  it('delivers complaint events and notifications only to authorized users', async () => {
    const citizen = await login(ACCOUNTS.citizen);
    const otherCitizen = await login(ACCOUNTS.citizen2);
    const admin = await login(ACCOUNTS.admin);
    const roads = await login(ACCOUNTS.roads);
    const water = await login(ACCOUNTS.water);

    const sCitizen = await socketFor(citizen);
    const sOther = await socketFor(otherCitizen);
    const sAdmin = await socketFor(admin);
    const sRoads = await socketFor(roads);
    const sWater = await socketFor(water);

    const created = await submitComplaint(citizen, { title: 'Realtime pothole near MG Road' });
    const id = created.body.data.id as string;
    await settle();

    const createdFor = (s: { events: { name: string; payload: unknown }[] }) =>
      s.events.some((e) => e.name === SOCKET_EVENTS.COMPLAINT_CREATED && (e.payload as { complaintId: string }).complaintId === id);
    expect(createdFor(sAdmin)).toBe(true);
    expect(createdFor(sCitizen)).toBe(true);
    expect(createdFor(sOther)).toBe(false);
    expect(createdFor(sRoads)).toBe(false);
    expect(sCitizen.events.some((e) => e.name === SOCKET_EVENTS.NOTIFICATION_CREATED)).toBe(true);
    expect(sOther.events.some((e) => e.name === SOCKET_EVENTS.NOTIFICATION_CREATED)).toBe(false);

    await admin.patch(`/api/admin/complaints/${id}/assign`).send({ departmentId: await departmentId(admin, 'ROADS') });
    await settle();
    const assignedFor = (s: { events: { name: string; payload: unknown }[] }) =>
      s.events.some((e) => e.name === SOCKET_EVENTS.COMPLAINT_ASSIGNED && (e.payload as { complaintId: string }).complaintId === id);
    expect(assignedFor(sRoads)).toBe(true);
    expect(assignedFor(sCitizen)).toBe(true);
    expect(assignedFor(sWater)).toBe(false);
    expect(assignedFor(sOther)).toBe(false);

    // Payloads carry identifiers only, never complaint text or personal data.
    const payload = sRoads.events.find((e) => e.name === SOCKET_EVENTS.COMPLAINT_ASSIGNED)!.payload as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(['at', 'complaintId', 'departmentId', 'status', 'trackingId']);

    await roads.patch(`/api/complaints/${id}/status`).send({ status: 'IN_PROGRESS' });
    await settle();
    expect(sCitizen.events.some((e) => e.name === SOCKET_EVENTS.COMPLAINT_STATUS_CHANGED)).toBe(true);

    for (const s of [sCitizen, sOther, sAdmin, sRoads, sWater]) s.socket.close();
  });

  it('a reconnecting client gets a fresh token and is rejoined to its rooms', async () => {
    const citizen = await login(ACCOUNTS.citizen);
    const first = await socketFor(citizen);
    first.socket.close();
    const second = await socketFor(citizen);
    await submitComplaint(citizen, { title: 'Reconnect pothole near MG Road' });
    await settle();
    expect(second.events.some((e) => e.name === SOCKET_EVENTS.COMPLAINT_CREATED)).toBe(true);
    second.socket.close();
  });
});
