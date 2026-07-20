# GTM Platform - Execution Plan

> **This plan is executed by parallel AI agents.** Each phase file in `phases/` is a self-contained prompt. The dispatcher launches agents per the dependency graph below. Every agent works in a git worktree, uses superpowers skills, and merges one logical PR.

Design spec: `DESIGN.md` (approved 2026-07-17). Read it before dispatching anything.

---

## Goal

Transform `apps/dashboard` into the Dynamic + Fireblocks go-to-market platform: per-prospect share links, session/step/milestone analytics on live demos, viewer enrichment, SE self-serve with roles, book-a-call CTA, and a GTM-first information architecture on droplet. Pilot instrumentation on `apps/wallet` only.

## Status

Plan complete. Awaiting Wave 1 dispatch. Track progress in `PROGRESS.md`.

---

## Dispatch graph

```
Wave 1  ->  [Phase 01: Brand -> Prospect rename]     ┐ parallel
            [Phase 02: packages/analytics tracker]   ┘

Wave 2  ->  [Phase 03: GTM schema (User, ShareLink, VisitorSession, TrackEvent)]   (after 01)
            [Phase 03.5: Prospect-first model (teams, identity, theme extraction)] (after 03)
            [Phase 04: Auth allowlist + roles]        (after 03 + 03.5 PR A)

Wave 3  ->  [Phase 05: Share links + context endpoint]  ┐ parallel (05 after 03+04, 06 after 02+03)
            [Phase 06: Ingest /api/track]               ┘

Wave 4  ->  [Phase 07: Dashboard IA relayout on droplet]   (after 01+04)
            [Phase 09: Wallet pilot instrumentation]       (after 02+05+06)
            [Phase 10: Enrichment adapter]                 (after 06)

Wave 5  ->  [Phase 08: Analytics surfaces]                 (after 06+07)
            [Phase 11: Droplet migration of legacy forms]  (after 07; parallel per route group)
```

Dispatch rules are identical to the demo-meta-system plan: one agent per phase file, own worktree under `.worktrees/<phase-id>`, one logical PR, a wave completes only when all its PRs are merged.

## Phase index

| File | Phase | Sizing | Depends on |
|---|---|---|---|
| `phases/01-prospect-rename.md` | 01. Brand -> Prospect rename | 2-3 days | - |
| `phases/02-analytics-package.md` | 02. `packages/analytics` tracker | 2-3 days | - |
| `phases/03-gtm-schema.md` | 03. GTM Prisma models + services | 1-2 days | 01 |
| `phases/03.5-prospect-first-model.md` | 03.5 Prospect-first model (teams, identity, theme extraction; 2 PRs) - PR A (expand + backfill) folded into #151; PR B (cutover) remains | 3-4 days | 03 |
| `phases/04-users-roles-sharing.md` | 04. Users, role enum, workspace sharing (team-scoped) | 1-2 days | 03, 03.5A |
| `phases/05-share-links.md` | 05. Share links, `/s/[token]`, context endpoint | 2 days | 03, 04 |
| `phases/06-ingest.md` | 06. Ingest pipeline `POST /api/track` | 2-3 days | 02, 03 |
| `phases/07-ia-relayout.md` | 07. IA relayout (`/dashboard`, droplet-native surfaces) | 4-5 days | 01, 04 |
| `phases/08-analytics-surfaces.md` | 08. Analytics drawer + org analytics page | 2-3 days | 06, 07 |
| `phases/09-wallet-pilot.md` | 09. Wallet pilot instrumentation + CTA | 1-2 days | 02, 05, 06 |
| `phases/10-enrichment.md` | 10. Enrichment adapter + company-level provider | 1-2 days | 06 |
| `phases/11-droplet-legacy.md` | 11. Legacy config forms -> droplet | 3-5 days (parallel) | 07 |

**Total: 21-31 agent-days; wall-clock much less with wave parallelism.**

---

## Hard rules every agent must enforce

All demo-meta-system hard rules apply (spark26 zero-touch, no direct Postgres from apps, sandbox by default, PRs only, tests required, no hook skipping, AGENTS.md updated in the same PR). GTM-specific additions:

1. **The tracker is fail-silent.** No code path in `packages/analytics` may throw into a demo's render or interaction path. Ingest downtime must be invisible to demos.
2. **Raw IPs are never persisted.** Only `sha256(ip + IP_HASH_SALT)`. Raw IP may exist in-request only.
3. **Enrichment payloads are never logged.** PII guardrails from DESIGN.md apply verbatim.
4. **Every new table enables RLS** in the same migration that creates it (established Phase 2 pattern).
5. **Role checks are server-side on every mutation.** Nav hiding is cosmetic.
6. **No secrets in code or .env.example** - placeholders only (`.env.example` gets `GTM_*`, `TRACK_*`, `IPINFO_TOKEN` placeholder entries).
7. **The share-link path never 404s for prospects.** Dead/revoked tokens degrade to unbranded, untracked demo.
8. **Public landing (`(public)` route group) stays session-free.** The `/s/[token]` route is server-only redirect logic, no session calls.

---

## Shared contracts

Phase files reference these; they are the single source of truth for cross-phase names and types. If a phase must deviate, it updates this section in the same PR.

### Prisma models (Phase 01 + 03)

```prisma
// Phase 01: Brand renamed to Prospect. Keeps every existing field (theme, ownerId,
// primaryColor, logoUrl, deterministic-hash id semantics) and adds:
//   domain String?   notes String?
// FK renames: DemoConfig.brandId -> prospectId, Transaction.brandId -> prospectId.

// Amended GTM-D-002 (2026-07-20): Profile renamed to User - the single
// internal-person entity - and gains dynamicUserId (the Dynamic JWT sub,
// nullable, captured at first sign-in by Phase 04). Existing ownerId
// values on Prospect/DemoConfig are Dynamic subs; dynamicUserId makes
// them joinable at read time. Visibility is workspace-shared (Phase 04).

// Amended GTM-D-002 extension (2026-07-20): role becomes a real Prisma
// enum - Role { OWNER ADMIN MEMBER VIEWER }, default MEMBER. Seeded from
// GTM_OWNER_EMAILS / GTM_ADMIN_EMAILS (Phase 04; no env code lands before
// then). Semantics: OWNER - everything incl. role grants, only OWNERs
// modify OWNERs; ADMIN - operations surface, mutate any record, grant
// roles below ADMIN; MEMBER - sign-in default, create + mutate own
// records, mint share links; VIEWER - read-only.

// Amended GTM-D-003 (2026-07-20): User gains deactivatedAt (offboarding
// lifecycle). Team/TeamMembership/ProspectTheme added; Prospect and
// DemoConfig field additions below.

enum Role {
  OWNER
  ADMIN
  MEMBER
  VIEWER
}

model User {
  id            String      @id @default(cuid())
  email         String      @unique
  dynamicUserId String?     @unique // Dynamic JWT sub; write-once once set
  displayName   String?
  avatarUrl     String?
  schedulingUrl String?
  role          Role        @default(MEMBER)
  deactivatedAt DateTime?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  shareLinks    ShareLink[]
}

// Phase 03.5 (GTM-D-003): teams, prospect identity + theme extraction.

enum ProspectStatus {
  ACTIVE
  ARCHIVED
}

model Team {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())
  members   TeamMembership[]
}

model TeamMembership {
  id        String   @id @default(cuid())
  userId    String
  teamId    String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
  team      Team     @relation(fields: [teamId], references: [id])
  @@unique([userId, teamId])
}

model ProspectTheme {
  id         String   @id @default(cuid())
  prospectId String   @unique
  prospect   Prospect @relation(fields: [prospectId], references: [id])
  // palette columns copied verbatim from Prospect's current theme fields
}

// Prospect (Phase 01/03.5) gains: teamId (FK, NOT NULL post-backfill),
// createdById String? (FK -> User), status ProspectStatus @default(ACTIVE);
// partial unique (teamId, lower(domain)). Identity fields (name, domain,
// logoUrl, notes, logo, companyUrl, description) stay on Prospect.

// DemoConfig (Phase 03.5) gains: createdById String?; prospectId becomes
// NULLABLE ("built for"; unbound = reusable/showcase demo).

model ShareLink {
  id           String           @id @default(cuid())
  token        String           @unique // nanoid(21), url-safe
  demoConfigId String
  prospectId   String
  userId       String
  status       String           @default("active") // "active" | "revoked"
  expiresAt    DateTime?
  createdAt    DateTime         @default(now())
  user         User             @relation(fields: [userId], references: [id])
  sessions     VisitorSession[]
}

model VisitorSession {
  id          String       @id // client-generated UUID
  shareLinkId String?
  demoSlug    String
  anonId      String
  startedAt   DateTime     @default(now())
  lastSeenAt  DateTime     @default(now())
  device      String?
  os          String?
  browser     String?
  country     String?
  region      String?
  city        String?
  ipHash      String?
  isInternal  Boolean      @default(false)
  enrichment  Json?
  shareLink   ShareLink?   @relation(fields: [shareLinkId], references: [id])
  events      TrackEvent[]

  @@index([shareLinkId])
  @@index([demoSlug, startedAt])
}

model TrackEvent {
  id        String         @id // client-generated event UUID (idempotency key)
  sessionId String
  ts        DateTime
  type      String // "pageview" | "step" | "milestone"
  name      String
  path      String?
  props     Json?
  session   VisitorSession @relation(fields: [sessionId], references: [id])

  @@index([sessionId, ts])
}
```

