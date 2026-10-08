# FixMyCity API reference

Express 5 REST API in `apps/api`. Base path `/api`. All bodies are JSON unless stated (complaint and photo uploads are `multipart/form-data`).

## Conventions

| Topic | Behaviour |
|---|---|
| Success | `{ "data": ... }`; list endpoints add `"meta": { page, pageSize, total, totalPages }` |
| Errors | `{ "error": { "code", "message", "fields"? } }`. `fields` maps a field path to its message |
| Status codes | 200 ok, 201 created, 400 validation, 401 not signed in, 403 forbidden / CSRF, 404 not found (also used when a record exists but the caller may not see it), 409 conflict, 413 upload too large, 422 invalid state transition, 429 rate limited, 500 server, 503 not ready |
| Auth | HttpOnly `fmc_session` cookie (SameSite=Lax, Secure when `COOKIE_SECURE=true`), 7-day sliding expiry |
| CSRF | Every non-GET request needs `X-CSRF-Token` equal to the readable `fmc_csrf` cookie (double submit). A foreign `Origin` header is rejected |
| Validation | Zod schemas from `packages/shared/src/schemas` (shared with the web app) |
| Pagination | `page` (default 1), `pageSize` (default 10, max 100) |
| Rate limits | API-wide 600/min per IP; auth 30 per 10 min (300 outside production); complaints 20/hour per user (200 outside production); AI 15/min per user; payments 20/min per user. Disabled in tests |

Roles: `CITIZEN`, `DEPARTMENT_OFFICER`, `ADMIN`, `SUPER_ADMIN`. "Admin" below means ADMIN or SUPER_ADMIN; "Staff" means officer or admin.

