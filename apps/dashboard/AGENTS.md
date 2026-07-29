---
name: "@dynamic-demos/dashboard"
kind: app
flow_role: utility
custody: mixed
status: stable
---

# @dynamic-demos/dashboard

The operator orchestrator for the Dynamic Demos monorepo (D-001). Demo creators sign in here to provision and manage demos; demo apps call dashboard `/api/orchestrate/*` endpoints for any non-Dynamic / non-Fireblocks provider operation; partner webhooks land here. Dashboard is the **single home** for Postgres access (D-015), commodity-provider secrets (D-003), and canonical persistence (D-011).

## Capabilities

- Public landing page at `/` (no auth) showcasing six demos (wallet, trade, earn, flow, remittance, stablecoin-card), with detail pages at `/demos/[slug]`. Config-driven via `src/lib/landing/demos.ts` - launch URLs are wired; all six launch on dynamic.dev domains (earn + card DNS pending at time of writing). Detail pages include an "Under the hood" section driven by the catalog's `stack` (tech chips; ≥3 required per demo) and `resources` (docs + public `dynamic-labs-oss/examples` links; optional, may be empty) fields, validated in `__tests__/demos.test.ts` (https-only resource URLs when present). Bare `/demos` (no slug) redirects to `/`. OG/Twitter unfurl metadata lives in the root layout (`metadataBase` is the hardcoded canonical public domain `https://dynamic.dev` - no env access) + per-demo `generateMetadata`, with a static `public/og.png`. Cards/buttons compose `@dynamic-labs-sdk/droplet` primitives via the client shim `components/droplet-client.ts` (droplet's dist lacks `"use client"`; the shim is the single import path for both the public tree and every new GTM IA surface); typeset in Figtree, scoped to the `(public)` tree. Operator sign-in is the heart icon in the footer tagline (`signInHref="/dashboard"`). `(public)/_components/force-light-theme.tsx` strips the `dark` class next-themes leaves on `<html>` after operator visits - the public surface is light-only. The site header/footer are the shared `SiteHeader`/`SiteFooter` from `@dynamic-demos/ui` (canonical implementations moved there so demo scenario pages reuse them); `(public)/_components/site-{header,footer}.tsx` are thin wrappers threading dashboard-specific bits (the `/dashboard` heart link).
- Operator UI for demo creators, prospect-first GTM tool entered at `/dashboard`: grouped sidebar (WORKSPACE = Prospects overview home + Demos + Analytics; DOCUMENTATION = Documentation, all roles; SETTINGS = Profile + Admin, Admin ADMIN+ only) rendered inside the client L-shape `components/operator-shell.tsx`. The sidebar collapses to a centered icon rail (desktop, cookie `gtm-sidebar-collapsed`) and becomes an off-canvas droplet Sheet on `<lg` (top-bar hamburger); content is full-width on mobile. Top bar carries the team switcher pill, a route breadcrumb (`components/breadcrumbs.tsx`), a light/dark/auto theme toggle (operator-only, `data-theme` on the `[data-surface="operator"]` root, cookie `gtm-operator-theme` - never a global `<html>.dark`), Docs, and the account menu. Nav active-state is prefix-match (`isNavItemActive`, `nav-items.ts`). Legacy per-kind config forms (`/remittance`, `/checkouts`, `/earns`, `/trade`, `/visa-direct`, `/wallets`, `/widgets`, `/prospects`) survive unchanged behind the new nav.
- Prospect-logo normalization at config save (`src/lib/normalize-logo.ts`): when a saved config's `branding.logo` / `branding.logoUrl` (or a prospect profile's `logoUrl`) is an http(s) URL, the server fetches it (5s timeout, 2MB cap, SSRF guard: every hop — including each manually-followed redirect — is hostname/IP-literal checked AND DNS-resolved before fetching; private/loopback/link-local/CGNAT/IPv4-mapped-IPv6 refused, unresolvable hosts fail closed; residual risk is DNS rebinding between lookup and fetch), trims transparent/uniform padding with sharp, fits it inside 512×160, re-encodes as PNG, and uploads it to Vercel Blob (`prospect-logos/<sha256>.png` — content-addressed, so identical logos dedupe and re-saves are idempotent; needs `BLOB_READ_WRITE_TOKEN`), storing the hosted blob URL. Without a token (local dev) or on upload failure it inlines a `data:image/png;base64,...` URI instead (≤100KB); inline URIs from earlier saves migrate to blob on their next save. Best-effort: any failure keeps the original URL and never blocks the save. Existing blob URLs pass through untouched. Orphaned blobs are not garbage-collected. `data:` URIs pass through untouched. Wired in the action layer for prospects + all demo-config kinds (wallets, earns, trade, remittance, checkouts, visa-direct, legacy widgets); writes that bypass server actions (e.g. scripts calling `services.demoConfigs` directly) are NOT normalized.
- Orchestration API (`/api/orchestrate/*`) — quotes, onramp, offramp, swap, transactions, wallet verify (Phase 5B; partial today).
- Per-provider HTTP endpoints used by demo apps: `blindpay`, `iron`, `coinbase`, `sumsub`, `checkouts`, `earns`, `remittance`, `trade`, `visa-direct`, `wallets`, `widgets`.
- Webhook receivers (per-provider, raw-body parsing + signature verification + dedup + DB persistence + optional QStash fan-out) — framework lives in `src/lib/webhooks/`; BlindPay wired as the reference receiver (Phase 5A).
- Cron jobs (`/api/cron/...`) for recurring tasks.
- Internal admin routes under `/api/internal/...`.
- Documentation surfaces under `/documentation`.

