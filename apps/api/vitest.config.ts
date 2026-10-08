import { resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// Tests always run against the disposable test database, never the dev database.
function testDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const rootEnv = resolve(__dirname, '../../.env');
  if (existsSync(rootEnv)) {
    const m = readFileSync(rootEnv, 'utf8').match(/^TEST_DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m);
    if (m?.[1]) return m[1];
  }
  return 'postgresql://fixmycity:fixmycity_dev_pw@localhost:5433/fixmycity_test?schema=public';
}

const databaseUrl = testDatabaseUrl();

const testEnv = {
  NODE_ENV: 'test',
  APP_ENV: 'test',
  DATABASE_URL: databaseUrl,
  DIRECT_URL: databaseUrl,
  SESSION_SECRET: 'test-session-secret-that-is-long-enough-for-hmac-signing',
  UPLOAD_DIR: 'uploads-test',
  STORAGE_DRIVER: 'local',
  WEB_ORIGIN: 'http://localhost:3000',
  ANTHROPIC_API_KEY: '',
  LOG_LEVEL: 'silent',
};
// Global setup runs in this process, so it needs the same variables as the workers.
Object.assign(process.env, testEnv);

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/global-setup.ts'],
    // One shared database: run files one after another.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    env: testEnv,
  },
});
