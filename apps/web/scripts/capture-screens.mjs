#!/usr/bin/env node
/**
 * Captures real screenshots of the running FixMyCity app for the landing page
 * ("Every role gets its own workspace"). Read-only: it signs in with the demo
 * accounts and opens pages; it never submits forms.
 *
 *   node scripts/capture-screens.mjs            (app on http://localhost:3000)
 *   CAPTURE_BASE_URL=http://localhost:3100 node scripts/capture-screens.mjs
 *
 * Output: public/screens/<view>-<dark|light>.webp (1440x900, WebP).
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const base = process.env.CAPTURE_BASE_URL ?? 'http://localhost:3000';
const outDir = resolve(import.meta.dirname, '../public/screens');
const channel = process.env.PW_CHANNEL === 'chromium' ? undefined : (process.env.PW_CHANNEL ?? (process.platform === 'win32' ? 'msedge' : undefined));

const ACCOUNTS = {
  citizen: { email: 'citizen@demo.fixmycity.local', password: 'Citizen@2026' },
  admin: { email: 'admin@demo.fixmycity.local', password: 'Admin@2026' },
  roads: { email: 'roads.officer@demo.fixmycity.local', password: 'Officer@2026' },
};

async function signIn(context, account) {
  const req = context.request;
  await req.get(`${base}/api/auth/csrf`);
  const csrf = decodeURIComponent((await context.cookies()).find((c) => c.name === 'fmc_csrf')?.value ?? '');
  const res = await req.post(`${base}/api/auth/login`, { data: account, headers: { 'X-CSRF-Token': csrf, Origin: base } });
  if (!res.ok()) throw new Error(`Sign-in failed for ${account.email}: ${res.status()}`);
}

/** Finds a demo complaint by title through the API the account can see. */
async function complaintId(context, title) {
  const res = await context.request.get(`${base}/api/complaints?pageSize=50&search=${encodeURIComponent(title)}`);
  const item = (await res.json()).data.find((c) => c.title === title);
  if (!item) throw new Error(`Demo complaint not found: ${title}`);
  return item.id;
}

const VIEWS = [
  { name: 'citizen-dashboard', account: 'citizen', path: async () => '/dashboard', ready: 'text=Needs your attention' },
  {
    name: 'complaint-tracking',
    account: 'citizen',
    path: async (ctx) => `/dashboard/complaints/${await complaintId(ctx, 'Broken streetlight on Bannerghatta Road')}`,
    ready: 'text=Activity',
  },
  { name: 'admin-overview', account: 'admin', path: async () => '/admin', ready: 'text=Needs assignment' },
  {
    name: 'department-workbench',
    account: 'roads',
    path: async (ctx) => `/department/assigned/${await complaintId(ctx, 'Large pothole near MG Road metro station')}`,
    ready: 'text=Update status',
  },
];

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ channel });
try {
  for (const theme of ['dark', 'light']) {
    for (const view of VIEWS) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: theme, reducedMotion: 'reduce' });
      // Only the theme preference is set before load; touching the DOM here would cause a hydration mismatch.
      await context.addInitScript((t) => {
        try {
          window.localStorage.setItem('theme', t);
        } catch {}
      }, theme);
      await signIn(context, ACCOUNTS[view.account]);
      const page = await context.newPage();
      await page.goto(`${base}${await view.path(context)}`, { waitUntil: 'networkidle' });
      await page.waitForSelector(view.ready, { timeout: 30_000 });
      // After hydration: hide only the Next.js development indicator (absent in production builds).
      await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
      await page.waitForTimeout(1500); // charts and map tiles settle
      const png = await page.screenshot({ type: 'png' });
      const file = resolve(outDir, `${view.name}-${theme}.webp`);
      const info = await sharp(png).webp({ quality: 82 }).toFile(file);
      console.log(`${view.name}-${theme}.webp  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)} KB`);
      await context.close();
    }
  }
} finally {
  await browser.close();
}