## Public surface

App routes (operator UI):

- `/` — public landing page (no auth); `/demos/[slug]` — public demo detail pages. Rendered by the `(public)` route group, which must stay free of session calls and Providers.
- `/s/[token]` (Phase GTM-05) - public share-link redirect, also in the `(public)` group (zero session/Provider imports). Resolution logic lives in `lib/share-links/resolve-redirect.ts`: an active token 302s to the demo's launch URL with `?share=<token>&theme=<themeId>` (`themeId` is the demoConfigId for a bound config, the link's own prospectId for an unbound one - GTM-D-003 mint coherence); a token that identifies a demo but is revoked/expired degrades to that demo's plain launch URL (unbranded, untracked); a token that can't identify a demo at all redirects to `/`. Never a 404.
- All operator routes live in the `(operator)` route group, whose layout owns the auth gate (login form when unauthenticated), reads the sidebar/theme/scope cookies server-side (no flash), and renders `components/operator-shell.tsx` (sidebar `components/sidebar.tsx` + `nav-items.ts`, top bar `components/top-bar.tsx`, Providers). Entered at `/dashboard`: `/dashboard` (prospect-first overview - droplet metric row + the signed-in user's sortable prospects table with a My/Team/All filter, scope-derived via `getAllProspectProfiles(scope?)`, engagement from the `services.analytics` read layer (`prospectSummaries` batch); the prospects table is the page's only scroll region - header/metric-cards/toolbar stay fixed, rows are prefetched `next/link` anchors under a sticky column header), `/dashboard/demos`, `/prospects/[id]` (prospect hub - a shared `layout.tsx` renders the persistent identity + engagement header (light `analytics.prospectSummary` read) and a route-segment tab sub-nav (`prospect-hub-tabs.tsx` - droplet TabsList/TabsTrigger default-variant styling, but each tab is a `next/link` with `usePathname` active-state via `data-state`, so it looks like real tabs yet navigates) over four segments, each doing its OWN scoped read so no single view fires every read-layer query: `page.tsx` = Overview (default; per-demo engagement breakdown from `analytics.demoSummary` + a recent-activity feed from `analytics.listProspectSessions`, with a structural slot for a later charts pass), `demos/page.tsx` = Demos (responsive grid of demo cards, per-demo mini-stats from `analytics.demoSummary`, each drilling into its per-kind config editor), `contacts/page.tsx` = Contacts (enriched viewers, `analytics.listProspectContacts`), `settings/page.tsx` = Settings (Basic Info + the prospect-global brand theme (logo URL or file upload -> data: URL, shared by every demo) + Save Changes); the layout 404s an out-of-scope/missing id before any segment renders; `/prospects/new` is name+website only, branding derived in the background from the website via `extractThemeFromUrl` in Next `after()`), `/documentation` (provider-docs landing, all roles; sub-pages `/documentation/{checkouts,iron,onramp,blindpay}`), `/dashboard/analytics` (Phase GTM-08 stub), `/dashboard/profile` (self-service, droplet `SettingsSection` sections), `/dashboard/operations` (Admin, ADMIN+ only, `requireAdmin`) with `/dashboard/operations/teams` (team create modal + teams table + searchable workspace-role table). Nav is cosmetic (Admin hidden below ADMIN); every action re-checks server-side.
- `/prospects` - prospect records (a prospect is a company we sell to, identity + theme in one record). `/brands` and `/brands/:path*` 308-redirect to `/prospects` and `/prospects/:path*` (`next.config.ts`); `/api/brands/:path*` redirects to `/api/prospects/:path*` the same way.
- `/remittance`, `/checkouts`, `/earns`, `/trade`, `/visa-direct`, `/wallets`, `/widgets` - per-demo-type config + history (legacy per-kind surfaces; reached via Templates/Operations under the new IA, droplet migration is Phase GTM-11).
- `/documentation` - runbooks and policy.
- `/dashboard/denied` - access-denied page; lives outside `(operator)` so its render never re-triggers the gate.

