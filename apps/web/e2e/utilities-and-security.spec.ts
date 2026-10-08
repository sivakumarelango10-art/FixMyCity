import { expect, test } from '@playwright/test';
import { DEMO, csrfToken, newSession, signIn } from './helpers';

test('citizen pays a demo bill once; repeats are blocked and the receipt persists', async ({ page }) => {
  await signIn(page, DEMO.citizen, /\/dashboard/);
  await page.goto('/dashboard/utilities');
  await expect(page.getByText('DEMO PAYMENT - NO REAL MONEY IS TRANSFERRED').first()).toBeVisible();

  await page.getByRole('link', { name: /Electricity/ }).first().click();
  await expect(page).toHaveURL(/\/dashboard\/utilities\/[0-9a-f-]{36}$/);
  const billPath = new URL(page.url()).pathname;
  const billId = billPath.split('/').pop()!;

  await page.getByTestId('pay-now').click();
  await expect(page.getByRole('dialog')).toContainText('Confirm demo payment');
  await page.getByTestId('confirm-payment').click();
  await expect(page.getByTestId('receipt')).toBeVisible();
  const reference = await page.getByTestId('receipt').locator('dd').first().innerText();
  expect(reference).toMatch(/^DEMO-/);

  // Persisted across reloads, and the pay button is gone.
  await page.reload();
  await expect(page.getByTestId('receipt')).toContainText(reference);
  await expect(page.getByTestId('pay-now')).toHaveCount(0);

  // A second payment attempt with a new key is refused by the server.
  const token = await csrfToken(page);
  const again = await page.request.post(`/api/utilities/bills/${billId}/demo-pay`, {
    headers: { 'X-CSRF-Token': token, 'Idempotency-Key': `e2e${Date.now()}repeatattempt`, Origin: 'http://localhost:3100' },
  });
  expect(again.status()).toBe(409);

  await page.goto('/dashboard/utilities');
  await expect(page.getByText(reference)).toBeVisible();
});

test('anonymous users are sent to sign in and citizens cannot open staff workspaces', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login/);

  await signIn(page, DEMO.citizen, /\/dashboard/);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/department');
  await expect(page).toHaveURL(/\/dashboard$/);
  const apiAttempt = await page.request.get('/api/admin/analytics');
  expect(apiAttempt.status()).toBe(403);
});

test('an officer cannot open another department\'s complaint', async ({ browser }) => {
  const { context, page } = await newSession(browser, DEMO.water, /\/department$/);
  // Roads complaint from the seed data (MG Road pothole, demo record).
  const res = await page.request.get('/api/admin/complaints');
  expect(res.status()).toBe(403);
  const roadsList = await page.request.get('/api/department/complaints?pageSize=100');
  const items = (await roadsList.json()).data as { department: { code: string } }[];
  expect(items.every((c) => c.department.code === 'WATER')).toBe(true);
  await context.close();
});

test('admin publishes an announcement that citizens see on city updates', async ({ browser, page }) => {
  const title = `Water main flushing on 80 Feet Road ${Date.now()}`;
  const admin = await newSession(browser, DEMO.admin, /\/admin$/);
  await admin.page.goto('/admin/announcements');
  await admin.page.getByRole('button', { name: 'New announcement' }).click();
  const dialog = admin.page.getByRole('dialog');
  await dialog.getByLabel('Title').fill(title);
  await dialog.getByLabel('Full notice').fill('Crews will flush the water main between 10 am and 2 pm. Expect low pressure in the area.');
  await dialog.getByLabel('Status').click();
  await admin.page.getByRole('option', { name: 'Published' }).click();
  await dialog.getByRole('button', { name: 'Publish' }).click();
  await expect(admin.page.getByText(title)).toBeVisible();
  await admin.context.close();

  await page.goto('/city-updates');
  await expect(page.getByText(title)).toBeVisible();
});
