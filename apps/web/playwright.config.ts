import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against their own API (4100) and web server (3100),
 * both pointed at the disposable fixmycity_test database. The development
 * servers on 3000/4000 and their data are never touched.
 */
const TEST_DB = process.env.TEST_DATABASE_URL ?? 'postgresql://fixmycity:fixmycity_dev_pw@localhost:5433/fixmycity_test?schema=public';
const API_PORT = 4100;
const WEB_PORT = 3100;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 860 },
    // Windows: reuse the installed Microsoft Edge instead of downloading a browser build.
    // Set PW_CHANNEL=chromium to use Playwright's bundled Chromium (for example on Linux CI).
    channel: process.env.PW_CHANNEL === 'chromium' ? undefined : (process.env.PW_CHANNEL ?? (process.platform === 'win32' ? 'msedge' : undefined)),
  },
  webServer: [
    {
      command: 'npx tsx src/server.ts',
      cwd: '../api',
      port: API_PORT,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        NODE_ENV: 'development',
        APP_ENV: 'test',
        API_PORT: String(API_PORT),
        DATABASE_URL: TEST_DB,
        DIRECT_URL: TEST_DB,
        WEB_ORIGIN: `http://localhost:${WEB_PORT}`,
        UPLOAD_DIR: 'uploads-e2e',
        STORAGE_DRIVER: 'local',
        ANTHROPIC_API_KEY: '',
        LOG_LEVEL: 'warn',
      },
    },
    {
      command: `npx next dev --port ${WEB_PORT}`,
      port: WEB_PORT,
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        NEXT_DIST_DIR: '.next-e2e',
        API_INTERNAL_URL: `http://localhost:${API_PORT}`,
        NEXT_PUBLIC_SOCKET_URL: `http://localhost:${API_PORT}`,
        NEXT_PUBLIC_APP_URL: `http://localhost:${WEB_PORT}`,
      },
    },
  ],
});
