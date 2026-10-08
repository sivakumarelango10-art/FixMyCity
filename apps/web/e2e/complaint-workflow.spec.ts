import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import { DEMO, newSession } from './helpers';

/**
 * The hackathon demo, end to end through the real UI:
 * citizen registers and reports -> admin assigns -> officer resolves -> citizen tracks.
 */
test.describe.serial('complaint workflow', () => {
  const email = `e2e.citizen.${Date.now()}@example.com`;
  let trackingId = '';
  let complaintUrl = '';

  test('citizen registers and reports a pothole with photo and map pin', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/register');
    await page.getByLabel('Full name').fill('Kavya Iyer');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('Pothole2026');
    await page.getByLabel('Confirm password').fill('Pothole2026');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Kavya');

    await page.getByRole('link', { name: 'Report an Issue' }).first().click();
    await expect(page).toHaveURL(/\/dashboard\/complaints\/new/);
    await page.getByLabel('Title').fill('Large pothole near MG Road');
    await page.getByLabel('Description').fill('Large pothole near MG Road affecting daily commuters. Two-wheelers swerve around it at night.');
    await page.getByRole('radio', { name: 'Potholes' }).click();

    const photo = await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 74, g: 67, b: 60 } } }).jpeg().toBuffer();
    await page.setInputFiles('#photos', { name: 'pothole.jpg', mimeType: 'image/jpeg', buffer: photo });
    await expect(page.getByRole('img', { name: 'Selected photo pothole.jpg' })).toBeVisible();

    // The rule-based suggestion appears before submitting.
    await expect(page.getByText('Road Maintenance Department', { exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Source: Local rule-based classifier')).toBeVisible();

    const map = page.getByRole('application', { name: /Pick the issue location/ });
    await map.scrollIntoViewIfNeeded();
    await map.click({ position: { x: 200, y: 160 } });
    await expect(page.getByText(/Pinned at/)).toBeVisible();
    await page.getByLabel('Address or landmark').fill('MG Road, near metro station exit B');

    await page.getByRole('button', { name: 'Submit complaint' }).click();
    await expect(page.getByRole('heading', { name: 'Complaint submitted' })).toBeVisible({ timeout: 30_000 });
    trackingId = (await page.getByTestId('tracking-id').innerText()).trim();
    expect(trackingId).toMatch(/^FMC-\d{4}-\d{6}$/);
    await expect(page.getByText('Road Maintenance Department', { exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Track this complaint' }).click();
    await expect(page).toHaveURL(/\/dashboard\/complaints\/[0-9a-f-]{36}$/);
    complaintUrl = new URL(page.url()).pathname;
    await expect(page.getByRole('img', { name: /Evidence photo 1/ })).toBeVisible();

    await page.goto('/dashboard/complaints');
    await page.getByLabel('Search complaints').fill(trackingId);
    await expect(page.getByText(trackingId)).toBeVisible();
    await context.close();
  });

  test('administrator reviews the suggestion and assigns Road Maintenance', async ({ browser }) => {
    const { context, page } = await newSession(browser, DEMO.admin, /\/admin$/);
    await page.goto('/admin/complaints');
    await page.getByLabel('Search complaints').fill(trackingId);
    await page.getByRole('link', { name: /Large pothole near MG Road/ }).first().click();
    await expect(page.getByRole('heading', { name: 'Large pothole near MG Road' })).toBeVisible();
    await expect(page.getByText('Local rule-based classifier', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Awaiting review')).toBeVisible();

    // The suggested department is preselected; the admin confirms the decision.
    await page.getByRole('button', { name: 'Assign complaint' }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toContainText('Road Maintenance Department');
    await dialog.getByRole('button', { name: 'Assign', exact: true }).click();
    await expect(page.getByText('Assigned to Road Maintenance Department')).toBeVisible();
    await expect(page.getByText('Accepted by administrator')).toBeVisible();
    await context.close();
  });

  test('officer starts work, posts an update and resolves while the citizen watches live', async ({ browser }) => {
    // Citizen keeps the tracking page open to observe realtime updates.
    const citizen = await browser.newContext();
    const citizenPage = await citizen.newPage();
    await citizenPage.goto('/login');
    await citizenPage.getByLabel('Email').fill(email);
    await citizenPage.getByLabel('Password', { exact: true }).fill('Pothole2026');
    await citizenPage.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(citizenPage).toHaveURL(/\/dashboard/);
    await citizenPage.goto(complaintUrl);
    await expect(citizenPage.getByRole('status').filter({ hasText: 'Live' })).toBeVisible({ timeout: 20_000 });

    const { context, page } = await newSession(browser, DEMO.roads, /\/department$/);
    await page.goto('/department/assigned');
    await page.getByLabel('Search complaints').fill(trackingId);
    await page.getByRole('link', { name: /Large pothole near MG Road/ }).first().click();

    await page.getByRole('button', { name: 'Start work' }).click();
    await page.getByRole('dialog').getByLabel(/Note/).fill('Crew dispatched; area barricaded.');
    await page.getByRole('dialog').getByRole('button', { name: 'Start work' }).click();
    await expect(page.getByText('Status changed to In progress')).toBeVisible();

    await page.getByLabel('Note', { exact: true }).fill('Cold-mix patch applied, final asphalt layer tomorrow.');
    await page.getByRole('button', { name: 'Post update' }).click();
    await expect(page.getByText('Progress update').first()).toBeVisible();

    await page.getByRole('button', { name: 'Mark resolved' }).click();
    await page.getByRole('dialog').getByLabel('Resolution details').fill('Pothole filled and resurfaced with hot-mix asphalt; barricades removed.');
    await page.getByRole('dialog').getByRole('button', { name: 'Mark resolved' }).click();
    await expect(page.getByText('Status changed to Resolved')).toBeVisible();

    // Without reloading, the citizen's open page reflects the resolution.
    await expect(citizenPage.getByText('Status changed to Resolved')).toBeVisible({ timeout: 20_000 });
    await expect(citizenPage.getByText('Pothole filled and resurfaced with hot-mix asphalt; barricades removed.').first()).toBeVisible();

    await context.close();
    await citizen.close();
  });

  test('citizen sees the final status, full timeline and notifications', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('Pothole2026');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto(complaintUrl);
    const timeline = page.getByRole('list', { name: 'Activity timeline' });
    await expect(timeline.getByText('Complaint submitted')).toBeVisible();
    await expect(timeline.getByText('Assigned to Road Maintenance Department')).toBeVisible();
    await expect(timeline.getByText('Status changed to In progress')).toBeVisible();
    await expect(timeline.getByText('Progress update')).toBeVisible();
    await expect(timeline.getByText('Status changed to Resolved')).toBeVisible();
    // Internal staff details never reach the citizen.
    await expect(page.getByText('Reported by')).toHaveCount(0);

    await page.goto('/dashboard/notifications');
    await expect(page.getByText(`${trackingId}: Resolved`)).toBeVisible();
    await expect(page.getByText(`${trackingId} assigned to Road Maintenance Department`)).toBeVisible();

    // Rate the resolution.
    await page.goto(complaintUrl);
    await page.getByRole('radio', { name: '5 stars' }).click();
    await page.getByRole('button', { name: 'Submit rating' }).click();
    await expect(page.getByLabel('You rated 5 of 5')).toBeVisible();
    await context.close();
  });
});