### Wire schema (Phase 02, consumed by Phase 06)

Single Zod source of truth at `packages/analytics/src/schema.ts`:

```ts
export const trackEventSchema = z.object({
  eventId: z.string().uuid(),
  type: z.enum(["pageview", "step", "milestone"]),
  name: z.string().min(1).max(128),
  path: z.string().max(512).optional(),
  ts: z.number().int().positive(), // epoch ms, client clock
  props: z.record(z.unknown()).optional(), // JSON.stringify(props).length <= 2048, enforced by a .refine() on this field (client + server share it)
});

export const trackBatchSchema = z.object({
  sessionId: z.string().uuid(),
  anonId: z.string().uuid(),
  demoSlug: z.string().min(1).max(64),
  shareToken: z.string().max(64).optional(),
  isInternal: z.boolean().optional(),
  events: z.array(trackEventSchema).min(1).max(50),
});
export type TrackBatch = z.infer<typeof trackBatchSchema>;
```

### Client API (Phase 02, consumed by Phase 09)

```ts
// packages/analytics
<GtmTracker demoSlug="wallet" />            // layout mount; reads NEXT_PUBLIC_TRACK_URL
useTrack(): { milestone(name: string, props?: Record<string, unknown>): void;
              step(name: string): void }    // pageviews are automatic
<BookACallCta />                             // floating CTA, renders only when context has cta
getShareContext(token: string): Promise<{ prospectName?: string;
  cta?: { label: string; url: string } }>    // resolves {} on any failure
```

Cookies (demo-domain scoped, set by the tracker): `dd_anon` (uuid, 1y), `dd_share` (token, 30d, from `?share=`), `dd_internal` ("1", 1y, from `?internal=1`).

### Dashboard endpoints

- `GET /s/[token]` (Phase 05) - 302 to demo launch URL + `?share=<token>&theme=<prospectTheme>`; revoked/expired/unknown -> 302 to plain launch URL (or `/` if demo unknown).
- `GET /api/track/context?token=` (Phase 05) - public, CORS; 200 `{ prospectName, cta }` for active tokens, 200 `{}` otherwise. Never errors to the client.
- `POST /api/track` + `OPTIONS` (Phase 06) - public, CORS allowlist `TRACK_CORS_ORIGINS`, Zod-validated, rate-limited per `ipHash:token|anonId` on the existing Redis rails, event-UUID idempotent (`createMany({ skipDuplicates: true })`), 2xx on duplicates.

### Services (dashboard `src/lib/services/`)

