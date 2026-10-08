# FixMyCity: Current State Audit

Verified on 2026-10-08 by running commands against the repository and the local database. Where this differs from earlier progress reports, the evidence below wins.

## Environment

| Item | Verified value |
|---|---|
| OS / shell | Windows 11, PowerShell 5.1 and Git Bash |
| Node.js / npm | 24.14.0 / 11.9.0 |
| Package manager | npm workspaces (`package-lock.json`); pnpm is installed but unused |
| Git | **Not a git repository** (`fatal: not a git repository`) |
| PostgreSQL | 18.4. Project cluster in `.local/pgdata` on **5433** (localhost only). A separate Windows service `postgresql-x64-18` owns **5432** and is not used or modified |

## Structure

```
apps/api        Express 5 + TypeScript API, Prisma, Socket.IO
apps/web        Next.js 16 App Router frontend
packages/shared Zod schemas, domain constants, status state machine, rule-based classifier, DTO types
prisma/         schema.prisma, migrations/20261008152543_init, seed.ts
scripts/        local-postgres.mjs (init/start/stop/status for the 5433 cluster)
```

## Installed stack (actual, from node_modules)

| Layer | Planned | Installed |
|---|---|---|
| Frontend | Next.js, React, TS, Tailwind, shadcn/ui, Lucide, Motion, TanStack Query, RHF, Zod, Recharts | next 16.4.0, react 19.3.0, tailwindcss 4.3.3, motion 12.43, @tanstack/react-query 5.104, react-hook-form, zod 4.6.5, recharts 3.10.1, Radix primitives (owned shadcn-style components) |
| Icons | Lucide React | **@phosphor-icons/react 2.1.10** (chosen under the taste-skill design rules; one icon family across the app) |
| Backend | Express, TS, sessions, CSRF, RBAC, Socket.IO | express 5.2.1, socket.io 4.8, multer 2, sharp 0.34.5, helmet, express-rate-limit, pino, @node-rs/argon2 |
| ORM / DB | Prisma + PostgreSQL | prisma / @prisma/client 6.19.3, PostgreSQL 18.4 |
| Maps | Leaflet + OSM | leaflet 1.9.4, react-leaflet 5 (OSM data via CARTO basemap tiles) |
| AI | Rule-based + optional LLM | Rule classifier in `packages/shared`; optional Anthropic SDK path, off unless `ANTHROPIC_API_KEY` is set |
| Storage | Local + cloud | Local disk adapter; S3-compatible adapter via `aws4fetch` (the AWS SDK failed to install because of a broken transitive version) |
| Tests | Vitest, Supertest, Playwright | vitest 3.2.7, supertest 7, @playwright/test installed |

## Database (verified)

- `prisma migrate status`: "Database schema is up to date" (1 migration, 18 tables).
- Row counts: users 11, complaints 17, status history 52, attachments 1, utility bills 18, demo payments 6, announcements 6, audit logs 39. Highest tracking number 17 (FMC-2026-000017).
- Uploaded file for FMC-2026-000017 exists at `apps/api/uploads/complaints/<complaintId>/<attachmentId>.webp`; the DB stores the relative key only.

## Verification results

| Check | Result |
|---|---|
| `packages/shared` typecheck | Pass |
| `packages/shared` unit tests | 15 / 15 pass |
| `apps/api` typecheck | Pass |
| `apps/web` typecheck (existing files) | Pass |
| API `GET /api/health` | Pass (earlier today, while API was running) |
| Auth (citizen/admin/officer login), CSRF rejection, cross-role denial, complaint create with photo | Pass (curl smoke test) |
| Admin assign, officer status/resolve, notifications, demo payment | **Not yet exercised** |
| Frontend build / run | **Never run**; most routes do not exist yet |

## Issues found during this audit

1. **Local database stopped accepting connections (critical, fixed).** Root cause: the cluster was started from an agent terminal and inherited its console. When that terminal task was stopped at 22:16, new backend processes failed with `0xC0000142` and the postmaster looped on `could not reserve shared memory region ... error code 487`. Fix: stopped the project cluster only, restarted it detached with its own hidden console via `scripts/local-postgres.mjs` (`windowsHide`, `detached`, no inherited stdio). All data verified intact afterwards.
2. **`GET /` on port 4000 returns 404.** The API has no root route; the preview pane was pointed at it. `/api/health` works. Root, liveness and readiness routes still to be added.
3. **`/c/...` path error** came from a Git Bash smoke-test script passing a POSIX path to Node, not from the application.
4. **Seed is destructive.** `prisma/seed.ts` deletes all rows and restarts the tracking sequence. Must become idempotent before it is run again.
5. **No git repository.** Changes cannot be diffed or reverted with git.

## Requirement checklist

States: Complete and tested / Complete but untested / Partial / Missing / Blocked.

| Requirement | State |
|---|---|
| Database schema, migration, local cluster | Complete and tested |
| Shared rules (statuses, validation, classifier) | Complete and tested |
| Auth API (sessions, CSRF, roles) | Complete and tested (smoke) |
| Complaint create + photo + tracking ID + classification | Complete and tested (smoke) |
| Assign / officer workflow / resolve / reopen / feedback | Complete but untested |
| Utilities + idempotent demo payment | Complete but untested |
| Announcements, notifications, departments, users, analytics, audit API | Complete but untested |
| Realtime (Socket.IO, token auth, rooms) | Complete but untested |
| API root/liveness/readiness routes | Partial (`/api/health` only) |
| Idempotent seed | Missing (current seed is destructive) |
| Supabase configuration (pooled + direct URLs, storage) | Partial (S3-compatible adapter only) |
| Frontend design system, providers, primitives, maps | Partial (written, typechecks, never rendered) |
| Landing page | Partial (5 of ~10 sections, no page file) |
| Public pages, auth pages | Missing |
| Citizen portal (11 pages) | Missing |
| Admin portal (10 pages) | Missing |
| Department portal (4 pages) | Missing |
| API integration tests, Playwright E2E | Missing |
| Documentation | Missing |
| Deployment | Blocked (no cloud credentials provided) |
