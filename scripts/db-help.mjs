#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

function parseEnvFile(filename) {
  const filePath = resolve(process.cwd(), filename);
  if (!existsSync(filePath)) return {};
  const content = readFileSync(filePath, 'utf8');
  const result = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    result[key] = val;
  }
  return result;
}

const rootEnv = parseEnvFile('.env');
const cloudEnv = parseEnvFile('.env.cloud');
const localEnv = parseEnvFile('.env.local');

const combined = { ...rootEnv, ...localEnv, ...process.env };

console.log('\n================================================================');
console.log('         FixMyCity System & Database Health Diagnostic          ');
console.log('================================================================\n');

// 1. SUPABASE DATABASE CHECK
console.log('--- [1] Supabase Cloud Database (PostgreSQL) ---');
const supabaseDbUrl = cloudEnv.DATABASE_URL || combined.DATABASE_URL || '';
const hasPlaceholder = supabaseDbUrl.includes('[YOUR-PASSWORD]') || supabaseDbUrl.includes('YOUR-PASSWORD');

if (hasPlaceholder) {
  console.log('⚠️  Status: Password required');
  console.log('    Connection string contains placeholder "[YOUR-PASSWORD]".');
  console.log('\n    👉 HOW TO CONNECT YOUR SUPABASE DATABASE:');
  console.log('    1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/yitwhjmqfdohwbqbnsmy');
  console.log('    2. Go to: Project Settings (gear icon) -> Database.');
  console.log('    3. Find "Database password". If you do not remember it, click "Reset database password".');
  console.log('    4. Open .env or .env.cloud in your editor.');
  console.log('    5. Replace [YOUR-PASSWORD] with your actual password.');
  console.log('    6. Deploy your schema to Supabase by running:');
  console.log('       node scripts/with-env.mjs .env.cloud -- npm run db:deploy\n');
} else if (supabaseDbUrl.includes('supabase.co') || supabaseDbUrl.includes('supabase.com')) {
  console.log('    Testing connection to Supabase Postgres...');
  const prismaCloud = new PrismaClient({
    datasources: { db: { url: supabaseDbUrl } },
  });
  try {
    await prismaCloud.$queryRaw`SELECT 1`;
    console.log('✅  Status: Connected to Supabase PostgreSQL successfully!');
    try {
      const [users, complaints, departments] = await Promise.all([
        prismaCloud.user.count(),
        prismaCloud.complaint.count(),
        prismaCloud.department.count(),
      ]);
      console.log(`    Database tables: Synced (${users} users, ${complaints} complaints, ${departments} departments)`);
    } catch {
      console.log('⚠️  Schema tables not created yet. Run: npm run db:deploy');
    }
  } catch (err) {
    console.log('❌  Connection failed: ' + (err instanceof Error ? err.message : String(err)));
    console.log('    Verify your database password and network connection.');
  } finally {
    await prismaCloud.$disconnect().catch(() => {});
  }
} else {
  console.log('    Current DATABASE_URL in .env points to: ' + supabaseDbUrl.split('@')[1] || 'custom host');
}

// 2. LOCAL DATABASE CHECK
console.log('\n--- [2] Local PostgreSQL Database ---');
const localDbUrl = combined.DATABASE_URL?.includes('localhost') ? combined.DATABASE_URL : 'postgresql://fixmycity:fixmycity_dev_pw@localhost:5433/fixmycity?schema=public';
const prismaLocal = new PrismaClient({
  datasources: { db: { url: localDbUrl } },
});
try {
  await prismaLocal.$queryRaw`SELECT 1`;
  const [users, complaints] = await Promise.all([
    prismaLocal.user.count().catch(() => 0),
    prismaLocal.complaint.count().catch(() => 0),
  ]);
  console.log(`✅  Status: Connected to local PostgreSQL on port 5433!`);
  console.log(`    Local data: ${users} users, ${complaints} complaints`);
} catch {
  console.log('ℹ️   Local database is currently offline.');
  console.log('    To start local PostgreSQL: npm run db:local:start');
} finally {
  await prismaLocal.$disconnect().catch(() => {});
}

// 3. SUPABASE STORAGE CHECK
console.log('\n--- [3] Supabase Storage ---');
const supabaseUrl = combined.SUPABASE_URL || combined.NEXT_PUBLIC_SUPABASE_URL || 'https://yitwhjmqfdohwbqbnsmy.supabase.co';
const supabaseKey = combined.SUPABASE_SECRET_KEY || combined.SUPABASE_SERVICE_ROLE_KEY || combined.SUPABASE_PUBLISHABLE_KEY || '';
const bucketName = combined.SUPABASE_STORAGE_BUCKET || 'complaint-photos';

if (!supabaseKey) {
  console.log('⚠️  SUPABASE_SECRET_KEY is missing in .env');
} else {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      console.log('❌  Failed to list buckets: ' + error.message);
    } else {
      const hasBucket = buckets.some((b) => b.name === bucketName || b.id === bucketName);
      if (hasBucket) {
        console.log(`✅  Status: Supabase Storage active! Bucket "${bucketName}" exists and is ready.`);
      } else {
        console.log(`ℹ️   Creating bucket "${bucketName}" in Supabase...`);
        const { error: createErr } = await supabase.storage.createBucket(bucketName, { public: true });
        if (createErr) {
          console.log('⚠️  Could not auto-create bucket: ' + createErr.message);
        } else {
          console.log(`✅  Bucket "${bucketName}" created successfully!`);
        }
      }
    }
  } catch (err) {
    console.log('❌  Storage check error: ' + (err instanceof Error ? err.message : String(err)));
  }
}

// 4. AI CLASSIFICATION (GEMINI)
console.log('\n--- [4] Google Gemini AI Classification ---');
const geminiKey = combined.GEMINI_API_KEY || combined.GOOGLE_API_KEY || '';
const aiModel = combined.AI_MODEL || 'gemini-2.5-flash';

if (geminiKey) {
  console.log(`✅  Status: Gemini configured (Model: ${aiModel})`);
} else {
  console.log('ℹ️   GEMINI_API_KEY is not set yet in .env.');
  console.log('    Civic complaints will use deterministic rule-based triage fallback.');
  console.log('    To enable Gemini: Get an API key from https://aistudio.google.com and add GEMINI_API_KEY=... in .env');
}

console.log('\n================================================================');
console.log('Quick commands:');
console.log('  - Start dev servers:     npm run dev');
console.log('  - Deploy to Supabase:    node scripts/with-env.mjs .env.cloud -- npm run db:deploy');
console.log('  - Seed data:             npm run db:seed');
console.log('  - Start local Postgres:  npm run db:local:start');
console.log('================================================================\n');
