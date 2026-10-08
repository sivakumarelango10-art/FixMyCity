#!/usr/bin/env node
/**
 * Pre-flight check for database commands. Prints which database a command is
 * about to touch (password masked) and blocks dangerous combinations.
 *
 *   --local-only     fail unless DATABASE_URL points at localhost
 *   --confirm-reset  additionally require FMC_CONFIRM_RESET=yes (destructive reset)
 *
 * Reads DATABASE_URL / DIRECT_URL / APP_ENV from the environment or ./.env.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

function loadDotEnv() {
  const file = resolve(root, '.env');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

function describe(url) {
  try {
    const u = new URL(url);
    return { host: u.hostname, port: u.port || '5432', database: u.pathname.replace(/^\//, ''), user: decodeURIComponent(u.username), masked: `${u.protocol}//${u.username}:****@${u.host}${u.pathname}` };
  } catch {
    return null;
  }
}

loadDotEnv();
const args = new Set(process.argv.slice(2));
const appEnv = process.env.APP_ENV ?? 'local';
const db = describe(process.env.DATABASE_URL ?? '');
const direct = describe(process.env.DIRECT_URL ?? '');
const LOCAL = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

if (!db) {
  console.error('DATABASE_URL is missing or invalid.');
  process.exit(1);
}
if (!direct) {
  console.error('DIRECT_URL is missing. Locally set it to the same value as DATABASE_URL.');
  process.exit(1);
}

const local = LOCAL.has(db.host) && LOCAL.has(direct.host);
console.log(`[db-guard] APP_ENV=${appEnv}`);
console.log(`[db-guard] runtime    ${db.masked}`);
console.log(`[db-guard] migrations ${direct.masked}`);

if (args.has('--local-only') && (!local || appEnv === 'production')) {
  console.error('[db-guard] Blocked: this command is only allowed against a local development database.');
  console.error('           For cloud databases use `npm run db:deploy` (applies committed migrations, never resets).');
  process.exit(1);
}
if (args.has('--confirm-reset') && process.env.FMC_CONFIRM_RESET !== 'yes') {
  console.error('[db-guard] Blocked: resetting erases every row in this database.');
  console.error('           Re-run with FMC_CONFIRM_RESET=yes if you really want to wipe the local development database.');
  process.exit(1);
}
console.log('[db-guard] OK');
