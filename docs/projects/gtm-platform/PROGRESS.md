# GTM Platform - Execution Progress

Single source of truth for what's done, in flight, and blocked. Update after every PR merge. Format matches `docs/projects/demo-meta-system/PROGRESS.md` (🟢 done / 🟡 in-flight / ⚪️ pending / 🔴 blocked / 🚫 superseded).

## Wave 1

| Phase | Status | PR | Notes |
|---|---|---|---|
| 01. Brand -> Prospect rename | 🟡 in-flight | [#148](https://github.com/dynamic-labs-oss/demo-dashboard/pull/148) | Implemented + review approved (2 rounds); awaiting merge. Breaking rename migration - see deploy note in PR. domain/notes update-mapper wiring deferred to Phase 07. |
| 02. packages/analytics tracker | 🟡 in-flight | [#147](https://github.com/dynamic-labs-oss/demo-dashboard/pull/147) | Implemented + review approved (3 rounds); awaiting merge. 7-export surface, 48 tests. |

## Wave 2

| Phase | Status | PR | Notes |
|---|---|---|---|
| 03. GTM schema | ⚪️ pending | - | - |
| 04. Auth allowlist + roles | ⚪️ pending | - | - |

## Wave 3

| Phase | Status | PR | Notes |
|---|---|---|---|
| 05. Share links + context endpoint | ⚪️ pending | - | - |
| 06. Ingest /api/track | ⚪️ pending | - | - |

## Wave 4

| Phase | Status | PR | Notes |
|---|---|---|---|
| 07. IA relayout on droplet | ⚪️ pending | - | - |
| 09. Wallet pilot instrumentation | ⚪️ pending | - | - |
| 10. Enrichment adapter | ⚪️ pending | - | - |

## Wave 5

| Phase | Status | PR | Notes |
|---|---|---|---|
| 08. Analytics surfaces | ⚪️ pending | - | - |
| 11. Legacy forms -> droplet | ⚪️ pending | - | Parallelizable per route group; may trail v1. |

## Blockers / decisions needed

- Person-level enrichment vendor (RB2B/Warmly/Vector class): trial + Fireblocks security review before any Phase 10 follow-up enables it. Not a v1 blocker.
