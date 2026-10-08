#!/usr/bin/env node
/**
 * Runs a command with variables from a specific env file layered on top of the
 * current environment, without touching .env. Cross-platform (PowerShell, cmd, bash).
 *
 *   node scripts/with-env.mjs .env.cloud -- npm run db:deploy
 *   node scripts/with-env.mjs .env.test  -- npx prisma migrate deploy
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
const sep = argv.indexOf('--');
if (sep !== 1 || argv.length < 3) {
  console.error('Usage: node scripts/with-env.mjs <env-file> -- <command> [args...]');
  process.exit(2);
}
const file = resolve(process.cwd(), argv[0]);
if (!existsSync(file)) {
  console.error(`Env file not found: ${file}`);
  process.exit(2);
}

const vars = {};
for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const [cmd, ...rest] = argv.slice(2);
const child = spawn(cmd, rest, { stdio: 'inherit', shell: process.platform === 'win32', env: { ...process.env, ...vars } });
child.on('exit', (code) => process.exit(code ?? 1));
