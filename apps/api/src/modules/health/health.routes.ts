import { access, constants } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { Router } from 'express';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { storage } from '../../services/storage.js';
import { aiProviderStatus } from '../ai/classifier.service.js';

const startedAt = Date.now();
const version = process.env.APP_VERSION ?? process.env.npm_package_version ?? '1.0.0';

/** Rejects if the promise does not settle in time, so a hung database reads as "not ready". */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolvePromise, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms} ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolvePromise(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

function getDatabaseHostInfo(): { provider: 'supabase' | 'local' | 'other'; host: string; helpMessage?: string } {
  try {
    const url = new URL(env.DATABASE_URL);
    const host = url.hostname;
    const isSupabase = host.includes('supabase.co') || host.includes('supabase.com');
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    const hasPlaceholderPassword = env.DATABASE_URL.includes('[YOUR-PASSWORD]') || env.DATABASE_URL.includes('YOUR-PASSWORD');

    let helpMessage: string | undefined;
    if (hasPlaceholderPassword) {
      helpMessage = 'DATABASE_URL still contains [YOUR-PASSWORD]. Replace with your Supabase database password or run npm run db:help.';
    } else if (isSupabase) {
      helpMessage = 'Connected to Supabase PostgreSQL cloud database.';
    } else if (isLocal) {
      helpMessage = 'Connected to local PostgreSQL database on port ' + (url.port || '5432') + '.';
    }

    return {
      provider: isSupabase ? 'supabase' : isLocal ? 'local' : 'other',
      host,
      helpMessage,
    };
  } catch {
    return { provider: 'other', host: 'unknown', helpMessage: 'Could not parse DATABASE_URL.' };
  }
}

export async function checkDatabaseHealth() {
  const dbStart = Date.now();
  const hostInfo = getDatabaseHostInfo();

  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, 3000);
    const latencyMs = Date.now() - dbStart;

    // Fetch quick schema stats
    let userCount = 0;
    let complaintCount = 0;
    try {
      [userCount, complaintCount] = await Promise.all([
        prisma.user.count(),
        prisma.complaint.count(),
      ]);
    } catch {
      // Tables might not be migrated yet
    }

    return {
      ok: true,
      provider: hostInfo.provider,
      host: hostInfo.host,
      latencyMs,
      tablesReady: userCount >= 0,
      stats: { users: userCount, complaints: complaintCount },
      message: hostInfo.helpMessage ?? 'Database is connected and healthy.',
    };
  } catch (err) {
    const isTimeout = err instanceof Error && err.message.includes('timed out');
    return {
      ok: false,
      provider: hostInfo.provider,
      host: hostInfo.host,
      latencyMs: Date.now() - dbStart,
      detail: isTimeout ? 'Connection timed out' : 'Database unreachable',
      error: err instanceof Error ? err.message : String(err),
      troubleshooting: hostInfo.helpMessage ?? (
        hostInfo.provider === 'supabase'
          ? 'Check Supabase database credentials in .env.cloud or .env. Run `npm run db:help`.'
          : 'Start local PostgreSQL using `npm run db:local:start`.'
      ),
    };
  }
}

export async function readinessChecks() {
  const checks: Record<string, { ok: boolean; detail?: string; latencyMs?: number; [key: string]: unknown }> = {};

  const dbHealth = await checkDatabaseHealth();
  checks.database = {
    ok: dbHealth.ok,
    detail: dbHealth.ok ? `${dbHealth.provider} (${dbHealth.latencyMs}ms)` : dbHealth.detail,
    provider: dbHealth.provider,
    latencyMs: dbHealth.latencyMs,
    ...(dbHealth.ok ? { stats: dbHealth.stats } : { troubleshooting: dbHealth.troubleshooting }),
  };

  if (storage.driver === 'supabase') {
    checks.storage = {
      ok: true,
      detail: 'Supabase Storage (cloud bucket)',
      driver: 'supabase',
      durable: true,
      bucket: env.SUPABASE_STORAGE_BUCKET,
    };
  } else if (storage.driver === 'local') {
    const dir = isAbsolute(env.UPLOAD_DIR) ? env.UPLOAD_DIR : resolve(process.cwd(), env.UPLOAD_DIR);
    try {
      await access(dir, constants.W_OK);
      checks.storage = { ok: true, detail: 'local disk', driver: 'local', durable: false };
    } catch {
      try {
        await access(resolve(dir, '..'), constants.W_OK);
        checks.storage = { ok: true, detail: 'local disk (created on first upload)', driver: 'local', durable: false };
      } catch {
        checks.storage = { ok: false, detail: 'upload directory is not writable', driver: 'local', durable: false };
      }
    }
  } else {
    checks.storage = { ok: true, detail: 's3-compatible object store', driver: 's3', durable: true };
  }

  const aiStatus = aiProviderStatus();
  checks.ai = {
    ok: true,
    detail: aiStatus.configured ? `${aiStatus.provider} (${aiStatus.model})` : 'rules-only (no LLM key)',
    provider: aiStatus.provider,
    model: aiStatus.model,
    configured: aiStatus.configured,
  };

  const ready = Object.values(checks).every((c) => c.ok);
  return { ready, checks };
}

export const healthRouter = Router();

/** Friendly root so opening the API in a browser explains where to go. */
healthRouter.get('/', (_req, res) => {
  res.json({
    service: 'FixMyCity API',
    status: 'ok',
    version,
    message: 'This is the JSON API. Open the web app to use FixMyCity.',
    webApp: env.webOrigins[0] ?? null,
    endpoints: {
      liveness: '/health',
      readiness: '/ready',
      database: '/health/db',
      api: '/api',
    },
  });
});

/** Liveness: the process is up and serving requests. Does not touch dependencies. */
healthRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'fixmycity-api',
    environment: env.NODE_ENV,
    version,
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
  });
});

/** Database-specific health diagnostic endpoint */
healthRouter.get('/health/db', async (_req, res) => {
  const dbHealth = await checkDatabaseHealth();
  res.status(dbHealth.ok ? 200 : 503).json(dbHealth);
});

/** Readiness: dependencies needed to serve real traffic are available. 503 otherwise. */
healthRouter.get('/ready', async (_req, res) => {
  const { ready, checks } = await readinessChecks();
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    checks,
    timestamp: new Date().toISOString(),
  });
});
