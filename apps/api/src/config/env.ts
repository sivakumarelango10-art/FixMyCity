import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load apps/api/.env first, then the repository root .env.
dotenv.config({ path: [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')], quiet: true });

const bool = z
  .enum(['true', 'false', '1', '0', ''])
  .optional()
  .transform((v) => v === 'true' || v === '1');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  /** Deployment environment, independent of NODE_ENV (a staging build still runs NODE_ENV=production). */
  APP_ENV: z.enum(['local', 'test', 'staging', 'production']).default('local'),
  API_PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(24 * 90).default(168),
  COOKIE_SECURE: bool,
  TRUST_PROXY: bool,
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  STORAGE_DRIVER: z.enum(['local', 's3', 'supabase']).default('local'),
  UPLOAD_DIR: z.string().default('uploads'),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  // Supabase Storage & Services
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SECRET_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_KEY: z.string().optional(),
  SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default('complaint-photos'),

  // AI Classification (Gemini & Anthropic)
  GEMINI_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_PROVIDER: z.enum(['gemini', 'anthropic', 'auto']).default('auto'),
  AI_MODEL: z.string().default('gemini-2.5-flash'),
  AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60_000).default(10000),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('FixMyCity <no-reply@fixmycity.local>'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const details = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${details}`);
}

const raw = parsed.data;

const resolvedSupabaseUrl = raw.SUPABASE_URL || raw.NEXT_PUBLIC_SUPABASE_URL || 'https://yitwhjmqfdohwbqbnsmy.supabase.co';
const resolvedSupabaseKey = raw.SUPABASE_SECRET_KEY || raw.SUPABASE_SERVICE_ROLE_KEY || raw.SUPABASE_KEY;
const resolvedSupabasePublishableKey = raw.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || raw.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_d3uy3MX06pfCeivCwyZq5A_nGVTqqtO';

const resolvedGeminiKey = raw.GEMINI_API_KEY || raw.GOOGLE_API_KEY;
const resolvedStorageDriver =
  raw.STORAGE_DRIVER === 'supabase' || (raw.STORAGE_DRIVER !== 's3' && Boolean(resolvedSupabaseUrl && resolvedSupabaseKey))
    ? ('supabase' as const)
    : raw.STORAGE_DRIVER;

const resolvedAiProvider =
  raw.AI_PROVIDER === 'auto'
    ? resolvedGeminiKey
      ? ('gemini' as const)
      : raw.ANTHROPIC_API_KEY
        ? ('anthropic' as const)
        : ('none' as const)
    : raw.AI_PROVIDER;

export const env = {
  ...raw,
  SUPABASE_URL: resolvedSupabaseUrl,
  STORAGE_DRIVER: resolvedStorageDriver,
  SUPABASE_SECRET_KEY: resolvedSupabaseKey,
  SUPABASE_PUBLISHABLE_KEY: resolvedSupabasePublishableKey,
  GEMINI_API_KEY: resolvedGeminiKey,
  AI_PROVIDER: resolvedAiProvider,
  isProduction: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
  webOrigins: raw.WEB_ORIGIN.split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  sessionTtlMs: raw.SESSION_TTL_HOURS * 60 * 60 * 1000,
  aiEnabled: Boolean(resolvedGeminiKey || (raw.ANTHROPIC_API_KEY && raw.ANTHROPIC_API_KEY.trim())),
  smtpEnabled: Boolean(raw.SMTP_HOST),
};

const deployed = env.APP_ENV === 'production' || env.APP_ENV === 'staging';
if ((env.isProduction || deployed) && env.SESSION_SECRET.includes('replace-with')) {
  throw new Error('SESSION_SECRET must be changed outside local development.');
}
if (deployed && !env.COOKIE_SECURE) {
  // Deployed over HTTPS, cookies must carry the Secure flag.
  throw new Error('COOKIE_SECURE=true is required when APP_ENV is staging or production.');
}

export type Env = typeof env;
