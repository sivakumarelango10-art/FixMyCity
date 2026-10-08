import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { ACCOUNTS, login } from './helpers.js';

const key = () => randomUUID().replace(/-/g, '');

async function unpaidBill(email: string) {
  const bill = await prisma.utilityBill.findFirst({ where: { status: 'UNPAID', account: { citizen: { email } } }, orderBy: { dueDate: 'asc' } });
  if (!bill) throw new Error('No unpaid bill in seed data');
  return bill;
}

describe('demo utility payments', () => {
  it('lists only the caller\'s own bills and hides other citizens\' bills', async () => {
    const asha = await login(ACCOUNTS.citizen);
    const imran = await login(ACCOUNTS.citizen2);
    const ashaBills = (await asha.get('/api/utilities/bills')).body.data as { id: string; isDemo: boolean }[];
    expect(ashaBills.length).toBeGreaterThan(0);
    expect(ashaBills.every((b) => b.isDemo)).toBe(true);
    expect((await imran.get(`/api/utilities/bills/${ashaBills[0]!.id}`)).status).toBe(404);
  });

  it('requires an idempotency key', async () => {
    const asha = await login(ACCOUNTS.citizen);
    const bill = await unpaidBill(ACCOUNTS.citizen.email);
    const res = await asha.post(`/api/utilities/bills/${bill.id}/demo-pay`);
    expect(res.status).toBe(400);
  });

  it('pays a bill once, replays the same key, and refuses a second payment', async () => {
    const asha = await login(ACCOUNTS.citizen);
    const bill = await unpaidBill(ACCOUNTS.citizen.email);
    const k = key();
    const first = await asha.post(`/api/utilities/bills/${bill.id}/demo-pay`).set('Idempotency-Key', k);
    expect(first.status).toBe(201);
    expect(first.body.data.replayed).toBe(false);
    expect(first.body.data.bill.status).toBe('PAID');
    expect(first.body.data.payment.referenceNumber).toMatch(/^DEMO-/);

    const replay = await asha.post(`/api/utilities/bills/${bill.id}/demo-pay`).set('Idempotency-Key', k);
    expect(replay.status).toBe(200);
    expect(replay.body.data.replayed).toBe(true);
    expect(replay.body.data.payment.id).toBe(first.body.data.payment.id);

    const again = await asha.post(`/api/utilities/bills/${bill.id}/demo-pay`).set('Idempotency-Key', key());
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('ALREADY_PAID');

    expect(await prisma.demoPayment.count({ where: { billId: bill.id, status: 'SUCCEEDED' } })).toBe(1);
    const history = (await asha.get('/api/utilities/payment-history')).body.data as { billId: string }[];
    expect(history.some((p) => p.billId === bill.id)).toBe(true);
    expect(await prisma.auditLog.count({ where: { entityId: bill.id, action: 'utility.demo_payment' } })).toBe(1);
  });

  it('concurrent payments with different keys produce exactly one success', async () => {
    const imran = await login(ACCOUNTS.citizen2);
    const bill = await unpaidBill(ACCOUNTS.citizen2.email);
    const results = await Promise.all(Array.from({ length: 6 }, () => imran.post(`/api/utilities/bills/${bill.id}/demo-pay`).set('Idempotency-Key', key())));
    const statuses = results.map((r) => r.status).sort();
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(5);
    expect(await prisma.demoPayment.count({ where: { billId: bill.id } })).toBe(1);
  });

  it('a key cannot be reused for another bill or another user', async () => {
    const asha = await login(ACCOUNTS.citizen);
    const imran = await login(ACCOUNTS.citizen2);
    const k = key();
    const ashaBill = await unpaidBill(ACCOUNTS.citizen.email);
    expect((await asha.post(`/api/utilities/bills/${ashaBill.id}/demo-pay`).set('Idempotency-Key', k)).status).toBe(201);
    const imranBill = await unpaidBill(ACCOUNTS.citizen2.email);
    const reuse = await imran.post(`/api/utilities/bills/${imranBill.id}/demo-pay`).set('Idempotency-Key', k);
    expect(reuse.status).toBe(409);
    expect(reuse.body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('cannot pay another citizen\'s bill', async () => {
    const imran = await login(ACCOUNTS.citizen2);
    const ashaBill = await unpaidBill(ACCOUNTS.citizen.email);
    expect((await imran.post(`/api/utilities/bills/${ashaBill.id}/demo-pay`).set('Idempotency-Key', key())).status).toBe(404);
    expect((await prisma.utilityBill.findUniqueOrThrow({ where: { id: ashaBill.id } })).status).toBe('UNPAID');
  });
});