## Health

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/` | Public | Service info and links (not under `/api`) |
| GET | `/health` | Public | Liveness: process is serving. No dependency checks |
| GET | `/ready` | Public | Readiness: database `SELECT 1` with 3 s timeout and storage check. 503 when not ready |
| GET | `/api/health` | Public | Same readiness checks, reachable through the web app's `/api` proxy |

## Authentication `/api/auth`

| Method | Path | Access | Request | Response / notes |
|---|---|---|---|---|
| GET | `/csrf` | Public | | `{ csrfToken }`, sets `fmc_csrf` cookie |
| POST | `/register` | Public | `name, email, password, phone?` | 201 `SessionUser`. Always creates a CITIZEN (any `role` field is ignored). Provisions simulated bills. 409 `EMAIL_TAKEN` |
| POST | `/login` | Public | `email, password` | `SessionUser`, sets session cookie, rotates CSRF cookie. 401 `INVALID_CREDENTIALS` (same message for unknown email), 403 `ACCOUNT_DISABLED` |
| POST | `/logout` | Any | | Deletes the session row and cookie |
| GET | `/me` | Signed in | | `SessionUser` (includes department memberships) |
| GET | `/socket-token` | Signed in | | `{ token, expiresIn: 300 }` HMAC-signed token for Socket.IO |
| POST | `/forgot-password` | Public | `email` | Always 200 (no account enumeration). Sends link by SMTP, or logs it in development |
| POST | `/reset-password` | Public | `token, password` | Single use, 30 minutes. Signs out all sessions |

## Account `/api/users`

| Method | Path | Access | Notes |
|---|---|---|---|
| PATCH | `/me` | Signed in | `name, phone?, ward?` |
| POST | `/me/password` | Signed in | `currentPassword, newPassword`; signs out other sessions |
| GET | `/me/sessions` | Signed in | Active sessions with device hints |
| DELETE | `/me/sessions/:sessionId` | Signed in | Revoke one of your own sessions |

## Complaints `/api/complaints`

Visibility rule used everywhere: a citizen sees their own complaints, an officer sees complaints assigned to their department(s), an admin sees all. Anything else returns 404.

| Method | Path | Access | Request | Notes |
|---|---|---|---|---|
| POST | `/` | Citizen | multipart: `title (8-120), description (20-2000), category, latitude, longitude, address (5-200), additionalNotes?`, `photos` (1-3 files, JPEG/PNG/WebP, 5 MB each) | 201 `{ id, trackingId, status, classification }`. Bytes are verified with sharp, EXIF stripped, re-encoded to WebP plus thumbnail. Blank coordinates are rejected (never coerced to 0). Tracking number comes from a Postgres sequence |
| GET | `/` | Signed in | `page, pageSize, search, status, category, priority, departmentId (uuid or "unassigned"), from, to (YYYY-MM-DD), sort (createdAt, updatedAt, priority, trackingNumber, title), order` | Scoped list |
| GET | `/nearby` | Signed in | `latitude, longitude, category?, radiusMeters (50-2000, default 400), text?` | Up to 5 possible duplicates, public-safe fields plus `distanceMeters, similarity` |
| GET | `/:id` | Visibility rule | | `ComplaintDetail` with timeline, classification, attachments and a `permissions` block (allowed status changes, can assign, can reopen, can rate). Citizens never receive internal notes or assignment notes |
| GET | `/:id/history` | Visibility rule | | Timeline only |
| GET | `/:id/attachments/:attachmentId?size=thumb` | Visibility rule | | Image bytes (`image/webp`), `Cache-Control: private` |
| PATCH | `/:id/status` | Staff | `status, reason?, resolutionSummary?` | Enforces the shared state machine and role edges. `ASSIGNED` is not allowed here (use assign). Reason required for REJECTED/REOPENED; resolution summary (10+ chars) for RESOLVED. Row-locked; 422 `INVALID_TRANSITION` |
| POST | `/:id/notes` | Admin or assigned officer | `body, visibility (PUBLIC/INTERNAL)` | Public notes notify the citizen |
| POST | `/:id/resolution-photos` | Admin or assigned officer | multipart `photos` | Stored as `RESOLUTION` attachments |
| POST | `/:id/reopen` | Owning citizen | `reason (10+)` | Only from RESOLVED, within 30 days |
| POST | `/:id/feedback` | Owning citizen | `rating (1-5), comment?` | Once per complaint, only when RESOLVED |

Status machine (`packages/shared/src/constants/status.ts`):

```
SUBMITTED    -> UNDER_REVIEW | ASSIGNED* | REJECTED
UNDER_REVIEW -> ASSIGNED* | REJECTED
ASSIGNED     -> IN_PROGRESS
IN_PROGRESS  -> RESOLVED
RESOLVED     -> REOPENED
REJECTED     -> UNDER_REVIEW
REOPENED     -> UNDER_REVIEW | ASSIGNED* | IN_PROGRESS
(* only through the assign endpoint)
```

Officers may only move ASSIGNED to IN_PROGRESS, IN_PROGRESS to RESOLVED and REOPENED to IN_PROGRESS on their own department's complaints. Citizens may only reopen.

## Classification `/api/ai`

| Method | Path | Access | Request | Notes |
|---|---|---|---|---|
| POST | `/classify-complaint` | Signed in | `title?, description, category?` | Advisory preview, nothing stored. Returns `suggestedCategory, suggestedDepartmentCode, suggestedDepartmentName, suggestedPriority, explanation, source (RULE_BASED or LLM), model, signals, fallbackReason?`. Uses the local rule set unless `ANTHROPIC_API_KEY` is set; any LLM failure falls back to the rules |

## Citizen dashboard and utilities

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/api/dashboard` | Citizen | Status counts, pending bills, upcoming bills, recent complaints and activity, unread count, latest notices |
| GET | `/api/utilities/bills?status&serviceType` | Citizen | Own simulated bills only |
| GET | `/api/utilities/bills/:billId` | Citizen | 404 for other citizens' bills |
| POST | `/api/utilities/bills/:billId/demo-pay` | Citizen | Header `Idempotency-Key` (16-100 chars). 201 new payment, 200 replay of the same key, 409 `ALREADY_PAID`, 409 `IDEMPOTENCY_KEY_REUSED`. Bill row locked with `SELECT ... FOR UPDATE`; `demo_payments.successfulBillId` is unique, so only one success per bill can exist |
| GET | `/api/utilities/payment-history` | Citizen | Own simulated payments |
| GET | `/api/utilities/payments/:paymentId` | Citizen | Receipt data |

