import { expect, type Browser, type Page } from '@playwright/test';

export const DEMO = {
  citizen: { email: 'citizen@demo.fixmycity.local', password: 'Citizen@2026' },
  admin: { email: 'admin@demo.fixmycity.local', password: 'Admin@2026' },
  roads: { email: 'roads.officer@demo.fixmycity.local', password: 'Officer@2026' },
  water: { email: 'water.officer@demo.fixmycity.local', password: 'Officer@2026' },
} as const;

/** Signs in through the real login form and waits for the role's workspace. */
export async function signIn(page: Page, account: { email: string; password: string }, expectPath: RegExp) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(expectPath, { timeout: 30_000 });
}

export async function newSession(browser: Browser, account: { email: string; password: string }, expectPath: RegExp) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, account, expectPath);
  return { context, page };
}

/** Fails the test if the page scrolls horizontally. */
export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'horizontal overflow in pixels').toBeLessThanOrEqual(1);
}

/** Reads the double-submit CSRF token the way the web client does. */
export async function csrfToken(page: Page): Promise<string> {
  const cookies = await page.context().cookies();
  return decodeURIComponent(cookies.find((c) => c.name === 'fmc_csrf')?.value ?? '');
}
