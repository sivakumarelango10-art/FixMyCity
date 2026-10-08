import { randomInt } from 'node:crypto';
import type { UtilityServiceType } from '@prisma/client';
import {
  UTILITY_LABELS,
  type AdminUtilityOverview,
  type BillDto,
  type BillListQuery,
  type DemoPaymentResult,
  type PaymentDto,
} from '@fixmycity/shared';
import { Prisma, prisma } from '../../lib/prisma.js';
import { demoReference } from '../../lib/crypto.js';
import { conflict, notFound } from '../../lib/errors.js';
import { billDto, money, paymentDto } from '../../lib/mappers.js';
import { audit } from '../../services/audit.js';
import { createNotifications, publishNotifications } from '../../services/notifications.js';
import { emitToUser } from '../../sockets/index.js';
import { SOCKET_EVENTS } from '@fixmycity/shared';

const billInclude = { account: true, successfulPayment: true } as const;

/* ------------------------------------------------------------------ */
/* Demo provisioning                                                   */
/* ------------------------------------------------------------------ */

const PREFIX: Record<UtilityServiceType, string> = {
  ELECTRICITY: 'EL',
  WATER: 'WA',
  PROPERTY_TAX: 'PT',
  WASTE_MANAGEMENT: 'WM',
};

function demoAccountNumber(type: UtilityServiceType) {
  return `DEMO-${PREFIX[type]}-${randomInt(10_000_000, 99_999_999)}`;
}

function monthLabel(d: Date) {
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function utcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day, 12, 0, 0));
}

interface BillSeed {
  billingPeriod: string;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  amount: number;
  units: number | null;
  unitLabel: string | null;
  paid: boolean;
}

/** Builds a plausible, clearly simulated bill history relative to "now". */
export function buildDemoBills(type: UtilityServiceType, now = new Date()): BillSeed[] {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const last = { start: utcDate(y, m - 1, 1), end: utcDate(y, m, 0) };
  const prev = { start: utcDate(y, m - 2, 1), end: utcDate(y, m - 1, 0) };

  switch (type) {
    case 'ELECTRICITY': {
      const u1 = randomInt(190, 340);
      const u2 = randomInt(170, 320);
      return [
        { billingPeriod: monthLabel(prev.start), periodStart: prev.start, periodEnd: prev.end, dueDate: utcDate(y, m - 1, 18), amount: Math.round(u2 * 7.35 + 120), units: u2, unitLabel: 'kWh', paid: true },
        { billingPeriod: monthLabel(last.start), periodStart: last.start, periodEnd: last.end, dueDate: utcDate(y, m, 22), amount: Math.round(u1 * 7.35 + 120), units: u1, unitLabel: 'kWh', paid: false },
      ];
    }
    case 'WATER': {
      const k1 = randomInt(11, 24);
      const k2 = randomInt(10, 22);
      return [
        { billingPeriod: monthLabel(prev.start), periodStart: prev.start, periodEnd: prev.end, dueDate: utcDate(y, m - 1, 15), amount: Math.round(k2 * 28.5 + 75), units: k2, unitLabel: 'kL', paid: true },
        // Due date already passed: shows the overdue state in the demo.
        { billingPeriod: monthLabel(last.start), periodStart: last.start, periodEnd: last.end, dueDate: utcDate(y, m, 5), amount: Math.round(k1 * 28.5 + 75), units: k1, unitLabel: 'kL', paid: false },
      ];
    }
    case 'PROPERTY_TAX': {
      const fyStart = m >= 3 ? y : y - 1;
      const half = m >= 3 && m <= 8 ? 'first half' : 'second half';
      const start = half === 'first half' ? utcDate(fyStart, 3, 1) : utcDate(fyStart, 9, 1);
      const end = half === 'first half' ? utcDate(fyStart, 8, 30) : utcDate(fyStart + 1, 2, 31);
      return [
        { billingPeriod: `FY ${fyStart}-${String(fyStart + 1).slice(2)} ${half}`, periodStart: start, periodEnd: end, dueDate: utcDate(y, m + 1, 0), amount: randomInt(36, 92) * 100 + 50, units: null, unitLabel: null, paid: false },
      ];
    }
    case 'WASTE_MANAGEMENT':
      return [
        { billingPeriod: monthLabel(last.start), periodStart: last.start, periodEnd: last.end, dueDate: utcDate(y, m, 25), amount: 200, units: null, unitLabel: null, paid: false },
      ];
  }
}

