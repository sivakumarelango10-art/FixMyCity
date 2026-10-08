# Database

PostgreSQL with Prisma 6 (`prisma/schema.prisma`). One schema and one migration history serve both local development and the cloud (Supabase); only connection strings differ.

## Environments

| Environment | Where | Database | How it is configured |
|---|---|---|---|
| Local development | Project cluster in `.local/pgdata`, port **5433**, localhost only | `fixmycity` | `.env` (`DATABASE_URL`, `DIRECT_URL`, `APP_ENV=local`) |
| Automated tests | Same cluster | `fixmycity_test` (wiped by test setup) | `TEST_DATABASE_URL` in `.env`, `.env.test` |
| Cloud (staging / production) | Supabase | `postgres` | Host secrets, or `.env.cloud` (git-ignored) for one-off commands |

The Windows service `postgresql-x64-18` on port 5432 belongs to the machine's own PostgreSQL installation. FixMyCity does not use or modify it.

## Local cluster

```powershell
npm run db:local:init    # first time: create cluster in .local/pgdata + databases fixmycity, fixmycity_test
npm run db:local:start   # start (idempotent)
npm run db:local:stop
node scripts/local-postgres.mjs status
```

`scripts/local-postgres.mjs` finds PostgreSQL 15 to 18 binaries automatically (override with `PG_BIN`). On Windows it starts the server through WMI (`Win32_Process.Create`). Started any other way from a terminal or automation tool, the server inherits that tool's Windows Job Object and is terminated when the job closes. That happened twice during development (backends exiting with `0xC0000142` and `0xC000013A`, then the postmaster disappearing). WMI-created processes belong to no caller job.

Credentials for the local cluster are development-only: user `fixmycity`, password `fixmycity_dev_pw`, localhost connections only.

## Schema

18 tables. Complaint history is append-only: status changes, assignments and notes are separate rows, and the complaint row holds the current state.

| Table | Purpose | Key constraints |
|---|---|---|
| `users` | Accounts and roles | unique `email`; argon2id `passwordHash` |
| `sessions` | Server-side sessions | unique `tokenHash` (SHA-256 of the cookie), `expiresAt` index, cascade on user delete |
| `password_reset_tokens` | Single-use reset links | unique `tokenHash`, `usedAt` |
| `departments` | Municipal departments | unique `code`, unique `name` |
| `department_memberships` | Officer to department | unique (`userId`, `departmentId`) |
| `complaints` | Current state of each report | unique `trackingNumber` (sequence) and `trackingId`; indexes on citizen, status, category, department+status, created date, coordinates |
| `complaint_attachments` | Evidence and resolution photos | unique relative `storageKey` (never an absolute path) |
| `complaint_assignments` | Every (re)assignment | department, previous department, who, when, notes |
| `complaint_status_history` | Every status change | previous and new status, actor, reason |
| `complaint_notes` | Public updates and internal notes | `visibility` PUBLIC / INTERNAL |
| `ai_classifications` | Suggestions and their review outcome | `classificationSource` LLM / RULE_BASED, `reviewOutcome` PENDING / ACCEPTED / OVERRIDDEN |
| `complaint_feedback` | Citizen rating | unique `complaintId` |
| `utility_accounts` | Simulated accounts | unique `demoAccountNumber`, unique (`citizenId`, `serviceType`) |
| `utility_bills` | Simulated bills | unique (`accountId`, `billingPeriod`) |
| `demo_payments` | Simulated payments | unique `idempotencyKey`, unique `referenceNumber`, unique `successfulBillId` (one success per bill) |
| `announcements` | City notices | status, publish and expiry dates |
| `notifications` | Per-user alerts | indexes on (user, read) and (user, date) |
| `audit_logs` | Sensitive actions | entity, actor and date indexes; no secrets stored |

Deletion behaviour: complaints and their history cascade together; users with complaints cannot be deleted (`Restrict`), so history is never orphaned; departments referenced by assignment history cannot be deleted.

### Tracking IDs

`trackingNumber` is a `SERIAL` column. The API reserves the next value with `nextval(pg_get_serial_sequence('complaints', 'trackingNumber'))` inside the creating transaction and formats `FMC-<year>-<6 digits>`. Numbers are never reused, never computed by counting rows, and the seed never resets the sequence.

