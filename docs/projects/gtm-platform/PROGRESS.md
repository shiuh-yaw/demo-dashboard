# GTM Platform - Execution Progress

Single source of truth for what's done, in flight, and blocked. Update after every PR merge. Format matches `docs/projects/demo-meta-system/PROGRESS.md` (🟢 done / 🟡 in-flight / ⚪️ pending / 🔴 blocked / 🚫 superseded).

## Wave 1

| Phase | Status | PR | Notes |
|---|---|---|---|
| 01. Brand -> Prospect rename | 🟢 done | [#148](https://github.com/dynamic-labs-oss/demo-dashboard/pull/148) | Merged. Breaking rename migration - see deploy note in PR. domain/notes update-mapper wiring deferred to Phase 07. CONTRACT follow-up [#149](https://github.com/dynamic-labs-oss/demo-dashboard/pull/149) (Phase GTM-01b) dropped the legacy `Brand` table after the prospect cutover promoted. |
| 02. packages/analytics tracker | 🟢 done | [#147](https://github.com/dynamic-labs-oss/demo-dashboard/pull/147) | Merged. 7-export surface, 48 tests. |

Design spec + execution plan landed in [#145](https://github.com/dynamic-labs-oss/demo-dashboard/pull/145) (implicit prerequisite for the whole plan; not a phase row).

## Wave 2

| Phase | Status | PR | Notes |
|---|---|---|---|
| 03. GTM schema | 🟢 done | [#151](https://github.com/dynamic-labs-oss/demo-dashboard/pull/151) | Merged. 4 tables + RLS in one additive migration, write-path services for users/share-links/visitor-sessions, amended twice in place (GTM-D-002: Profile -> User + dynamicUserId; GTM-D-002 extension: role -> Prisma `Role` enum) - see PR for both amendment notes. |
| 03.5. Prospect-first model (teams, identity, theme extraction) | 🟢 done | [#151](https://github.com/dynamic-labs-oss/demo-dashboard/pull/151), [#156](https://github.com/dynamic-labs-oss/demo-dashboard/pull/156) | Merged. PR A (expand + backfill) folded into #151; PR B (cutover, GTM-03.5B) merged as #156 - deliberate prospect creation everywhere, hash-auto-create retired from the mapper layer, `ProspectPicker` wired into the per-kind forms. |
| 04. Auth allowlist + roles | 🟢 done | [#158](https://github.com/dynamic-labs-oss/demo-dashboard/pull/158) | Merged. Domain allowlist, `Role` enum + per-team `TeamMembership.role`, policy module (`lib/auth/policy.ts`), session/visibility guards (`lib/auth/gtm.ts`, progressive own+team visibility per the GTM-D-003 amendment), `set-role` bootstrap CLI. |

## Wave 3

| Phase | Status | PR | Notes |
|---|---|---|---|
| 05. Share links + context endpoint | 🟡 in-flight | - | Implemented on `gtm/05-share-links`; awaiting PR + review. `/s/[token]` redirect (never a dead link), `GET /api/track/context` (CORS-allowlisted, PII-minimal), mint/revoke actions with GTM-D-003 mint coherence, minimal "Copy share link" popover on the six per-kind lists. |
| 06. Ingest /api/track | ⚪️ pending | - | - |

## Wave 4

| Phase | Status | PR | Notes |
|---|---|---|---|
| 07. IA relayout on droplet | 🟡 in progress | - | Branch `gtm/07-ia-relayout`. Shipped: droplet shim promoted to `components/droplet-client.ts`; `services.analytics.demoSummary` stub; `lib/demos-table.ts` (scoped cross-kind query); new IA nav (`components/nav-items.ts`) + surfaces `/dashboard` (Demos home), `/dashboard/templates`, `/dashboard/profile`, `/dashboard/analytics` shell, `/dashboard/operations` (+ `/teams` admin), `/dashboard/prospects` (redirects to `/prospects`); footer heart -> `/dashboard`; team scoping activated + team/role admin UI (`membershipsForTeam`, `users.list`). Deferred: prospects droplet rebuild (list/detail/theme + per-prospect share-link management), checkouts ProspectPicker, legacy breadcrumbs. |
| 09. Wallet pilot instrumentation | ⚪️ pending | - | - |
| 10. Enrichment adapter | ⚪️ pending | - | - |

## Wave 5

| Phase | Status | PR | Notes |
|---|---|---|---|
| 08. Analytics surfaces | ⚪️ pending | - | - |
| 11. Legacy forms -> droplet | ⚪️ pending | - | Parallelizable per route group; may trail v1. |

## Blockers / decisions needed

- Person-level enrichment vendor (RB2B/Warmly/Vector class): trial + Fireblocks security review before any Phase 10 follow-up enables it. Not a v1 blocker.

## Deferred cleanup phase

Contract-phase inventory (three-deploy rule - never drop a column the serving Prisma client still declares). Not scheduled yet; tracked here so nothing gets lost between Phase 03.5 and the eventual contract PR:

- Flat theme columns on `Prospect` (superseded by `ProspectTheme`, Phase 03.5).
- The four `demo*Id` reverse-link columns on `Prospect` (`demoEarnId`, `demoCheckoutsId`, `demoWalletId`, `demoRemittanceId` - deprecated per GTM-D-003).
- `ownerId` string columns on `Prospect`/`DemoConfig`/`Transaction`/`WebhookEvent` (superseded by `createdById` FKs once resolution is verified complete).
- Dual-writes introduced by Phase 03.5B (legacy flat theme columns written alongside `ProspectTheme`; `ownerId` written alongside `createdById`).
- Hash-based prospect resolution retirement (`scripts/backfill-prospects/hash.ts` and any remaining action-layer references - the hash-auto-create flow itself dies in Phase 03.5B, but the script stays until this cleanup).
- Legacy Redis backends still reachable behind cutover flags (`RedisProspectService`, `RedisTransactionRecordService`, `RedisDemoConfigService`) once every environment is confirmed on Postgres.
- Transactions cutover: finish (flip `USE_POSTGRES_TRANSACTIONS` everywhere and retire the Redis path) or kill (document why Redis stays) - no indefinite dual-state.
- Migration squash once the above lands, to keep `packages/db/prisma/migrations` from accumulating expand/contract pairs indefinitely.