/** Gives a citizen one simulated account per utility, idempotently. */
export async function provisionDemoUtilities(citizenId: string, now = new Date()) {
  const types: UtilityServiceType[] = ['ELECTRICITY', 'WATER', 'PROPERTY_TAX', 'WASTE_MANAGEMENT'];
  for (const serviceType of types) {
    const existing = await prisma.utilityAccount.findUnique({ where: { citizenId_serviceType: { citizenId, serviceType } } });
    if (existing) continue;
    await prisma.$transaction(async (tx) => {
      const account = await tx.utilityAccount.create({
        data: { citizenId, serviceType, demoAccountNumber: demoAccountNumber(serviceType), serviceAddress: 'Demo address, Bengaluru' },
      });
      for (const seed of buildDemoBills(serviceType, now)) {
        const bill = await tx.utilityBill.create({
          data: {
            utilityAccountId: account.id,
            amount: new Prisma.Decimal(seed.amount),
            billingPeriod: seed.billingPeriod,
            periodStart: seed.periodStart,
            periodEnd: seed.periodEnd,
            dueDate: seed.dueDate,
            unitsConsumed: seed.units === null ? null : new Prisma.Decimal(seed.units),
            unitLabel: seed.unitLabel,
            status: seed.paid ? 'PAID' : 'UNPAID',
            paidAt: seed.paid ? new Date(seed.dueDate.getTime() - 3 * 86_400_000) : null,
          },
        });
        if (seed.paid) {
          await tx.demoPayment.create({
            data: {
              billId: bill.id,
              citizenId,
              amount: bill.amount,
              status: 'SUCCEEDED',
              idempotencyKey: `seed-${bill.id}`,
              referenceNumber: demoReference(),
              successfulBillId: bill.id,
              createdAt: bill.paidAt ?? undefined,
            },
          });
        }
      }
    });
  }
}

/* ------------------------------------------------------------------ */
/* Citizen queries                                                     */
/* ------------------------------------------------------------------ */

export async function listBills(citizenId: string, query: BillListQuery): Promise<BillDto[]> {
  const bills = await prisma.utilityBill.findMany({
    where: {
      account: { citizenId, ...(query.serviceType ? { serviceType: query.serviceType } : {}) },
      ...(query.status ? { status: query.status } : {}),
    },
    include: billInclude,
    orderBy: [{ status: 'desc' }, { dueDate: 'desc' }],
  });
  const now = new Date();
  return bills.map((b) => billDto(b, now));
}

export async function getBill(citizenId: string, billId: string): Promise<BillDto> {
  const bill = await prisma.utilityBill.findFirst({ where: { id: billId, account: { citizenId } }, include: billInclude });
  if (!bill) throw notFound('Bill');
  return billDto(bill);
}

