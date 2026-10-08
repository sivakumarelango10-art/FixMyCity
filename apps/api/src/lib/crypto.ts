import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import { env } from '../config/env.js';

// Algorithm.Argon2id (a const enum, so referenced by value under isolatedModules).
const ARGON2ID = 2;

const ARGON_OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: env.isTest ? 4096 : 19456,
  timeCost: env.isTest ? 1 : 2,
  parallelism: 1,
};

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON_OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/** A dummy hash so login timing is similar whether or not the account exists. */
let dummyHash: string | null = null;
export async function burnPasswordCheck(password: string) {
  dummyHash ??= await hashPassword('timing-equalizer-password-1');
  await verifyPassword(dummyHash, password);
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Short-lived signed token used to authenticate the realtime socket. */
export function signRealtimeToken(userId: string, ttlSeconds = 300): string {
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + ttlSeconds })).toString(
    'base64url',
  );
  const sig = createHmac('sha256', env.SESSION_SECRET).update(`rt.${payload}`).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyRealtimeToken(token: string): string | null {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = createHmac('sha256', env.SESSION_SECRET).update(`rt.${payload}`).digest('base64url');
  if (!safeEqual(sig, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub?: string; exp?: number };
    if (!data.sub || !data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data.sub;
  } catch {
    return null;
  }
}

/** Human-friendly reference for demo receipts, e.g. DEMO-7KQ2-91XZ-4M3P. */
export function demoReference(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(12);
  let out = '';
  for (let i = 0; i < 12; i++) out += alphabet[bytes[i]! % alphabet.length];
  return `DEMO-${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}`;
}
