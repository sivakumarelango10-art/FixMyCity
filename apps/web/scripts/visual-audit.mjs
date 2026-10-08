#!/usr/bin/env node
/**
 * Visual and layout audit of every route, per role, width and theme.
 * Read-only: signs in with the demo accounts and opens pages; never submits forms.
 *
 *   node scripts/visual-audit.mjs --widths 375,1280 --themes light,dark --groups public,citizen,admin,department
 *   AUDIT_BASE_URL=http://localhost:3100 node scripts/visual-audit.mjs
 *
 * Writes full-page JPEG screenshots and summary.json (horizontal overflow,
 * console errors and warnings, page errors, failed requests) to --out.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const base = process.env.AUDIT_BASE_URL ?? 'http://localhost:3000';
const widths = arg('widths', '375,1280').split(',').map(Number);
const themes = arg('themes', 'light').split(',');
const groups = arg('groups', 'public,citizen,admin,department').split(',');
const only = arg('only', '');
const out = resolve(arg('out', 'visual-audit'));
const shots = arg('shots', 'yes') === 'yes';
const channel = process.env.PW_CHANNEL === 'chromium' ? undefined : (process.env.PW_CHANNEL ?? (process.platform === 'win32' ? 'msedge' : undefined));

const ACCOUNTS = {
  citizen: { email: 'citizen@demo.fixmycity.local', password: 'Citizen@2026' },
  admin: { email: 'admin@demo.fixmycity.local', password: 'Admin@2026' },
  department: { email: 'roads.officer@demo.fixmycity.local', password: 'Officer@2026' },
};

async function signIn(context, account) {
  const req = context.request;
  await req.get(`${base}/api/auth/csrf`);
  const csrf = decodeURIComponent((await context.cookies()).find((c) => c.name === 'fmc_csrf')?.value ?? '');
  const res = await req.post(`${base}/api/auth/login`, { data: account, headers: { 'X-CSRF-Token': csrf, Origin: base } });
  if (!res.ok()) throw new Error(`Sign-in failed for ${account.email}: ${res.status()}`);
}

async function firstId(context, path) {
  const res = await context.request.get(`${base}${path}`);
  if (!res.ok()) return null;
  const body = await res.json();
  return body.data?.[0]?.id ?? null;
}

async function routesFor(group, context) {
  if (group === 'public')
    return ['/', '/services', '/about', '/help', '/city-updates', '/report-issue', '/login', '/register', '/forgot-password', '/reset-password?token=preview', '/does-not-exist'];
  if (group === 'citizen') {
    const c = await firstId(context, '/api/complaints?pageSize=1&sort=updatedAt&order=desc');
    const b = await firstId(context, '/api/utilities/bills?pageSize=1');
    return [
      '/dashboard',
      '/dashboard/complaints',
      '/dashboard/complaints/new',
      c && `/dashboard/complaints/${c}`,
      '/dashboard/utilities',
      b && `/dashboard/utilities/${b}`,
      '/dashboard/city-map',
      '/dashboard/announcements',
      '/dashboard/notifications',
      '/dashboard/help',
      '/dashboard/profile',
      '/dashboard/settings',
    ].filter(Boolean);
  }
  if (group === 'admin') {
    const c = await firstId(context, '/api/admin/complaints?pageSize=1');
    return [
      '/admin',
      '/admin/complaints',
      c && `/admin/complaints/${c}`,
      '/admin/analytics',
      '/admin/departments',
      '/admin/users',
      '/admin/announcements',
      '/admin/utilities',
      '/admin/audit-logs',
      '/admin/notifications',
      '/admin/settings',
    ].filter(Boolean);
  }
  const c = await firstId(context, '/api/department/complaints?pageSize=1');
  return ['/department', '/department/assigned', c && `/department/assigned/${c}`, '/department/history', '/department/notifications', '/department/settings'].filter(Boolean);
}

const slug = (path) => (path === '/' ? 'home' : path.replace(/^\//, '').replace(/\?.*$/, '').replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, 'id').replace(/\//g, '_'));

mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel });
const summary = [];
try {
  for (const group of groups) {
    for (const theme of themes) {
      for (const width of widths) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: 'reduce' });
        await context.addInitScript((t) => {
          try {
            window.localStorage.setItem('theme', t);
          } catch {}
        }, theme);
        if (group !== 'public') await signIn(context, ACCOUNTS[group]);
        const routes = (await routesFor(group, context)).filter((r) => !only || r.includes(only));
        for (const path of routes) {
          const page = await context.newPage();
          const issues = { console: [], pageErrors: [], failed: [] };
          page.on('console', (m) => {
            // Motion's dev-only notice is expected: the audit runs with reduced motion on purpose.
            if ((m.type() === 'error' || m.type() === 'warning') && !m.text().includes('Reduced Motion enabled')) issues.console.push(`${m.type()}: ${m.text().slice(0, 300)}`);
          });
          page.on('pageerror', (e) => issues.pageErrors.push(e.message.slice(0, 300)));
          page.on('requestfailed', (r) => {
            const u = r.url();
            if (!u.includes('tile.openstreetmap.org') && !u.includes('/_next/webpack-hmr')) issues.failed.push(`${r.failure()?.errorText} ${u}`);
          });
          page.on('response', (r) => {
            if (r.status() >= 400 && !r.url().includes('tile.openstreetmap.org') && !(path === '/does-not-exist' && r.url().endsWith(path))) issues.failed.push(`${r.status()} ${r.url()}`);
          });
          try {
            await page.goto(`${base}${path}`, { waitUntil: 'networkidle', timeout: 45_000 });
          } catch (e) {
            issues.pageErrors.push(`navigation: ${e.message.slice(0, 200)}`);
          }
          await page.waitForTimeout(900);
          await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' }).catch(() => {});
          const overflow = await page.evaluate(() => {
            const de = document.documentElement;
            const offenders = [];
            if (de.scrollWidth > de.clientWidth + 1) {
              for (const el of document.querySelectorAll('body *')) {
                const r = el.getBoundingClientRect();
                if (r.right > de.clientWidth + 1 && r.width > 0 && getComputedStyle(el).position !== 'fixed') offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} right=${Math.round(r.right)}`);
                if (offenders.length > 5) break;
              }
            }
            return { px: de.scrollWidth - de.clientWidth, offenders };
          });
          const file = `${group}-${slug(path)}-${width}-${theme}.jpg`;
          if (shots) await page.screenshot({ path: resolve(out, file), fullPage: true, type: 'jpeg', quality: 62 });
          const row = { group, path, width, theme, overflow: overflow.px, offenders: overflow.offenders, ...issues, file: shots ? file : null };
          summary.push(row);
          const flag = overflow.px > 1 || issues.pageErrors.length || issues.console.length || issues.failed.length ? 'CHECK' : 'ok';
          console.log(`${flag.padEnd(5)} ${group.padEnd(10)} ${String(width).padEnd(5)} ${theme.padEnd(5)} ${path}  overflow=${overflow.px}  console=${issues.console.length} errors=${issues.pageErrors.length} failed=${issues.failed.length}`);
          await page.close();
        }
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
  writeFileSync(resolve(out, 'summary.json'), JSON.stringify(summary, null, 2));
}