export async function paymentHistory(citizenId: string): Promise<PaymentDto[]> {
  const payments = await prisma.demoPayment.findMany({
    where: { citizenId },
    include: { bill: { include: { account: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return payments.map((p) => paymentDto(p, p.bill));
}

export async function getPayment(citizenId: string, paymentId: string): Promise<PaymentDto & { bill: BillDto }> {
  const payment = await prisma.demoPayment.findFirst({
    where: { id: paymentId, citizenId },
    include: { bill: { include: billInclude } },
  });
  if (!payment) throw notFound('Payment');
  return { ...paymentDto(payment, payment.bill), bill: billDto(payment.bill) };
}

/* ------------------------------------------------------------------ */
/* Demo payment                                                        */
/* ------------------------------------------------------------------ */

async function replay(citizenId: string, billId: string, idempotencyKey: string): Promise<DemoPaymentResult | null> {
  const existing = await prisma.demoPayment.findUnique({
    where: { idempotencyKey },
    include: { bill: { include: billInclude } },
  });
  if (!existing) return null;
  if (existing.citizenId !== citizenId || existing.billId !== billId) {
    throw conflict('This idempotency key was already used for a different payment.', 'IDEMPOTENCY_KEY_REUSED');
  }
  return { payment: paymentDto(existing, existing.bill), bill: billDto(existing.bill), replayed: true };
}

/**
 * Simulates paying a bill. No money moves and no payment details are collected.
 * Safety against duplicates:
 *   1. The same Idempotency-Key replays the original result.
 *   2. The bill row is locked (SELECT ... FOR UPDATE) for the duration of the transaction.
 *   3. demo_payments.successfulBillId is UNIQUE, so the database itself refuses a second success.
 */
export async function demoPay(citizenId: string, billId: string, idempotencyKey: string, ip: string | null): Promise<DemoPaymentResult> {
  const replayed = await replay(citizenId, billId, idempotencyKey);
  if (replayed) return replayed;

  try {
    const { result, notifications } = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string; status: string }[]>`
        SELECT b.id, b.status::text AS status
        FROM utility_bills b
        JOIN utility_accounts a ON a.id = b."utilityAccountId"
        WHERE b.id = ${billId}::uuid AND a."citizenId" = ${citizenId}::uuid
        FOR UPDATE OF b`;
      const row = locked[0];
      if (!row) throw notFound('Bill');
      if (row.status === 'PAID') {
        const prior = await tx.demoPayment.findUnique({ where: { successfulBillId: billId } });
        throw conflict(
          `This bill is already paid${prior ? ` (receipt ${prior.referenceNumber})` : ''}. No new payment was created.`,
          'ALREADY_PAID',
        );
      }

      const bill = await tx.utilityBill.findUniqueOrThrow({ where: { id: billId }, include: { account: true } });
      const paidAt = new Date();
      const payment = await tx.demoPayment.create({
        data: {
          billId,
          citizenId,
          amount: bill.amount,
          status: 'SUCCEEDED',
          idempotencyKey,
          referenceNumber: demoReference(),
          successfulBillId: billId,
          createdAt: paidAt,
        },
      });
      const updated = await tx.utilityBill.update({
        where: { id: billId },
        data: { status: 'PAID', paidAt },
        include: billInclude,
      });
      const label = UTILITY_LABELS[bill.account.serviceType].label;
      const notifications = await createNotifications(tx, [
        {
          userId: citizenId,
          type: 'PAYMENT',
          title: `Demo payment recorded: ${label}`,
          message: `Simulated payment of Rs ${money(bill.amount)} for ${bill.billingPeriod}. Receipt ${payment.referenceNumber}. No real money was transferred.`,
          link: `/dashboard/utilities/${billId}`,
        },
      ]);
      await audit(
        {
          actorId: citizenId,
          action: 'utility.demo_payment',
          entityType: 'utility_bill',
          entityId: billId,
          metadata: { referenceNumber: payment.referenceNumber, amount: money(bill.amount), simulated: true },
          ipAddress: ip,
        },
        tx,
      );
      return {
        result: { payment: paymentDto(payment, updated), bill: billDto(updated), replayed: false } satisfies DemoPaymentResult,
        notifications,
      };
    });
    publishNotifications(notifications);
    emitToUser(citizenId, SOCKET_EVENTS.BILL_PAID, { billId });
    return result;
  } catch (err) {
    // A concurrent request with the same key or for the same bill won the race.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const again = await replay(citizenId, billId, idempotencyKey);
      if (again) return again;
      throw conflict('This bill is already paid. No new payment was created.', 'ALREADY_PAID');
    }
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/* Admin overview                                                      */
/* ------------------------------------------------------------------ */

export async function adminOverview(): Promise<AdminUtilityOverview> {
  const now = new Date();
  const bills = await prisma.utilityBill.findMany({ select: { status: true, amount: true, dueDate: true, account: { select: { serviceType: true } } } });
  const totals = { bills: bills.length, unpaid: 0, paid: 0, overdue: 0, collected: 0, outstanding: 0 };
  const byService = new Map<UtilityServiceType, { paid: number; unpaid: number; collected: number }>();
  for (const b of bills) {
    const amount = Number(b.amount);
    const entry = byService.get(b.account.serviceType) ?? { paid: 0, unpaid: 0, collected: 0 };
    if (b.status === 'PAID') {
      totals.paid += 1;
      totals.collected += amount;
      entry.paid += 1;
      entry.collected += amount;
    } else {
      totals.unpaid += 1;
      totals.outstanding += amount;
      entry.unpaid += 1;
      if (b.dueDate < now) totals.overdue += 1;
    }
    byService.set(b.account.serviceType, entry);
  }
  const recent = await prisma.demoPayment.findMany({
    orderBy: { createdAt: 'desc' },
    take: 15,
    include: { bill: { include: { account: true } }, citizen: { select: { id: true, name: true } } },
  });
  return {
    totals: { ...totals, collected: totals.collected.toFixed(2), outstanding: totals.outstanding.toFixed(2) },
    byService: [...byService.entries()].map(([serviceType, v]) => ({ serviceType, paid: v.paid, unpaid: v.unpaid, collected: v.collected.toFixed(2) })),
    recentPayments: recent.map((p) => ({ ...paymentDto(p, p.bill), citizen: p.citizen })),
  };
}
