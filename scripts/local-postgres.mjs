#!/usr/bin/env node
/**
 * Manages a project-local PostgreSQL cluster (./.local/pgdata, port 5433)
 * using an existing PostgreSQL installation's binaries. Nothing outside the
 * repository is modified.
 *
 *   node scripts/local-postgres.mjs init    create cluster + databases
 *   node scripts/local-postgres.mjs start
 *   node scripts/local-postgres.mjs stop
 *   node scripts/local-postgres.mjs status
 *
 * Set PG_BIN to the folder containing initdb/pg_ctl if it is not on PATH.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dataDir = join(root, '.local', 'pgdata');
const logFile = join(root, '.local', 'postgres.log');
const port = process.env.PGPORT_LOCAL ?? '5433';
const user = 'fixmycity';
const password = 'fixmycity_dev_pw';

function findBin(name) {
  const exe = process.platform === 'win32' ? `${name}.exe` : name;
  const candidates = [process.env.PG_BIN && join(process.env.PG_BIN, exe)];
  if (process.platform === 'win32') {
    for (const v of ['18', '17', '16', '15']) candidates.push(`C:\\Program Files\\PostgreSQL\\${v}\\bin\\${exe}`);
  } else {
    for (const v of ['18', '17', '16', '15']) candidates.push(`/usr/lib/postgresql/${v}/bin/${exe}`, `/opt/homebrew/opt/postgresql@${v}/bin/${exe}`);
  }
  const found = candidates.filter(Boolean).find((p) => existsSync(p));
  return found ?? exe;
}

function run(bin, args, opts = {}) {
  const res = spawnSync(findBin(bin), args, { stdio: 'inherit', env: { ...process.env, PGPASSWORD: password }, ...opts });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

const cmd = process.argv[2];

if (cmd === 'init') {
  if (existsSync(dataDir)) {
    console.log('Cluster already exists at', dataDir);
  } else {
    mkdirSync(join(root, '.local'), { recursive: true });
    const pwfile = join(root, '.local', 'pwfile');
    writeFileSync(pwfile, `${password}\n`);
    run('initdb', ['-D', dataDir, '-U', user, '-A', 'scram-sha-256', `--pwfile=${pwfile}`, '-E', 'UTF8', '--locale=C']);
    rmSync(pwfile);
  }
  await start();
  for (const db of ['fixmycity', 'fixmycity_test']) {
    spawnSync(findBin('createdb'), ['-h', 'localhost', '-p', port, '-U', user, db], { stdio: 'inherit', env: { ...process.env, PGPASSWORD: password } });
  }
  console.log(`\nReady. DATABASE_URL=postgresql://${user}:${password}@localhost:${port}/fixmycity`);
} else if (cmd === 'start') {
  await start();
} else if (cmd === 'stop') {
  run('pg_ctl', ['-D', dataDir, 'stop', '-m', 'fast']);
} else if (cmd === 'status') {
  run('pg_ctl', ['-D', dataDir, 'status']);
} else {
  console.log('Usage: node scripts/local-postgres.mjs <init|start|stop|status>');
  process.exit(1);
}

async function start() {
  const status = spawnSync(findBin('pg_ctl'), ['-D', dataDir, 'status'], { stdio: 'ignore' });
  if (status.status === 0) {
    console.log(`PostgreSQL already running on port ${port}.`);
    return;
  }
  const args = ['-D', dataDir, '-l', logFile, '-o', `-p ${port} -c listen_addresses=localhost`, 'start'];
  if (process.platform === 'win32') {
    startOutsideJob(findBin('pg_ctl'), args);
  } else {
    const child = spawn(findBin('pg_ctl'), args, { detached: true, stdio: 'ignore' });
    child.unref();
  }
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 250));
    const ready = spawnSync(findBin('pg_isready'), ['-h', 'localhost', '-p', port], { stdio: 'ignore' });
    if (ready.status === 0) {
      console.log(`PostgreSQL running on port ${port}.`);
      return;
    }
  }
  console.error('PostgreSQL did not become ready. See', logFile);
  process.exit(1);
}

/**
 * Windows: launch pg_ctl through WMI (Win32_Process.Create).
 *
 * Processes spawned normally inherit the caller's Job Object. Terminals, IDEs
 * and automation tools often run commands inside a job that is torn down when
 * the command or session ends, which terminates every process in it, including
 * a "detached" database server (observed: backends exiting with 0xC000013A and
 * 0xC0000142, then the postmaster disappearing). A process created by WMI is
 * parented by the WMI provider host and belongs to no job, so the server keeps
 * running until it is stopped explicitly. No admin rights or services needed.
 */
function startOutsideJob(exe, args) {
  const quote = (a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);
  const commandLine = [exe, ...args].map(quote).join(' ');
  const ps = `$r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = '${commandLine.replace(/'/g, "''")}'; CurrentDirectory = '${root.replace(/'/g, "''")}' }; exit $r.ReturnValue`;
  const res = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { stdio: 'inherit', windowsHide: true });
  if (res.status !== 0) {
    console.error(`Could not launch PostgreSQL through WMI (code ${res.status}).`);
    process.exit(1);
  }
}
