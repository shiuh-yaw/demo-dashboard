# Phase 08 - Analytics surfaces

> **Self-contained agent prompt.** Read this entire file, then `../DESIGN.md` (Dashboard IA - analytics drawer; success criteria), `../PLAN.md` (services.analytics contract). The Coast reference the design mirrors: drawer with Total Sessions / Total Viewers / Avg Session Duration stat tiles, a Viewers tab (identified person or "Anonymous" + geo, device, expandable per-session rows) and a Sessions tab (viewer, duration, events, step views, device, location, timestamps, date).

## Your role

Replace Phase 07's stubs with real aggregation queries and build the per-demo analytics drawer + the org-wide `/dashboard/analytics` page.

One logical PR.

## Wave + dependencies

- Wave 5, after Phases 06 (data exists) and 07 (surfaces exist).

## Skills to use

1. `superpowers:using-git-worktrees` - `.worktrees/gtm-08-analytics`, branch `gtm/08-analytics-surfaces`.
2. `dataviz` before writing ANY chart code (sessions-by-demo bar chart).
3. `superpowers:test-driven-development` for the aggregation queries.
4. `superpowers:verification-before-completion`, `superpowers:requesting-code-review`.

## Hard rules

- Aggregations are SQL/Prisma aggregate queries, not fetch-all-and-reduce in JS. Add indexes in a migration if a query plan needs one (document with `EXPLAIN` output in the PR).
- `isInternal` sessions are excluded from all prospect-facing stats by default, with a visible "include internal" toggle.
- Enrichment JSON renders defensively: person name/avatar/linkedin if present, else company, else "Anonymous" + geo. Never render raw enrichment JSON.
- Duration displayed as `HH:MM:SS`; sessions with a single event show `00:00:00` (matches Coast semantics), not blank.
- Charts follow the dataviz skill; droplet components via the Phase 07 shim.
- All aggregates respect team visibility (GTM-D-003, Phase 04's `visibleProspectIds`) - a MEMBER's org overview and per-prospect rollups only cover prospects their team(s) can see; ADMIN+ is unscoped.

## Required reading before code changes

- `services.visitorSessions` write shapes (Phase 03/06) - what the rows look like, heartbeat semantics (`lastSeenAt` advances without event rows).
- Phase 07's `services.analytics.demoSummary` stub call sites (contract is fixed: `{ sessions, viewers, avgDurationSec }`).
- The Demos-table drawer trigger (Phase 07).

## What needs to happen

1. **`services.analytics`** (`src/lib/services/analytics.ts`):
   - `demoSummary(demoConfigId, { includeInternal = false })` -> `{ sessions, viewers, avgDurationSec }` (viewers = distinct anonId; duration = `lastSeenAt - startedAt`).
   - `viewers(demoConfigId, opts)` -> grouped by anonId: `{ anonId, identity: { name?, email?, avatarUrl?, linkedinUrl?, company? } | null, geo, device, sessionCount, sessions: [...] }` (identity from the latest session's enrichment JSON).
   - `sessions(demoConfigId, opts)` -> flat session rows with `eventCount`, `stepViewCount` (events where `type IN ("step","pageview")` - count pageviews as step views for Coast parity, document this), timestamps.
   - `orgOverview({ days = 30 })` -> `{ byDemo: [{ demoConfigId, name, prospectName, sessions }], totals, recentSessions: [...] }`, scoped by `visibleProspectIds(user)`; leads with "recently active prospects" (see item 5).
   - `prospectSummary(prospectId)` -> per-prospect rollup: sessions across all its demos, last-active timestamp, milestone depth, and a simple engagement score (document the formula in the service file).
   - Tests: fixtures with known rows -> exact expected aggregates; internal-exclusion; distinct-viewer counting; empty demo -> zeros; team-visibility scoping (MEMBER sees only their teams' prospects, ADMIN+ sees all).
2. **Analytics drawer** (Demos table): stat tiles + Viewers/Sessions tabs per the Coast reference; "Analytics updated" timestamp; per-viewer expandable session table.
3. **`/dashboard/analytics`**: sessions-by-demo bar chart (dataviz skill), totals row, recent-sessions list (prospect, demo, duration, geo, when). Placeholder slot for the future live view stream (post-v1) - an empty-state card, not a fake feed.
4. **Wire the Demos-table sessions/viewers columns** to `demoSummary` (replacing stub internals; call sites unchanged).
5. **Prospect-level rollups**: the Prospects detail page's Engagement tab (Phase 07) and the org analytics page both surface `prospectSummary` data; the org page leads with a "recently active prospects" list (most recent `lastActive` first) ahead of the sessions-by-demo chart.

## Acceptance criteria

- [ ] `pnpm turbo typecheck && lint && test` pass; aggregate tests assert exact numbers from fixtures.
- [ ] Drawer renders the three stat tiles + both tabs; screenshot in PR.
- [ ] Internal sessions excluded by default, toggle works.
- [ ] No unindexed sequential scan on the hot queries (EXPLAIN evidence in PR).
- [ ] AGENTS.md updated. spark26 untouched.

## PR title

`feat(dashboard): Phase GTM-08 - analytics drawer + org analytics`

## After merge

Update `../PROGRESS.md`. With 09 merged, run the DESIGN.md success-criteria walkthrough end-to-end and record it in `../PROGRESS.md`.

## Out of scope

- Live view stream, Slack notifications, CSV export, CRM sync (post-v1). Session replay (post-v1).
