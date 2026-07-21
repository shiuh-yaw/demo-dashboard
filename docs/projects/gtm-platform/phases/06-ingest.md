# Phase 06 - Ingest pipeline: `POST /api/events`

> **Self-contained agent prompt.** Read this entire file, then `../DESIGN.md` (Ingest), `../PLAN.md` (Shared contracts - wire schema, endpoint behavior, `services.visitorSessions`).

## Your role

Build the dashboard's public event-ingest endpoint: validate tracker batches, sessionize, attribute to share links, derive geo/device server-side, and persist - strictly validated, rate-limited, idempotent, and invisible to demos when anything goes wrong.

One logical PR.

## Wave + dependencies

- Wave 3, after Phases 02 (imports `trackBatchSchema` from `@dynamic-demos/analytics`) and 03 (`services.visitorSessions`, `services.shareLinks`). Blocks 08, 09, 10. Parallel with 05.

## Skills to use

1. `superpowers:using-git-worktrees` - `.worktrees/gtm-06-ingest`, branch `gtm/06-ingest`.
2. `superpowers:test-driven-development`.
3. `superpowers:verification-before-completion`, `superpowers:requesting-code-review`.

## Hard rules

- **Raw IPs never persisted or logged.** `ipHash = sha256(ip + IP_HASH_SALT)` computed in-request via node `crypto`; the raw IP variable's lifetime ends inside the handler.
- Validation via the shared Zod schema imported from `@dynamic-demos/analytics` - do not redeclare it.
- Duplicate events (existing `TrackEvent.id`) and duplicate batches are 2xx-acks, never errors.
- Rate limiting on the existing Redis rails (reuse the webhook framework's limiter from `src/lib/webhooks/` if its shape fits; otherwise the same Upstash primitive with key `track:{ipHash}:{shareToken|anonId}`, ~120 req/min). 429 responses carry no body the tracker depends on (tracker drops silently by design). Amendment (review C1, 2026-07-21): `track:{ipHash}:{shareToken|anonId}` alone is bypassable by rotating the client-minted `anonId` every request, so implementations must add a second, coarser fixed-window limiter keyed on `ipHash` alone (no client-controlled fields) as a hard per-host ceiling, gating ahead of the finer per-session key.
- Invalid share tokens are NOT errors: the session persists unattributed (`shareLinkId: null`).
- One info log line per accepted batch, mirroring the webhook convention: `[track] batch session=<id> demo=<slug> events=<n> attributed=<bool> internal=<bool> durMs=<n>`. Event payloads at debug level only.

## Required reading before code changes

- `packages/analytics/src/schema.ts` (Phase 02).
- `services.visitorSessions.upsertFromBatch` + `services.shareLinks.resolveByToken` (Phase 03).
- `apps/dashboard/src/lib/webhooks/` - rate-limit + logging conventions to mirror.
- Vercel request geo headers: `x-vercel-ip-country`, `x-vercel-ip-country-region`, `x-vercel-ip-city` (URL-decode the city); client IP via `x-forwarded-for` first value / `x-real-ip`.

## What needs to happen

1. **`/api/events/route.ts`** (`POST` + `OPTIONS`):
   - CORS: allow origin only if in `TRACK_CORS_ORIGINS` (exact origin match); `OPTIONS` preflight returns the allow headers; `POST` from disallowed origins still processes `sendBeacon` payloads without an `Origin` match? No - beacons carry Origin; disallowed origin -> 403, no processing.
   - Parse JSON (also handle `text/plain` bodies - `sendBeacon` may send them), `trackBatchSchema.safeParse` -> 400 on failure.
   - Rate limit -> 429.
   - Resolve `shareToken` -> `shareLinkId | null`.
   - Derive geo from Vercel headers; parse UA (add `ua-parser-js` pinned via catalog, or a minimal internal parser if review prefers zero-dep - decide and document) into `{ device: "Desktop" | "Mobile" | "Tablet", os, browser }`.
   - `services.visitorSessions.upsertFromBatch(batch, meta)`.
   - 200 `{ ok: true }`.
2. **UA/geo helpers** as pure functions in `src/lib/track/` with their own unit tests (parse fixtures: Chrome macOS desktop, iOS Safari, unknown UA -> nulls).
3. **Env**: `IP_HASH_SALT`, `TRACK_CORS_ORIGINS` in env validation + `.env.example` placeholders (coordinate with Phase 05 on `TRACK_CORS_ORIGINS` - whichever merges second reuses).
4. **Tests** (route-level, per existing route-test patterns): valid batch 200 + rows persisted (mock services); duplicate event ids 200 without duplicate rows (service mock asserts skipDuplicates path); invalid schema 400; disallowed origin 403; rate-limit exceeded 429; invalid token -> attributed=null but 200; internal flag propagates; geo/UA parsing unit fixtures; raw IP never appears in any persisted/logged value (assert log lines + service-call args against the raw IP fixture).

## Acceptance criteria

- [ ] `pnpm turbo typecheck && lint && test` pass.
- [ ] Schema imported from `@dynamic-demos/analytics` (no local redeclaration).
- [ ] Raw-IP assertion test passes; `rg 'x-forwarded-for' apps/dashboard/src` shows the value never leaves `src/lib/track/`.
- [ ] Duplicate delivery is 2xx and row-idempotent.
- [ ] AGENTS.md updated (`/api/events` under API namespaces). spark26 untouched.

## PR title

`feat(dashboard): Phase GTM-06 - event ingest pipeline`

## After merge

Update `../PROGRESS.md`. Unblocks 08, 10; with 05 unblocks 09.

## Out of scope

- Aggregation queries/UI (08), enrichment (10 - but note the session-creation point where 10 will hook `after()`), context endpoint (05).
