import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';

const root = resolve(__dirname, '../../..');

/**
 * Prepares the disposable test database: apply migrations, wipe rows, seed demo data.
 * Refuses to touch any database whose name does not end in "_test".
 */
export default async function setup() {
  const url = process.env.DATABASE_URL ?? '';
  const name = new URL(url).pathname.replace(/^\//, '');
  if (!name.endsWith('_test')) {
    throw new Error(`Refusing to run API tests against "${name}". Tests require a database whose name ends in _test.`);
  }
  const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: url };
  execSync('npx prisma migrate deploy', { cwd: root, env, stdio: 'pipe' });

  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
  await prisma.$disconnect();

  rmSync(resolve(__dirname, '../uploads-test'), { recursive: true, force: true });
  execSync('npx tsx prisma/seed.ts', { cwd: root, env, stdio: 'pipe' });
}
