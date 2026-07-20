# Phase 02 - `packages/analytics` tracker package

> **Self-contained agent prompt.** Read this entire file, then `../DESIGN.md`, `../PLAN.md` (Shared contracts - the wire schema and client API defined there are binding).

## Your role

Create `packages/analytics` (`@dynamic-demos/analytics`): the client tracker demo apps mount to report sessions, pageviews, steps, and milestone events to the dashboard ingest endpoint, plus the book-a-call CTA component. No database code - this package only speaks HTTP to endpoints that Phases 05/06 provide (you build against the contract, with tests using a mock fetch).

One logical PR.

## Wave + dependencies

- Wave 1. No dependencies. Blocks Phases 06 (imports the Zod schema) and 09.
- Parallel with Phase 01 (no file overlap).

## Skills to use

1. `superpowers:using-git-worktrees` - `.worktrees/gtm-02-analytics-package`, branch `gtm/02-analytics-package`.
2. `superpowers:test-driven-development` - the batching queue and fail-silent guarantees are test-first.
3. `superpowers:verification-before-completion`, `superpowers:requesting-code-review`.

## Hard rules

- **Fail-silent is the package's prime invariant.** Every public entry point wraps in try/catch; a thrown error inside the tracker must never propagate to the consuming app. Model this on `createSafeWrapper` from `@dynamic-demos/dynamic/client-singleton`.
- `props` payloads are size-capped client-side (2048 chars serialized) - oversized props are dropped with a `console.debug`, never an error.
- No dependencies beyond what the monorepo already catalogs (zod, react, nanoid/uuid - check `pnpm-workspace.yaml` catalog first; add to catalog if new).
- Follow the package conventions from an existing reference package (`packages/lifi` or `packages/blindpay`): tsconfig, vitest config, AGENTS.md from `docs/templates/AGENTS.template.md`, plus a `.claude/skills/analytics/SKILL.md` matching the 8 existing provider skills' shape.
- No em dash in docs; use "-".

## Required reading before code changes

- `../PLAN.md` Shared contracts: `trackEventSchema`, `trackBatchSchema`, client API, cookie names.
- `packages/dynamic/src/client-singleton` - `createSafeWrapper` pattern.
- `packages/lifi/` - package layout reference.
- `packages/theme/defaults.css` - the `--brand-*` tokens the CTA styles with.
- `docs/templates/AGENTS.template.md`.

## What needs to happen

### File structure

```
packages/analytics/
  src/
    schema.ts        // trackBatchSchema, trackEventSchema (verbatim from PLAN.md contracts) + types
    queue.ts         // EventQueue: enqueue, flush timer, size trigger, sendBeacon drain
    cookies.ts       // dd_anon / dd_share / dd_internal read-write helpers
    context.ts       // getShareContext(token) - fetch, {} on any failure, 3s timeout
    tracker.tsx      // <GtmTracker demoSlug> provider + auto pageview on route change + heartbeat
    use-track.ts     // useTrack() -> { milestone, step }
    cta.tsx          // <BookACallCta /> floating button
    index.ts         // public exports only: GtmTracker, useTrack, BookACallCta, schema exports
  __tests__/
    schema.test.ts, queue.test.ts, tracker.test.tsx, context.test.ts, cta.test.tsx
  AGENTS.md, package.json, tsconfig.json, vitest.config.ts
```

### Behavior spec

**`EventQueue`** (pure, no React): `enqueue(event)` batches; flush when 20 events queued or 5s elapsed (whichever first); flush POSTs `TrackBatch` to `${NEXT_PUBLIC_TRACK_URL}/api/track` with `keepalive: true`; on `visibilitychange -> hidden` drain via `navigator.sendBeacon`. Failed flushes retry once, then drop (fail-silent; no unbounded memory). Test with fake timers + mock fetch: batch-size trigger, time trigger, beacon drain, drop-after-retry.

**`<GtmTracker demoSlug>`**: on mount - ensure `dd_anon` cookie (uuid, 1y); generate per-tab `sessionId` (sessionStorage); read `?share=` -> `dd_share` cookie (30d); read `?internal=1` -> `dd_internal` cookie (1y); emit initial `pageview`. Subscribe to `usePathname()` changes -> `pageview` events with `path`. Heartbeat: every 15s while `document.visibilityState === "visible"`, enqueue a `pageview`-typed event named `heartbeat` (server uses it only to advance `lastSeenAt`). Every batch carries `sessionId`, `anonId`, `demoSlug`, `shareToken` (from cookie, if any), `isInternal` (from cookie).

**`useTrack()`**: `milestone(name, props?)` / `step(name)` enqueue typed events. Outside a `<GtmTracker>` provider they are no-ops (fail-silent), not errors.

**`<BookACallCta />`**: on mount calls `getShareContext(dd_share cookie token)`; renders nothing without a `cta` in the response. With one: fixed bottom-right button, `--brand-primary` background, opens `cta.url` in a new tab, label from `cta.label`. Emits a `step` event `book_a_call_clicked` on click.

**`getShareContext(token)`**: `GET ${NEXT_PUBLIC_TRACK_URL}/api/track/context?token=...`, 3s AbortController timeout, returns `{}` on non-200/network error/invalid JSON.

### Tests to write (test-first)

- Schema: valid batch parses; >50 events rejected; oversized props rejected; bad uuid rejected.
- Queue: triggers, beacon drain, retry-then-drop, no throw when fetch rejects.
- Tracker: cookies set from URL params; pageview on path change; events carry shareToken; no crash when `NEXT_PUBLIC_TRACK_URL` unset (tracker becomes a no-op).
- CTA: hidden without context; renders + click opens URL + emits step event with context.
- Fail-silent: a fetch that throws synchronously must not propagate (assert no unhandled rejection).

## Acceptance criteria

- [ ] `pnpm turbo typecheck && lint && test` pass; new package has its own vitest suite passing.
- [ ] Public export surface is exactly: `GtmTracker`, `useTrack`, `BookACallCta`, `getShareContext`, `trackBatchSchema`, `trackEventSchema`, `TrackBatch` type. (`getShareContext` is part of PLAN.md's binding client API - Phase 09 may need prospect context outside the CTA.)
- [ ] Zero runtime throw paths reach the consumer (code-review checklist item).
- [ ] AGENTS.md (frontmatter + body per template) and `.claude/skills/analytics/SKILL.md` ship in this PR; `scripts/generate-demo-registry.mjs` regenerated if it indexes packages.
- [ ] No app is modified (wallet mount is Phase 09).

## PR title

`feat(analytics): Phase GTM-02 - client tracker package`

## After merge

Update `../PROGRESS.md`. Phase 06 may now import `@dynamic-demos/analytics` schema exports.

## Out of scope

- Ingest endpoint, context endpoint (Phases 06, 05).
- Session replay, enrichment pixel slot wiring (post-v1; leave a named TODO-free extension point: the tracker accepts an optional `children`-adjacent `pixelSlot?: ReactNode` prop rendered after init).
- Mounting into any demo app.
