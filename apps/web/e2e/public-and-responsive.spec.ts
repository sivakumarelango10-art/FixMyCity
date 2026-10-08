import { expect, test } from '@playwright/test';
import { DEMO, expectNoHorizontalOverflow, signIn } from './helpers';

test('landing page presents the product and its primary actions work', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your City. Your Voice.');
  await expect(page.getByText('One City. One Platform. Every Service.').first()).toBeVisible();
  await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 20_000 });

  // The in-page classifier preview runs the real rule set.
  await page.getByLabel('Describe a civic issue').fill('Streetlight not working and exposed wires at the pole');
  await expect(page.getByText('Street Lighting Department', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Explore Services' }).first().click();
  await expect(page).toHaveURL(/\/services$/);
  await page.goto('/');
  await page.getByRole('link', { name: /Report an Issue/ }).first().click();
  await expect(page).toHaveURL(/\/report-issue$/);
  expect(errors).toEqual([]);
});

test('public pages load without runtime errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));
  for (const path of ['/services', '/about', '/help', '/city-updates', '/report-issue', '/login', '/register', '/forgot-password', '/does-not-exist']) {
    await page.goto(path);
    await expect(page.locator('main')).toBeVisible();
  }
  await expect(page.getByRole('heading', { name: 'This page does not exist' })).toBeVisible();
  expect(errors).toEqual([]);
});

for (const width of [375, 768, 1280, 1440]) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expectNoHorizontalOverflow(page);

    await signIn(page, DEMO.admin, /\/admin$/);
    for (const path of ['/admin', '/admin/complaints', '/admin/analytics']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expectNoHorizontalOverflow(page);
    }
  });
}

test('mobile navigation drawer opens and navigates', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await signIn(page, DEMO.citizen, /\/dashboard/);
  await page.getByRole('button', { name: 'Open menu' }).click();
  const drawer = page.getByRole('dialog');
  await expect(drawer).toBeVisible();
  await drawer.getByRole('link', { name: 'Utilities' }).click();
  await expect(page).toHaveURL(/\/dashboard\/utilities$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});