## Public information

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/api/public/map?status&category&from&to` | Public | Up to 500 markers with id, tracking ID, title, category, status, coordinates, address, date, demo flag, `isMine`. Never citizen identity, contact details or notes. Rejected complaints excluded unless requested |
| GET | `/api/public/stats` | Public | Totals and category counts |
| GET | `/api/departments` | Public | Active departments |
| GET | `/api/announcements?page&pageSize&category&search&from` | Public | Published, already live and not expired |
| GET | `/api/announcements/:id` | Public | Same visibility rule |

## Notifications `/api/notifications`

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/?page&pageSize&unreadOnly` | Signed in | Own notifications; `X-Unread-Count` header |
| GET | `/unread-count` | Signed in | |
| PATCH | `/:id/read` | Signed in | Scoped to own notifications |
| POST | `/read-all` | Signed in | |

## Department officer `/api/department`

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/overview` | Officer | Counts, urgent work, recent items, average resolution (shown only with 3+ resolved) |
| GET | `/complaints` | Officer | Same query parameters as `/api/complaints`, scoped to the officer's departments |
| GET | `/history?page&pageSize` | Officer | Resolved complaints and the officer's own status changes |

## Administration `/api/admin` (Admin only)

| Method | Path | Notes |
|---|---|---|
| GET | `/complaints` | Same query parameters as `/api/complaints`, all complaints, includes citizen name |
| GET | `/complaints/:id` | Detail |
| PATCH | `/complaints/:id/assign` | `departmentId, priority?, category?, notes?`. Allowed from SUBMITTED, UNDER_REVIEW, ASSIGNED, IN_PROGRESS, REOPENED. Records assignment history, status history, review outcome of the suggestion (ACCEPTED or OVERRIDDEN), notifications for citizen and officers, audit log, in one transaction |
| PATCH | `/complaints/:id/status` | Same rules as `/api/complaints/:id/status` |
| POST | `/complaints/:id/classify` | Re-run classification and store the result |
| GET | `/analytics?days=7..365` | Totals, average resolution, by category/status/priority, daily trend, department workload, weekly resolution trend, repeat locations, recent audit entries |
| GET | `/departments` | With workload stats and officers |
| POST | `/departments` | `name, code, description, contactEmail?, active` |
| PATCH | `/departments/:id` | Partial update |
| GET | `/users?page&pageSize&search&role` | |
| POST | `/users` | Create staff: `name, email, password, role (DEPARTMENT_OFFICER or ADMIN), departmentId?`. Only SUPER_ADMIN may create ADMIN; officers need a department |
| PATCH | `/users/:id` | `role?, isActive?, departmentIds?`. No self role change or self deactivation; only SUPER_ADMIN may modify admins; role changes and deactivation end the user's sessions |
| GET | `/announcements?page&pageSize&status&category&search` | All statuses |
| POST | `/announcements` | `title, summary?, content, category, status, publishedAt?, expiresAt?, pinned` |
| PATCH | `/announcements/:id` | Partial update; publishing emergency or featured notices notifies citizens |
| DELETE | `/announcements/:id` | Deletes never-published drafts, archives everything else |
| GET | `/utilities` | Aggregate simulated billing figures and recent demo payments |
| GET | `/audit-logs?page&pageSize&entityType&action&search` | |
| GET | `/system` | AI provider, storage driver, email, realtime client count, database status |

## Realtime (Socket.IO)

Path `/socket.io` on the API origin. The client fetches `/api/auth/socket-token` and passes it in `auth.token`; connections without a valid token are refused with `UNAUTHORIZED`.

Rooms: `user:<id>`, `admins`, `dept:<departmentId>`, `authenticated`.

| Event | Sent to | Payload |
|---|---|---|
| `complaint.created`, `complaint.assigned`, `complaint.status_changed`, `complaint.resolved`, `complaint.updated` | admins, the owning citizen, the assigned (and previous) department | `{ complaintId, trackingId, status, departmentId, at }` |
| `notification.created` | the recipient only | `{ notificationId, title, message, link, type }` |
| `announcement.published` | all signed-in sockets | `{ announcementId, title, category }` |
| `bill.paid` | the paying citizen | `{ billId }` |

Payloads contain identifiers only. Clients refetch details through the REST API, which applies the visibility rules. Events are emitted only after the database transaction commits.
