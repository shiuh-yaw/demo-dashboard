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

Wave 2  ->  [Phase 03: GTM schema (Profile, ShareLink, VisitorSession, TrackEvent)]   (after 01)
            [Phase 04: Auth allowlist + roles]        (after 03)

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
| `phases/04-auth-roles.md` | 04. Domain allowlist + two roles | 1-2 days | 03 |
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

model Profile {
  id            String      @id @default(cuid())
  email         String      @unique
  displayName   String?
  avatarUrl     String?
  schedulingUrl String?
  role          String      @default("se") // "se" | "operator"
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  shareLinks    ShareLink[]
}

model ShareLink {
  id           String           @id @default(cuid())
  token        String           @unique // nanoid(21), url-safe
  demoConfigId String
  prospectId   String
  profileId    String
  status       String           @default("active") // "active" | "revoked"
  expiresAt    DateTime?
  createdAt    DateTime         @default(now())
  profile      Profile          @relation(fields: [profileId], references: [id])
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
- `services.profiles.getOrCreateByEmail(email): Promise<Profile>`, `services.profiles.update(id, { displayName, schedulingUrl, avatarUrl })` (Phase 03).
- `services.shareLinks.mint({ demoConfigId, prospectId, profileId }): Promise<ShareLink>`, `.resolveByToken(token): Promise<ShareLink | null>` (active + unexpired only), `.revoke(id)` (Phase 03).
- `services.visitorSessions.upsertFromBatch(batch, { geo, ua, ipHash, shareLinkId }): Promise<{ created: boolean }>` - `created` is true when the session row was newly inserted; Phase 10's enrichment hook keys off it (Phase 03 implements, Phase 06 consumes).
- `services.analytics.demoSummary(demoConfigId)`, `.viewers(demoConfigId)`, `.sessions(demoConfigId)`, `.orgOverview()` (Phase 08).

### Auth helpers (Phase 04, `src/lib/auth/gtm.ts`)

```ts
getSessionProfile(): Promise<Profile | null>  // verified Dynamic JWT -> allowlist check -> getOrCreate
requireProfile(): Promise<Profile>            // throws/redirects when unauthenticated or off-domain
requireOperator(): Promise<Profile>           // role check, fail closed
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
- `GTM_OPERATOR_EMAILS` - comma-separated seed list.
- `TRACK_CORS_ORIGINS` - comma-separated demo origins.
- `IP_HASH_SALT` - random salt for ipHash.
- `IPINFO_TOKEN` - company-level enrichment (optional; noop provider without it).
- `NEXT_PUBLIC_TRACK_URL` - dashboard ingest base URL, set per demo app.

---

## Completion criteria

v1 is done when Phases 01-10 are merged (11 may trail) and the DESIGN.md success criterion passes end-to-end:

> An SE with no demos-team involvement can sign in at `/dashboard`, brand a demo for a prospect, mint a share link, send it, and within one session see - per prospect - sessions, duration, geo/device, step views, and real milestone events in the analytics drawer, with their own book-a-call CTA rendered inside the live wallet demo.

Then file `MILESTONE-1.md` here with launch notes and deferred items (person-level enrichment, view stream, Slack pings, CRM sync, fleet instrumentation).
