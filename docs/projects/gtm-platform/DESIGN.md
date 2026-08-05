# GTM Platform - Design Spec

Date: 2026-07-17
Status: Approved design, pending implementation plan
Owner: demos team

## Goal

Transform `apps/dashboard` from an internal operator tool into Dynamic + Fireblocks' go-to-market platform for demos: per-prospect share links, prospect analytics, viewer enrichment, and SE self-serve - the job Coast (trycoast.com) does for the Fireblocks GTM org today, rebuilt on top of live onchain demos instead of synthetic API captures.

Coast coexists for now. v1 does not replicate Coast's capture/builder features; it makes the live-demo fleet shareable, trackable, and SE-operable.

## Context

- The monorepo already mirrors Coast's core hierarchy: demo type (kind) = template, DemoConfig + Brand = branded demo instance. The missing layer is the trackable per-prospect share link and everything downstream of it.
- Coast research teardown: template -> demo instance model, prospect branding auto-swap, unique trackable URLs, per-demo analytics (sessions, viewers, duration, step views, device, geo, identified vs anonymous viewers), embeds, CRM sync. Coast cannot run real onchain flows; we can, and milestone events joined to the existing `transactions` table are the differentiator.
- Locked decisions all hold: dashboard is the only Postgres consumer (D-015), apps stay thin (D-001), provider secrets stay in dashboard (D-003), webhooks land only at dashboard (D-011), sandbox by default (D-005), `apps/spark26` zero-touch.

## Decisions made in this design

