# Implementation Progress

Resume file for any session continuing this work. Newest entries first.

## How to resume

```powershell
node scripts/local-postgres.mjs start     # project DB on 5433 (never touch 5432)
npm run dev:api                            # API on http://localhost:4000
npm run dev:web                            # Web on http://localhost:3000
```

Rules in force: never reset or truncate the dev database (`fixmycity`); destructive tests only against `fixmycity_test`; do not touch the 5432 service; seed must stay idempotent.

## Log

### 2026-10-08: backend hardening and automated tests (session paused here)
- Seed rewritten to be idempotent (`prisma/seed.ts`): create-if-missing by natural keys, never deletes or renumbers. Verified: two runs on the dev DB changed nothing (11 users, 18 complaints); fresh test DB gets full demo data, second run creates nothing. Old destructive seed kept at `.local/seed.destructive.bak.ts`.
- Supabase-ready config: `directUrl` in schema, `DIRECT_URL` + `APP_ENV` in `.env`/`.env.example`, `.env.cloud.example`, `scripts/db-guard.mjs` (blocks `db:migrate`/`db:reset:local` on non-local hosts, reset needs `FMC_CONFIRM_RESET=yes`), `scripts/with-env.mjs`. Seed refuses remote hosts and production by default. All guards verified.
- Bug found by tests and fixed: blank multipart latitude/longitude was coerced to 0 (complaint saved at 0,0). Regression test added.
- Lint: API 0 problems; web went from 16 errors to 0 errors and 0 warnings (React 19 hooks rules fixed via `src/lib/hooks.ts`, no rules disabled).
- Results: shared unit tests 16/16 pass; API integration tests 58/58 pass (`npm run test -w @fixmycity/api`, runs only against `fixmycity_test`); typecheck passes for shared, api, web.
- **E2E (Playwright) NOT yet passing; no test has executed.** Run 1: all 12 failed because Playwright 1.64's chromium headless shell (build 1248) is not installed. Run 2 with `PW_CHANNEL=msedge`: global setup failed at `npx prisma migrate deploy` (in `apps/web/e2e/global-setup.ts`); root cause not yet investigated. Next step: run that command manually with the test DB env to see the error, fix it, then run `PW_CHANNEL=msedge npx playwright test` in `apps/web`.
- Still to do: E2E green, production builds (`npm run build`), landing preview screenshots (`apps/web/public/screens/*.png` are referenced but not yet captured, so the dashboard-preview section shows empty images), docs (README, ARCHITECTURE, DATABASE, API, TEST_REPORT, SECURITY_AUDIT, DEPLOYMENT, FEATURE_MATRIX, HACKATHON_DEMO).

### 2026-10-08: frontend completed and core workflow verified in the browser
- Built: app shell (collapsible sidebar, mobile drawer, live indicator, notification bell), auth pages (login, register, forgot, reset), public pages (landing with 10 sections, services, about, help, city updates, report-issue), citizen portal (12 pages), admin portal (11 pages), department portal (6 pages), not-found and error boundaries, `proxy.ts` route guard plus server-side role checks in each workspace layout.
- API additions: `GET /` info, `GET /health` (liveness), `GET /ready` (readiness with 3 s DB timeout), `from` date filter on announcements.
- Fixed: CARTO tile CDN is blocked on this network (TLS reset) so maps now use standard OSM tiles with a dark CSS filter; hero headline wrapping; hero and page-transition content no longer server-rendered at opacity 0.
- Verified manually in the browser (real UI, real API, real DB): citizen submitted FMC-2026-000018 with photo and map pin, rule suggestion Potholes / Road Maintenance / High; admin assigned it with confirmation; officer started work, posted a public note, resolved with a resolution photo; citizen sees Resolved, full timeline and 5 notifications. Live socket toasts observed.
- Next: idempotent seed, Supabase configuration, API integration tests, Playwright E2E, screenshots for the landing preview, responsive and accessibility pass, docs.

### 2026-10-08: baseline audit
- Verified state recorded in `docs/CURRENT_STATE_AUDIT.md`.
- Fixed: local Postgres hung after its parent terminal was closed. Restarted detached via `scripts/local-postgres.mjs` (now `windowsHide`). Data intact (17 complaints).
