import { access, constants } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { Router } from 'express';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { storage } from '../../services/storage.js';

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

export async function readinessChecks() {
  const checks: Record<string, { ok: boolean; detail?: string; latencyMs?: number }> = {};

  const dbStart = Date.now();
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, 3000);
    checks.database = { ok: true, latencyMs: Date.now() - dbStart };
  } catch (err) {
    checks.database = { ok: false, detail: err instanceof Error && err.message.includes('timed out') ? 'timed out' : 'unreachable' };
  }

  if (storage.driver === 'local') {
    const dir = isAbsolute(env.UPLOAD_DIR) ? env.UPLOAD_DIR : resolve(process.cwd(), env.UPLOAD_DIR);
    try {
      await access(dir, constants.W_OK);
      checks.storage = { ok: true, detail: 'local disk' };
    } catch {
      // The directory is created on first upload; only a missing parent is a real problem.
      try {
        await access(resolve(dir, '..'), constants.W_OK);
        checks.storage = { ok: true, detail: 'local disk (created on first upload)' };
      } catch {
        checks.storage = { ok: false, detail: 'upload directory is not writable' };
      }
    }
  } else {
    checks.storage = { ok: true, detail: 's3-compatible (verified on first upload)' };
  }

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
    endpoints: { liveness: '/health', readiness: '/ready', api: '/api' },
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

/** Readiness: dependencies needed to serve real traffic are available. 503 otherwise. */
healthRouter.get('/ready', async (_req, res) => {
  const { ready, checks } = await readinessChecks();
  res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not_ready', checks, timestamp: new Date().toISOString() });
});