1. Build natively in the dashboard (Approach A). No third-party analytics engine as the core; the event contract is designed so a session-replay sidecar (e.g. PostHog) could be added per demo later.
2. Viewer identity = share-link attribution first, enrichment provider second. No email gate.
3. `Brand` is renamed to `Prospect` (single table; theme fields stay, identity fields added). No separate sibling record.
4. Operator entry point moves to `/dashboard` (replaces the footer-heart -> `/brands` path). Public landing unchanged.
5. Operator UI migrates to `@dynamic-labs-sdk/droplet` primitives (client-shim pattern already proven in the `(public)` tree). New GTM surfaces are droplet-native from day one; legacy config forms migrate per-route-group as follow-ups.
6. Access: domain allowlist (`ALLOWED_EMAIL_DOMAINS` in `lib/auth/gtm.ts`: fireblocks.com, dynamic.xyz) via the existing Dynamic OTP sign-in; two roles (`operator`, `se`), enforced server-side.
7. Book-a-call CTA config lives on the SE's profile (scheduling URL), delivered to demos via the tracker context endpoint.
8. Instrumentation pilots on wallet only; fleet rollout is a fast-follow.
9. (GTM-D-002, 2026-07-20) Profile renamed to User - the single internal-person entity; dynamicUserId (JWT sub) joins legacy ownerId values; visibility is workspace-shared (all users see all prospects/demos; creator or operator may mutate).
10. (GTM-D-003, 2026-07-20) Prospect is the first-class citizen. Teams: `Team` + `TeamMembership` (per-team role in v1 - `TeamMembership.role`, same `Role` enum, additive migration in Phase 04; global OWNER/ADMIN bypass team scoping, otherwise the membership role in the record's team governs; membership is OPTIONAL and explicit-only - no seeded default team, no auto-join). Prospect owns identity (name, domain, logoUrl, notes, `status ACTIVE|ARCHIVED`, `teamId`, `createdById` FK); palette moves to `ProspectTheme` (1:1); the four `demo*Id` reverse-link columns are deprecated (contract-phase drop). Demo linkage is two-layer: `DemoConfig.prospectId` NULLABLE = "built for" (bound configs mint only for their prospect); `ShareLink` = "shown to" (M:N with attribution). No ProspectToDemo table - a curation join table is the sanctioned escalation path if pin-without-minting becomes real. `DemoConfig.createdById` + `User.deactivatedAt` added. ownerId (JWT-sub strings) resolve to `createdById` via three idempotent layers: expand-migration SQL join, `backfill-users` script (Dynamic admin API -> User rows for allowlisted emails), and sign-in `claimLegacyRecords`. ownerId keeps being written until the contract step. The hash-auto-create prospect flow dies at cutover (prospects are created deliberately; extract-theme becomes the prospect-creation theme pull). Visibility is PROGRESSIVE (amended 2026-07-21): a scoped user sees records they own plus records of teams they belong to (mine-only with zero memberships); ADMIN/OWNER unscoped. Applies to lists AND analytics surfaces. `Prospect.teamId` is nullable with no default. Demo-app `branding.*` wire contract is invariant across the theme extraction.

## Data model

Five Prisma changes, all RLS-enabled, all consumed only by dashboard.

### Renamed

- **`Brand` -> `Prospect`** - keeps all theme fields and the deterministic `(ownerId, primaryColor, logoUrl)` hash used by the backfill; gains `domain`, `notes`. All FKs migrate: `DemoConfig.brandId` -> `prospectId`, `transactions.brandId` -> `prospectId`. Backfill scripts, mappers, and `/brands` routes rename accordingly.

### New

- **`Profile`** - `email` (unique, from the dashboard Dynamic JWT), `displayName`, `schedulingUrl`, `avatarUrl?`, `role` (`operator` | `se`). Auto-created on first allowlisted sign-in with role `se`; operators seeded from env, editable by operators.
- **`ShareLink`** - unique url-safe `token`, FKs to `DemoConfig`, `Prospect`, `Profile` (minting SE), `status` (`active` | `revoked`), optional `expiresAt`.
- **`VisitorSession`** - nullable FK to `ShareLink` (untokenized traffic still records), `anonId` (cookie), `startedAt`, `lastSeenAt`, device/os/browser, geo (country/region/city from Vercel headers), `ipHash` (raw IPs never stored), `isInternal`, `enrichment` JSON.
- **`TrackEvent`** - FK to session, `ts`, `type` (`pageview` | `step` | `milestone`), `name`, `path?`, small `props` JSON, client-generated event UUID for idempotency.

Derived, not stored: viewer = distinct `anonId` per demo (upgraded to a person when enrichment resolves); session duration = `lastSeenAt - startedAt`.

## Share links

- SE picks demo instance + prospect in the dashboard, mints `https://<dashboard>/s/<token>`.
- The `/s/[token]` route resolves server-side and 302s to the demo launch URL with `?share=<token>&theme=<prospectTheme>` - prospect lands on an already-branded demo with attribution attached. Existing theme-cookie middleware handles branding unchanged; a small middleware addition persists the share token in a cookie so in-app navigation keeps attribution.
- Revoked/expired tokens 302 to the demo unbranded and untracked. Never a dead link in a prospect's inbox.

## Tracker - `packages/analytics`

React provider + hook consumed by demo apps:

- `<GtmTracker />` in the app layout: auto pageview/route-change capture, session heartbeat, event batching (few-second flush + `sendBeacon` on unload).
- `useTrack()`: typed `track.milestone(name, props)` for per-demo funnel events. Each app declares its milestone taxonomy in its AGENTS.md.
- Fetches a public context payload for the token: prospect display name + book-a-call CTA (SE's `schedulingUrl` + label). Revoking a link kills the CTA. Floating CTA component ships in this package, styled with `--brand-*` tokens.
- Optional enrichment-provider pixel slot (see Enrichment).
- Fail-silent by construction: never throws into demo UI; ingest downtime is invisible to the demo.
- Event schema is a single Zod source of truth shared by tracker and ingest.

## Ingest - `POST /api/track` (dashboard)

- Public endpoint; CORS allowlisted to demo domains; Zod-validated; rate-limited per `ipHash+token` on existing Redis rails; event-UUID idempotent (duplicate = 2xx ack, no write).
- Server derives geo from Vercel headers, parses UA, upserts `VisitorSession`, appends `TrackEvent` rows.
- Valid token -> session attributes to prospect + SE. No token -> still recorded (organic/anonymous view).
- Dashboard-originated launches set a marker cookie -> `isInternal=true`, keeping self-viewing out of prospect stats.

## Dashboard IA

Entry at `/dashboard` (operator group; public landing untouched, `(public)` stays session-free).

- **Demos** (home) - one table across all kinds: prospect (logo + name), template (demo type), creator, date, sessions, viewers, share action, analytics drawer. Filters: template / creator / date / prospect. Analytics drawer: totals (sessions, viewers, avg duration), Viewers tab (identity or anonymous + geo/device, expandable per-session detail), Sessions tab (duration, events, step views, device, location, timestamps).
- **Templates** - the demo types with description/thumbnail + "Create demo" launching the existing per-kind config forms (forms survive; they stop being top-level nav).
- **Prospects** - renamed brand records: identity + theme + linked demos + aggregate engagement.
- **Analytics** - org-wide: sessions-by-demo chart, top demos, recent sessions. Live view stream + Slack notifications are post-v1 nice-to-haves on this page.
- **Profile** - display name, scheduling URL, avatar.
- **Operations** (operator role only) - today's provider config, webhooks, docs, internal admin.

## Auth and roles

- Sign-in unchanged: dashboard's own Dynamic env, email OTP (D-004 intact).
- Post-JWT check: email domain must be in `ALLOWED_EMAIL_DOMAINS`. First sign-in auto-creates `Profile` (role `se`).
- Server-side enforcement on every mutation/route; nav visibility is cosmetic only. Role checks fail closed.

## Enrichment

Layered, cheapest and most certain first; adapter interface `EnrichmentProvider` in dashboard (`noop` + one real provider behind an env key). Runs async via QStash after session start - never in the ingest hot path - and writes normalized `{person, company, provider, confidence, enrichedAt}` JSON to the session.

1. **Structural (free)** - share link gives company + owning SE; headers give geo/device.
2. **Company-level** - reverse-IP firmographics (IPinfo / Clearbit-Reveal class) to confirm the viewer is at the prospect's company vs a forwarded link.
3. **Person-level** - RB2B/Warmly/Vector class (LinkedIn profile, name, title, photo). Pixel-based; tracker exposes a provider-pixel slot, correlation via `anonId`. Vendor trial + Fireblocks security review before enabling. Geo-gated to US sessions.
4. **Deterministic (optional, off by default)** - the `signed_in` milestone may carry the Dynamic sign-in email. Contract supports it; disabled until explicitly enabled.

PII guardrails: enrichment payloads never logged; retention policy documented in dashboard AGENTS.md; provider choice requires security review; raw IPs never stored.

## Failure modes

- Tracker: fail-silent, drops queue on persistent failure, never breaks a demo.
- Ingest: strict validation (4xx invalid), 2xx-ack duplicates, rate-limit 429s invisible to demo UX.
- Share links: dead tokens degrade to unbranded/untracked demo, never 404.
- Enrichment: failures leave the session at whatever layer succeeded.
- Roles: fail closed server-side.

## Testing

- Contract tests on the shared Zod event schema (`packages/analytics`).
- Ingest route tests: validation, sessionization, dedup, rate-limit, internal flagging.
- Share-link mint/resolve/revoke tests, including revoked-token degradation.
- Role-gate tests on mutations (se cannot reach Operations surfaces/actions).
- Brand -> Prospect migration: mapper parity tests + backfill idempotency.
- Pilot demo: smoke test asserting the declared milestone taxonomy fires.

## Workstreams (sizing honesty, ordering for the plan phase)

1. Brand -> Prospect rename (schema + mappers + backfill + routes) - wide but mechanical.
2. `packages/analytics` + ingest + share links (the attribution loop).
3. Dashboard IA relayout + roles + Profile, droplet-native for new surfaces.
4. Pilot instrumentation: wallet milestone taxonomy.
5. Enrichment adapter + company-level provider.
6. Droplet migration of legacy config forms (per-route-group follow-up PRs).
7. Post-v1: person-level enrichment (after security review), live view stream, Slack pings, CRM sync, session-replay sidecar, fleet-wide instrumentation.

## Out of scope for v1

- Replacing Coast's capture/builder demos; embeds and lead-gating.
- CRM integration.
- Session replay.
- Person-level enrichment enabled by default.
- Instrumenting the full demo fleet.
- Any change to `apps/spark26`.

## Success criteria

An SE with no demos-team involvement can: sign in at `/dashboard`, brand a demo for a prospect, mint a share link, send it, and within one session see - per prospect - sessions, duration, geo/device, step views, and real milestone events (e.g. `transfer_completed`) in the analytics drawer, with their own book-a-call CTA rendered inside the live demo.