- `services.prospects.*` (Phase 01, renamed from brands - same method surface).
- `services.users.getOrCreateByEmail(email): Promise<User>`, `services.users.update(id, { displayName, schedulingUrl, avatarUrl, dynamicUserId })` (Phase 03; amended for GTM-D-002 - `dynamicUserId` is write-once, `update` rejects overwriting a non-null value with a different one), `services.users.resolveByDynamicIds(subs: string[]): Promise<Map<string, User>>` (batch lookup by Dynamic JWT sub, consumed by Phase 04/07). Registered as `services.users` (amendment, 2026-07-20; previously `services.gtmUsers`) - the legacy per-checkout wallet-user Redis service moved to `services.legacyWalletUsers` to free this key.
- `services.users.claimLegacyRecords(user)` (Phase 03.5) - one-shot legacy `createdById` reconciliation for records whose `ownerId` matches the user's Dynamic sub; consumed by Phase 04's `getSessionUser`.
- `services.teams.{create, list, addMember, removeMember, membershipsForUser}` (Phase 03.5).
- `visibleProspectIds(user)` policy helper (Phase 04) - team-membership scoped; ADMIN+ unscoped.
- `services.shareLinks.mint({ demoConfigId, prospectId, userId }): Promise<ShareLink>`, `.resolveByToken(token): Promise<ShareLinkWithContext | null>` (active + unexpired only; `ShareLinkWithContext` = `ShareLink & { user: User; prospect: Prospect }` - `ShareLink` has no Prisma relation to `Prospect`, so the service does a second lookup and stitches it in for Phase 05's context endpoint), `.revoke(id)` (Phase 03).
- `services.visitorSessions.upsertFromBatch(batch, { geo, ua, ipHash, shareLinkId, isInternal }): Promise<{ created: boolean }>` - `created` is true when the session row was newly inserted; Phase 10's enrichment hook keys off it (Phase 03 implements, Phase 06 consumes). `isInternal` was implicit in this line pre-Phase-03 but is spelled out in `phases/03-gtm-schema.md`'s meta shape and always required - `VisitorSession.isInternal` has no sane default derivable from `geo`/`ua`/`ipHash` alone, and the batch's own top-level `isInternal` hint is not authoritative (server-resolved, e.g. from the `dd_internal` cookie, is).
- `services.analytics.demoSummary(demoConfigId)`, `.viewers(demoConfigId)`, `.sessions(demoConfigId)`, `.orgOverview()` (Phase 08).

### Auth helpers (Phase 04, `src/lib/auth/gtm.ts`)

```ts
getSessionUser(): Promise<User | null>  // verified Dynamic JWT -> allowlist check -> getOrCreate -> capture dynamicUserId
requireUser(): Promise<User>            // throws/redirects when unauthenticated or off-domain
requireOperator(): Promise<User>        // role check, fail closed
```

### Enrichment (Phase 10, `src/lib/enrichment/`)

```ts
interface EnrichmentProvider {
  name: string;
  enrich(input: { ip: string; country?: string }): Promise<EnrichmentResult | null>;
}
type EnrichmentResult = {
  company?: { name: string; domain?: string };
  person?: { name?: string; title?: string; linkedinUrl?: string; avatarUrl?: string; email?: string };
  provider: string;
  confidence: "low" | "medium" | "high";
  enrichedAt: string; // ISO
};
```

Runs post-response via Next 15 `after()` inside the ingest route on session creation - raw IP stays in-request, nothing PII-bearing transits a queue. (Deviation from DESIGN.md's "via QStash" line, decided here: QStash payloads would carry raw IPs. DESIGN.md's intent - never in the ingest hot path - is preserved.)

### Environment additions (all server-only except `NEXT_PUBLIC_TRACK_URL`)

- `GTM_ALLOWED_DOMAINS` - comma-separated (`fireblocks.com,dynamic.xyz`).
- `GTM_OWNER_EMAILS` - comma-separated seed list for the `OWNER` role (supersedes the earlier `GTM_OPERATOR_EMAILS` placeholder; GTM-D-002 extension).
- `GTM_ADMIN_EMAILS` - comma-separated seed list for the `ADMIN` role.
- `TRACK_CORS_ORIGINS` - comma-separated demo origins.
- `IP_HASH_SALT` - random salt for ipHash.
- `IPINFO_TOKEN` - company-level enrichment (optional; noop provider without it).
- `NEXT_PUBLIC_TRACK_URL` - dashboard ingest base URL, set per demo app.
- `DYNAMIC_API_TOKEN` - Phase 03.5's `backfill-users` script (Dynamic admin API); only added if no existing server token is found on survey.

---

## Completion criteria

v1 is done when Phases 01-10 are merged (11 may trail) and the DESIGN.md success criterion passes end-to-end:

> An SE with no demos-team involvement can sign in at `/dashboard`, brand a demo for a prospect, mint a share link, send it, and within one session see - per prospect - sessions, duration, geo/device, step views, and real milestone events in the analytics drawer, with their own book-a-call CTA rendered inside the live wallet demo.

Then file `MILESTONE-1.md` here with launch notes and deferred items (person-level enrichment, view stream, Slack pings, CRM sync, fleet instrumentation).
