import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';

const root = resolve(__dirname, '../../..');
const TEST_DB_DEFAULT = 'postgresql://fixmycity:fixmycity_dev_pw@localhost:5433/fixmycity_test?schema=public';

/** Runs a command and throws with its full output when it fails (never swallows the error). */
function run(command: string, env: NodeJS.ProcessEnv) {
  const res = spawnSync(command, { cwd: root, env, shell: true, encoding: 'utf8' });
  if (res.status !== 0) {
    throw new Error(`E2E setup step failed: ${command}\n--- stdout ---\n${res.stdout}\n--- stderr ---\n${res.stderr}`);
  }
}

/**
 * Resets the disposable E2E database to the seeded demo state.
 * Guards: the database name must end in "_test" and the host must be local.
 */
export default async function globalSetup() {
  const url = process.env.TEST_DATABASE_URL ?? TEST_DB_DEFAULT;
  const target = new URL(url);
  const name = target.pathname.replace(/^\//, '');
  if (!name.endsWith('_test')) throw new Error(`Refusing to reset "${name}": E2E tests need a database whose name ends in _test.`);
  if (!['localhost', '127.0.0.1', '::1'].includes(target.hostname)) throw new Error(`Refusing to reset a non-local database host (${target.hostname}).`);
  console.log(`[e2e] resetting disposable database ${target.hostname}:${target.port || 5432}/${name}`);

  // Fail fast with an actionable message if the project database is not running.
  const probe = new PrismaClient({ datasources: { db: { url } } });
  try {
    await Promise.race([probe.$queryRaw`SELECT 1`, new Promise((_, reject) => setTimeout(() => reject(new Error('timed out')), 5000))]);
  } catch (err) {
    await probe.$disconnect().catch(() => undefined);
    throw new Error(
      `Cannot reach the test database at ${target.hostname}:${target.port || 5432} (${(err as Error).message}).\n` +
        'Start the project database first:  npm run db:local:start',
    );
  }

  const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: url, APP_ENV: 'test', SESSION_SECRET: process.env.SESSION_SECRET ?? 'e2e-session-secret-long-enough-for-signing' };
  run('npx prisma migrate deploy', env);

  const tables = await probe.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await probe.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
  await probe.$disconnect();

  rmSync(resolve(root, 'apps/api/uploads-e2e'), { recursive: true, force: true });
  run('npx tsx prisma/seed.ts', env);
}