API namespaces (server):

- `/api/orchestrate/*` — orchestration endpoints called by demo apps (D-001).
- `/api/<provider>/*` — per-provider operator endpoints (`blindpay`, `iron`, `coinbase`, etc.).
- `/api/webhooks/<provider>` — provider webhook receivers (Phase 5A).
- `/api/share/context?token=` (Phase GTM-05) - public, CORS-allowlisted (`TRACK_CORS_ORIGINS`) + `OPTIONS`; resolves an active share token to `{ prospectName, cta: { label, url } | null }` (never emails, ids, or theme internals - see `lib/share-links/context.ts`), `{}` for anything invalid/missing/inactive. Always 200, `Cache-Control: no-store`. Ingest (`POST /api/events`) is Phase GTM-06.
- `/api/cron/<job>` — Vercel Cron jobs.
- `/api/internal/<surface>` — internal admin endpoints.
- `/api/events` (`POST`, `OPTIONS`) - public GTM tracker ingest (Phase GTM-06). CORS allowlisted via `TRACK_CORS_ORIGINS` (exact origin match, fails closed when unset); Zod-validated against `@dynamic-demos/analytics`'s `trackBatchSchema`; dual-key rate-limited (own `incr`/`expire` rails at `src/lib/track/rate-limit.ts` - the webhook dedup client's `set`-only shape didn't fit): a coarse ~1200/min ceiling keyed on `ipHash` alone gates first (cannot be evaded by rotating client-minted ids), then a finer ~120/min bucket keyed on `ipHash:shareToken|anonId` for fair per-viewer limiting; pipeline lives in `src/lib/track/handler.ts` (`createTrackHandler`) so tests inject fakes. Raw IPs are hashed (`sha256(ip + IP_HASH_SALT)`) inside the handler and never persisted/logged. Invalid/revoked share tokens degrade to an unattributed session (never an error); `isInternal` is true when the `dd_internal` cookie is `"1"` or the client batch hint says so.

## Required environment

- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` — dashboard's **own** Dynamic env (D-004) — required.
- `DATABASE_URL` — Supabase pooler URL — required (D-013).
- `DIRECT_URL` — Supabase direct URL for migrations — required.
- Provider keys (D-003): `IRON_API_KEY`, `BLINDPAY_API_KEY` + `BLINDPAY_INSTANCE_ID`, `COINBASE_API_KEY` + `COINBASE_API_SECRET`, `LIFI_API_KEY`, `ALFREDPAY_API_KEY`, `SUMSUB_APP_TOKEN` + `SUMSUB_SECRET_KEY` (+ `SUMSUB_LEVEL_NAME`, default `id-only` — must match a level in the connected SumSub account, else applicant creation 404s). Sandbox-by-default (D-005).
- Webhook secrets per provider (`*_WEBHOOK_SECRET`) — required when wiring receivers. `BLINDPAY_WEBHOOK_SECRET` is wired (Phase 5A); receivers fail closed with 401 if unset.
- `FIREBLOCKS_API_KEY` / `FIREBLOCKS_API_SECRET` — for Trading Orders + DVP flows.
- `NEXT_PUBLIC_APP_ENV` — `production` flips sandbox flags off across all wired providers.
- `GTM_ALLOWED_DOMAINS` — comma-separated sign-in allowlist (Phase GTM-04). Empty fails closed. No individual-email allowlist.
- `TRACK_CORS_ORIGINS` - comma-separated EXTERNAL demo origins allowlisted for the public tracker endpoints (`/api/share/context`, `POST /api/events`); https `dynamic.dev` + subdomains are always allowed (built in), and empty (default) = builtin origins only. `IP_HASH_SALT` - pepper for `sha256(ip + salt)` before persisting `VisitorSession.ipHash`; defaults to a fixed local-dev value, but the app throws at startup if unset when `NEXT_PUBLIC_APP_ENV=production` - set a real random one in deployed environments.

## Theming

Dashboard uses its own internal styling — it is the operator UI, not a customer-facing demo. The `--brand-*` SSR pattern (D-008) does not apply.

## Credentials

- **Dashboard's Dynamic env is distinct** from demo-app envs (D-004). When demo apps call `/api/orchestrate/...`, they pass `x-dynamic-environment-id: <demo-app-env>` header; dashboard verifies the JWT against THAT env's JWKS. The dashboard is JWT-multi-tenant.
- **All non-Dynamic / non-Fireblocks provider secrets live here**. Demo apps don't see Iron / BlindPay / alfredPay / Coinbase / LI.FI keys (D-003).
- **Fireblocks**: dashboard owns the Trading Orders client + DVP flows for partners that wrap into Fireblocks Network listings (D-009).
- **Rain (stablecoin card issuer)** - `/api/rain/*` route handlers proxy the Rain issuing API via `@dynamic-demos/rain`, `withAuth`-guarded. `RAIN_API_KEY` lives only in the dashboard (`getRainClient` in `src/lib/rain/client.ts` is the sole env-reader; sandbox host by default). The dashboard holds **no card state**: the consuming app owns storage/retrieval (Dynamic user metadata) and sends the card ids on each request as `x-rain-card-id` / `x-rain-user-id`; routes read them via `getRainCardFromRequest` (`src/lib/rain/card-from-request.ts`) and never read or write Dynamic metadata (`/api/rain/apply` just returns the created card for the app to store). **Accepted security tradeoff (sandbox demo):** those ids are client-supplied and are NOT verified against an authoritative owner - `withAuth` authenticates *who* the caller is, but a caller could supply another user's card id (IDOR; sharpest on `/api/rain/card-details` = PAN/CVV). Acceptable for sandbox test cards; a production deployment MUST verify card ownership (e.g. against the user's Dynamic metadata) before the Rain call. Card-secret reveal stays client-side E2E-encrypted: `/api/rain/card-details` only passes the client `sessionId` through and returns opaque ciphertext.

## Access model (Phase GTM-04)

- **Sign-in gate:** the `(operator)` layout shows the login form when there is no Dynamic session; a valid session whose email domain is not in `GTM_ALLOWED_DOMAINS` (exact match on the domain after `@`, lowercased; empty list fails closed) or whose `User.deactivatedAt` is set is redirected to `/dashboard/denied` (that page lives outside the `(operator)` group so it never re-triggers the gate). First allowlisted sign-in auto-creates a `User` (role `MEMBER`), captures `dynamicUserId = sub` write-once (mismatch logs + keeps the original), and runs one-shot `claimLegacyRecords`. Team membership is explicit-only - no auto-join. Roles are never seeded from env.
- **Roles** (`Role` enum, same values at global and per-team level via `TeamMembership.role`): OWNER (everything, incl. changing an OWNER), ADMIN (mutate anything, operations surface, assign MEMBER/VIEWER), MEMBER (create + mutate own, mint share links), VIEWER (read-only).
- **Policy module `lib/auth/policy.ts`** owns every role comparison (pure; no bare role strings elsewhere): `canMutateRecord` (global ADMIN/OWNER bypass team scoping; team OWNER/ADMIN mutate anything in the team; team MEMBER only own - `createdById` wins over `ownerId`; VIEWER and non-members never; orphan rows ADMIN+ only), `canCreateRecord`/`canMintShareLinks` (MEMBER+), `canAccessOperations` (ADMIN+), `canSetRole` (OWNER any; ADMIN only MEMBER<->VIEWER).
- **Session/guards `lib/auth/gtm.ts`:** `getSessionUser`/`requireUser`/`requireAdmin`, `visibleProspectIds` (team-scoped; ADMIN+ unscoped), `canMutateProspect`/`canMutateDemoConfig`. Every mutating action calls `getSessionUser` + a policy helper server-side; nav is cosmetic.
- **Visibility (GTM-D-003)** is PROGRESSIVE: a scoped user (MEMBER/VIEWER) sees only records they own (`createdById === user.id`, `ownerId === user.dynamicUserId` fallback) plus records of teams they belong to; with zero memberships this is mine-only. Unbound demos (null `prospectId`) are visible only to their creator. ADMIN/OWNER are unscoped (see everything, including orphan rows). The single seam is `visibleProspectIds` + `isProspectVisible`/`isDemoConfigVisible` in `lib/auth/gtm.ts`. Stored `ownerId` is never rewritten; `createdById` is the linkage. The GTM-07 top-bar team switcher + My/Team/All filter (cookies `gtm-team-ctx`/`gtm-prospect-filter`, resolved by the pure `lib/prospect-scope.ts`) only refine WITHIN this set: `getAllProspectProfiles` re-enforces scope server-side (rejects `team` for a non-member, `all` for a non-admin - falls back to mine) then intersects with `visibleProspectIds`.
- **Operations surface** (`/api/internal/*`, provider/webhook admin) is ADMIN+. The QStash worker at `/api/internal/worker` is machine-authenticated (signature), not user-gated - it has no human session.
- **Bootstrap:** `pnpm --filter @dynamic-demos/dashboard set-role <email> <ROLE>` (access = possession of `DATABASE_URL`) is the only way the first OWNER is created; refuses unknown emails and invalid roles. Team-management + role server actions (`lib/actions/{teams,users}.ts`) are admin-gated; the UI is `/dashboard/operations/teams` (Phase GTM-07 - create team, add/remove members with per-team roles, set workspace roles). Assigning a user to a team expands that user's visible records (team scoping activates here). Read helpers `services.teams.membershipsForTeam` and `services.users.list` back the admin UI (view types in `lib/actions/team-views.ts`, kept out of the `"use server"` module).
- **Share-link actions (Phase GTM-05, `lib/actions/share-links.ts`):** `mintShareLink` is `canMintShareLinks`-gated (MEMBER+) and enforces the GTM-D-003 mint coherence rule server-side - a `DemoConfig` bound to a prospect (`prospectId` set) mints only for that prospect; an unbound config mints for any prospect. `revokeShareLink` is owner (minting SE) or operator (`canAccessOperations`, ADMIN+) only. The "Copy share link" popover (`components/shared/share-link-button.tsx`) is wired into the six per-kind demo lists and the Demos-table Share column (Phase GTM-07). Per-prospect share-link management (list/revoke on a prospect hub) is deferred with the prospects droplet rebuild.

## Slots vs invariants

**Slots:** demo-type list (per-route additions), prospect records (identity + theme, D-007-adjacent), per-instance config records, supported corridors per provider.

**Invariants:**

- Dashboard is the **only** consumer of `@dynamic-demos/db` (D-015). Demo apps fetch via HTTP.
- Webhooks land **only here** (D-011). Demo apps poll `GET /api/orchestrate/transactions/:id`.
- All provider state mappings go through `@dynamic-demos/transactions` helpers when persisting (D-010). No raw `state` assignment.
- Sandbox-by-default (D-005). Production opt-in requires `[prod-creds]` PR title.
- Dashboard's Dynamic env stays distinct from any demo app's env (D-004). Never collapse contexts.
- Mock-mode data lives in **Dynamic user metadata** at the demo-app side, not in dashboard (the canonical state-tracking shouldn't see mock writes — see `apps/trade`, `apps/earn`).

## Data boundaries

- **Postgres (Supabase) via `@dynamic-demos/db`** — the only Postgres consumer in the monorepo (D-015).
- **Redis (QStash)** — webhook fan-out + cron tasks (Phase 5A).
- **Provider event log** — `WebhookEvent` table (Phase 2-transactions + Phase 5A).
- **Canonical transactions** — `transactions` table referenced by `demoInstanceId`, `prospectId` (renamed from `brandId` in Phase GTM-01), `parentTransactionId` (Phase 2-transactions).
- **Per-demo-type config rows** — unified `DemoConfig` table (one row per demo, discriminated by `kind`). The action layer (`lib/actions/{earns,wallets,trade,visa-direct,checkouts,remittance}.ts`) routes every CRUD through `services.demoConfigs.*` via per-kind mappers under `lib/services/demo-config-mappers/`. Prospect linkage is explicit - actions take `prospectId: string | null`; the hash resolver is retired from the mapper layer. `services.demoConfigs` is Postgres-only. **Prospect fallback on the public read** (`GET /api/demo-configs/{kind}/{id}`): when the id isn't a config of the requested kind, the handler resolves it as a Prospect id - or, for a config of a different kind, borrows its prospect - and synthesizes the kind's payload from the prospect's visual fields (`demo-config-mappers/prospect-fallback.ts`). `?theme=` therefore accepts the brand in any of its identities (kind config id, any config id, prospect id); apps without their own kind (flow, card) theme entirely through this path. `EarnBranding.appName` / `TradeBranding.appName` / `RemittanceBranding.appName` (optional) title the demo's browser tab via `buildDemoMetadata({ appName })` (`@dynamic-demos/theme`) - earn, trade, and remittance `toStored` mappers fill `appName` from `prospect.name` when the stored config doesn't set one, so branded tabs work without an operator having to type the name twice.
- **GTM platform tables** (Phase GTM-03, `User` renamed from `Profile` + gained `dynamicUserId` in the GTM-D-002 amendment, 2026-07-20; `role` became the Prisma `Role` enum - `OWNER | ADMIN | MEMBER | VIEWER`, default `MEMBER` - in the GTM-D-002 extension, same date) - `User` (the single internal-person entity: SE/admin/owner identity, `dynamicUserId` is the Dynamic JWT `sub`, nullable/unique, write-once, joins to the legacy `ownerId` values on Prospect/DemoConfig), `ShareLink` (per-prospect share link, `nanoid(21)` token, FK `userId` → `User`), `VisitorSession` + `TrackEvent` (tracker session/event rows, client-generated UUID ids, no cutover flag - Postgres-only, no legacy Redis equivalent). Services: `services.users`, `services.shareLinks`, `services.visitorSessions` at `lib/services/postgres/{users,share-links,visitor-sessions}.ts`. `services.users` (registered under that key as of the 2026-07-20 amendment; the legacy per-checkout wallet-user Redis service moved to `services.legacyWalletUsers` to free it) also exposes `resolveByDynamicIds(subs)` for batch-resolving creators by Dynamic sub (Phase GTM-04/07 consumer). `visitorSessions.upsertFromBatch` is write-only - Phase GTM-06's ingest route (`POST /api/events`) is the consumer. The read side is `services.analytics` (`lib/services/postgres/analytics.ts`, Phase GTM-07): read-only aggregates + contacts over `VisitorSession -> ShareLink` (sessions attach to a prospect/demo only via their share link), internal self-views excluded, PII-bounded (enrichment company + captured `authenticated`-milestone identity only, never raw IPs). Two-tier read scope (`AnalyticsReadScope` = `"all" | Set<prospectId>` from `visibleProspectIds`, gated by `isProspectInReadScope`); `StubAnalyticsService` stays as a zeroed fallback behind the same interface. GTM-D-003 (2026-07-20, Phase 03.5A, folded into #151) landed `Team`/`TeamMembership`, `ProspectTheme`, `Prospect.teamId`/`createdById`/`status`, `DemoConfig.createdById` + nullable `prospectId`, `User.deactivatedAt`. New surface: `services.teams` (`lib/services/postgres/teams.ts` - `create`/`list`/`addMember`/`removeMember`/`setMembershipRole`/`membershipsForUser`; membership explicit-only, no default team) and `services.users.claimLegacyRecords(user)` (idempotent `createdById` reconciliation, consumed by Phase GTM-04 sign-in). Prospect/DemoConfig service read shapes gained the new fields additively; PR A writes are unchanged (ownerId still stamped, `prospectId` still required, `teamId` null unless explicitly assigned). GTM-03.5B (cutover, code-only, no migration) landed: prospect creation is deliberate everywhere - `services.prospects.create`/`createProspectProfile` take explicit identity, and the demo-config action layer (`lib/actions/{earns,wallets,trade,visa-direct,checkouts,remittance}.ts`) takes an explicit `prospectId: string | null` per create/update call instead of hash-deriving one; the hash-auto-create path (`lib/services/demo-config-mappers/prospect-resolver.ts`, `resolveProspect`) is deleted from the mapper layer. `DemoConfigRecord.prospectId` and the create/update input types are now `string | null` (previously coerced to `""`). A minimal `ProspectPicker` (`src/components/shared/prospect-picker.tsx`, backed by the `listProspectOptions` action) is wired into the wallet/earn/trade/visa-direct/remittance new+edit forms; full curation UX (search, inline-create) is Phase 07's. `PostgresProspectService` dual-writes every create/update onto both the flat `Prospect` palette columns and `ProspectTheme` (rollback safety until the contract phase), and reads join `ProspectTheme` with fallback to the flat columns when no theme row exists - see `lib/services/postgres/prospects.ts`. Wire-parity for the demo-app-facing `branding.*` JSON is covered by `src/app/api/demo-configs/handlers/__tests__/wire-parity.test.ts` (per-kind mapper `toStored()` snapshot) - the six per-kind mapper `toStored()` bodies are unchanged by this cutover, so the snapshot holds before and after. Phase GTM-05 wired the read/redirect side of `ShareLink`: `PostgresShareLinkService` gained `get(id)` and `findByToken(token)` (raw lookups, any status - `resolveByToken` stays active-only for the context endpoint) so `/s/[token]` can tell "unknown token" apart from "known but inactive" and revoke can check ownership; `lib/share-links/{launch-url,resolve-redirect,context}.ts` hold the pure, unit-tested resolution logic the two new public routes wrap.

## Deployment

- **Vercel project:** `dynamic-demos-dashboard`.
- **Root dir:** `apps/dashboard`.
- **Required env:** see above. All commodity-provider keys + webhook secrets are server-only.
- **Custom domain:** TBD (preview URL stable for operators today).
- **Owner:** demos team.
- **Dev port:** 4000 (`pnpm dev:dashboard`).
- **Migrations on deploy:** `prisma migrate deploy` runs in `build` when `VERCEL_ENV=production`; preview + local builds skip. Requires `DIRECT_URL` in the Vercel Production env.

## Integration map

**Imports:** `@dynamic-demos/dynamic`, `@dynamic-demos/ui`, `@dynamic-demos/utils`, `@dynamic-demos/theme`, `@dynamic-demos/types`, `@dynamic-demos/transactions`, `@dynamic-demos/db` (only consumer), `@dynamic-demos/blindpay`, `@dynamic-demos/coinbase-onramp`, `@dynamic-demos/iron`, `@dynamic-demos/lifi`, `@dynamic-demos/fireblocks`, `@dynamic-labs-sdk/droplet` (public landing + every new GTM IA surface, via the `components/droplet-client.ts` shim; legacy per-kind forms keep their local kit until Phase GTM-11. Droplet's global CSS loads app-wide but the dashboard's token blocks come after it in `src/globals.css` and must stay there).
**Imported by:** none.

## Examples

```ts
// apps/dashboard/src/app/api/orchestrate/transactions/[id]/route.ts (sketch)
import { prisma } from "@dynamic-demos/db";
import { TransactionState } from "@dynamic-demos/transactions";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const tx = await prisma.transaction.findUniqueOrThrow({ where: { id: params.id } });
  return Response.json({ id: tx.id, state: tx.state as TransactionState });
}
```

## Do / Don't

- Do: keep all commodity-provider secrets in dashboard env (D-003). Apps should never see them.
- Do: route every state change through `@dynamic-demos/transactions` helpers (D-010).
- Do: keep webhook receivers per-provider (not dynamic `[provider]`) so each gets its own raw-body parsing + IP allowlist (D-011).
- Don't: collapse the dashboard's Dynamic env with a demo app's (D-004). Verify each demo's JWT against its own JWKS.
- Don't: import `@dynamic-demos/db` from any app other than this one (D-015).
- Don't: bypass `@dynamic-demos/transactions` helpers when updating state — direct assignment breaks invariants.
- Don't: add auth/session calls or Dynamic SDK imports to the `(public)` route group — the landing pages are anonymous and static.

## Webhook framework

Lives at `src/lib/webhooks/` and serves all `/api/webhooks/<provider>` routes (D-011). Composes the standard receiver pipeline once so each provider route stays a few lines.

**Files:**

- `idempotency.ts` — `dedupOrThrow(redis, provider, eventId)`: Redis SETNX with TTL=7 days. Throws `DuplicateWebhookEventError` on a hit.
- `handler-factory.ts` — `createWebhookHandler({ provider, secret, verifySignature, normalize, services, redis, rateLimit?, logger? })`: full pipeline (rate limit → verify → normalize → dedup → persist → state-machine → ack).
- `redis-adapter.ts` + `redis-client.ts` — adapters that surface `SET … NX EX …` from Upstash and ioredis (the unified `RedisClient` doesn't expose NX).
- `<provider>-adapter.ts` — per-provider translation between the framework's Web `Headers` contract and each package's webhook surface (`blindpay-adapter.ts` is the reference).
- `app/api/webhooks/<provider>/route.ts` — explicit per-provider route handlers; never a dynamic `[provider]` route (D-011).

**Invariants:**

- Signature verification runs before any side effect. A bad signature produces a 401, no DB row, and a `[security:webhook-signature-failure]` log line.
- Replay protection lives at two layers: Redis SETNX (in-flight) + Postgres unique `(provider, providerEventId)` (durable). Either short-circuits with a 200 ack on a duplicate.
- All transaction state changes go through `assertValidTransition` from `@dynamic-demos/transactions` (D-010). Illegal transitions persist as `processingStatus=failed` with the error message; the row is not rolled back so the audit trail is complete.
- Receivers fail closed: if `<PROVIDER>_WEBHOOK_SECRET` is unset the route returns 401 without invoking the framework.
- One info log per delivery: `[webhook:<provider>] received eventId=<id> type=<type> dedup=<bool> durMs=<n> signatureValid=<bool> status=<state>`. Raw payloads stay at debug level — never above.

**To wire a new provider:** see `docs/engineering/add-new-webhook-receiver.md`.

## Open questions / known gaps

- Receivers wired so far: BlindPay only. alfredPay, Iron, Coinbase Onramp, LI.FI follow as separate small PRs after the framework merges.
- BlindPay normalizer doesn't yet resolve a local `transactionId` from the upstream `data.id` — every event currently persists with `processingStatus=ignored` until a `(provider, providerResourceId) → transactionId` index lands.
- Phase 5B fills out the `/api/orchestrate/*` namespace beyond the partial coverage shipped to date.
- Phase 5C lands dashboard scaffolding templates that auto-generate per-demo-type sections from the demo registry.
- Phase 2-brands landed in three PRs: Part A (model + Postgres service), Part B (backfill), and the brand cutover (legacy `BrandProfile` actions now route through `BrandService`; row carries the full visual theme + linked demo ids). Phase 2-transactions landed `Transaction` + `WebhookEvent`. Phase GTM-01 renamed `Brand` -> `Prospect` everywhere (model/table, `BrandService` -> `ProspectService` at `services.prospects`, `brandId` -> `prospectId` FKs, `scripts/backfill-brands/` -> `scripts/backfill-prospects/` with `backfill:brands` kept as a `backfill:prospects` alias for one release, `/brands` -> `/prospects` routes with a 308 redirect from the old path) and added two nullable identity columns, `domain` and `notes` - a prospect is a company we sell to; its visual theme is one facet of that identity, not the whole record. Prospect, demo-config, and transaction-record storage is now Postgres-only; the legacy Redis keyspaces (`demo-dashboard:brand:*`, `demo-dashboard:brands`, `demo-dashboard:brand-v2:*`, `demo-dashboard:tx-v2:*`, `demo-dashboard:demo-config:*`) and their service implementations were removed.
- Mock-mode-aware orchestration: when demo apps emit "this was a mock action" events, dashboard should ignore them rather than persist a real transaction. Pattern needs codifying once a third app adopts mock mode.
- Phase GTM-03 landed the `User` (renamed from `Profile` in the GTM-D-002 amendment, 2026-07-20 - gained `dynamicUserId`, the Dynamic JWT `sub`, nullable/unique, write-once), `ShareLink`, `VisitorSession`, `TrackEvent` tables + their write-path services. `nanoid` (5.1.16, ESM-only) is a direct dashboard dependency for `ShareLink.token` generation. Phase GTM-04 landed the auth allowlist + roles; Phase GTM-05 landed `/s/[token]`, `/api/share/context`, and mint/revoke actions. `POST /api/events` ingest is Phase GTM-06.