### Transactions

Multi-row writes run in a single `prisma.$transaction`: complaint creation (complaint, attachments, first status row, classification, notification, audit), assignment, status changes, notes, demo payment (bill row locked `FOR UPDATE`). Status changes lock the complaint row with `SELECT ... FOR UPDATE`, so concurrent updates serialize (covered by an API test). Realtime events are emitted only after commit.

## Migrations

```powershell
npm run db:status        # prisma migrate status (prints the masked target first)
npm run db:migrate       # prisma migrate dev: LOCAL ONLY, refused for remote hosts
npm run db:deploy        # prisma migrate deploy: applies committed migrations, never resets (use for cloud)
npm run db:reset:local   # wipes the LOCAL database; refused unless FMC_CONFIRM_RESET=yes
npm run db:test:prepare  # apply migrations to fixmycity_test
```

`scripts/db-guard.mjs` runs before these commands. It prints the runtime and migration targets with the password masked and blocks `db:migrate` and `db:reset:local` unless both URLs point at localhost and `APP_ENV` is not `production`.

Current migration: `20261008152543_init`.

## Seeding

`npm run db:seed` runs `prisma/seed.ts`. It is idempotent and non-destructive:

- departments are matched by `code`, users by `email`, demo complaints and demo announcements by title among `isDemo = true` records, utility accounts by citizen and service
- existing rows are never updated, deleted or renumbered; real (non-demo) complaints are never touched
- running it twice creates nothing the second time (verified on the development database and on an empty test database)

Profiles (`SEED_PROFILE`): `reference` creates departments only; `demo` (default locally) adds demo accounts, 16 complaints with full histories, simulated bills and notices.

Safety: `APP_ENV=production` refuses to run unless `SEED_ALLOW_PRODUCTION=true`, and then only the `reference` profile. Any non-local database host is refused unless `SEED_ALLOW_REMOTE=true`, and even then defaults to `reference`.

Demo accounts (development only, documented in the README) use known passwords and must never exist in production.

## Supabase

Supabase provides the hosted PostgreSQL. Supabase Auth and the Supabase browser client are not used: the Express API keeps its own session authentication and enforces every permission itself. Because the API connects with a server-side database role, Row Level Security does not protect Prisma queries, so authorization lives in the API (and is covered by tests).

1. In Supabase, create a dedicated `prisma` database role as described in Supabase's Prisma guide (Connect > ORMs > Prisma).
2. Connection strings, following Supabase's current guidance for a long-running server:
   - `DATABASE_URL`: Supavisor **session** pooler, port 5432, user `prisma.<project-ref>`
   - `DIRECT_URL`: the same session pooler string, or the direct host if your network has IPv6 or the IPv4 add-on
   - add `sslmode=require`
   - transaction mode (port 6543, `?pgbouncer=true`) is only for serverless runtimes; the FixMyCity API is a long-running server
3. Copy `.env.cloud.example` to `.env.cloud`, fill it in, then:

```powershell
node scripts/with-env.mjs .env.cloud -- npm run db:status
node scripts/with-env.mjs .env.cloud -- npm run db:deploy
node scripts/with-env.mjs .env.cloud -- npx prisma db seed   # with SEED_ALLOW_REMOTE=true and SEED_PROFILE=reference: departments only
```

Status: the configuration is in place, but no Supabase credentials were provided, so no cloud connection, migration or test has been run.

## Photo storage

| Driver | Use | Notes |
|---|---|---|
| `local` (default) | Development | Files under `apps/api/uploads/complaints/<complaintId>/<attachmentId>.webp`; database stores the relative key. Not durable on most hosts |
| `s3` | Cloud | Any S3-compatible store. For Supabase Storage: endpoint `https://<project-ref>.storage.supabase.co/storage/v1/s3`, region from the S3 settings page, a **private** bucket, S3 access keys (server-only, they bypass RLS). Path-style requests are used |

Photos are always served through `GET /api/complaints/:id/attachments/:attachmentId`, which checks the caller may view the complaint, so buckets stay private. The S3 adapter is implemented but has not been tested against a real bucket.
