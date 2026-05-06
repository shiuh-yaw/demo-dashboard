# Execution Progress

Single source of truth for what's done, in flight, and blocked. Update after every PR merge.

**Format:** mark a phase row `🟢 done` (with PR link) when its PR merges. `🟡 in-flight` while an agent is working. `⚪️ pending` when not started. `🔴 blocked` with a reason.

---

## Wave 1 — foundation

| Phase | Status | PR | Notes |
|---|---|---|---|
| 0. Cleanup | 🟢 done | https://github.com/dynamic-labs/demo-dashboard/pull/21 | — |
| 0.5. CI baseline | 🟢 done | https://github.com/dynamic-labs/demo-dashboard/pull/22 | Pre-existing lint/build failures in apps/deposit and apps/shop run with continue-on-error; tracked for follow-up. |

---

## Wave 2 — provider package consolidation (parallel)

| Phase | Status | PR | Notes |
|---|---|---|---|
| 1A. Fireblocks Orders + provider sub-modules | 🟢 done | [#27](https://github.com/dynamic-labs/demo-dashboard/pull/27) | — |
| 1B-alfredpay (direct REST) | 🟢 done | [#26](https://github.com/dynamic-labs/demo-dashboard/pull/26) | Green-field package authored against https://alfredpay.readme.io |
| 1B-blindpay | 🟢 done | [#29](https://github.com/dynamic-labs/demo-dashboard/pull/29) | Package + Svix webhook verifier; state-mapping placeholder swaps to `@dynamic-demos/transactions` after Phase 1E. |
| 1B-iron | 🟢 done | [#30](https://github.com/dynamic-labs/demo-dashboard/pull/30) | Extracted Iron client + types + webhooks + state-mapping into `packages/iron/`. Iron docs moved into `packages/iron/docs/`. |
| 1B-coinbase-onramp | 🟢 done | [#28](https://github.com/dynamic-labs/demo-dashboard/pull/28) | — |
| 1B-lifi | 🟢 done | [#31](https://github.com/dynamic-labs/demo-dashboard/pull/31) | Extracts LI.FI bridge/swap into `@dynamic-demos/lifi`. Dashboard service + checkouts SDK config now consume the package. |
| 1E. Transactions package | 🟢 done | [#24](https://github.com/dynamic-labs/demo-dashboard/pull/24) | Canonical state machine in `@dynamic-demos/transactions`; dashboard consumes via back-compat re-exports. |
| 1D. Dynamic SDK consolidation | 🟡 in-flight | [#35](https://github.com/dynamic-labs/demo-dashboard/pull/35) | Bucket 1: package primitives + 5 app migrations (remittance, visa-direct, proceeds, trade, earn). Bucket 2: client-singleton factory + `createSafeWrapper`/`createAsyncSafeWrapper` promoted to `@dynamic-demos/dynamic/client-singleton`; wallet+deposit fully migrated, checkouts+shop partially migrated (env-id resolution + singleton where it fits). All 9 SDK-consuming apps aligned to `@dynamic-labs-sdk/*` 0.25.0 (matches spark26's known-working version). cross-border-ap-ar does not use Dynamic. Spark26 zero-touch. |
| 1F. pnpm catalog for shared dependencies | ⚪️ pending | — | Sequence after 1D — locks consolidated versions; spark26 zero-touch |
| 2-scaffold. Prisma + Supabase setup | 🟢 done | https://github.com/dynamic-labs/demo-dashboard/pull/25 | Independent of provider work |

---

## Wave 3 — data + docs (parallel within wave)

| Phase | Status | PR | Notes |
|---|---|---|---|
| 2-migrate. Brand model (Part A) | 🟢 done | https://github.com/dynamic-labs/demo-dashboard/pull/52 | Brand model + Postgres service + parity tests; backfill deferred to Part B |
| 2-migrate. Brand backfill (Part B) | 🟡 in-flight | — | Idempotent backfill via `pnpm --filter @dynamic-demos/dashboard backfill:brands`; deterministic id from `(ownerId, primaryColor, logoUrl)`. Smoke against dev Supabase deferred (no `.env.local` in this worktree); CI `db-migration-dryrun.yml` covers schema. |
| 2-migrate. First config-type migration (remittance) | ⚪️ pending | — | — |
| 2-migrate. Per demo type migrations | ⚪️ pending | — | — |
| 2-migrate. Transactions + WebhookEvents tables | ⚪️ pending | — | — |
| 3. AGENTS.md + demo-registry | ⚪️ pending | — | Parallel per package/app |

---

## Wave 4 — theming + dashboard surface

| Phase | Status | PR | Notes |
|---|---|---|---|
| 4-defaults. Default theme extracted from proceeds | ⚪️ pending | — | — |
| 4-app. Theme migration: wallet | ⚪️ pending | — | — |
| 4-app. Theme migration: remittance | ⚪️ pending | — | — |
| 4-app. Theme migration: visa-direct | ⚪️ pending | — | Reference implementation; do last |
| 4-app. Theme migration: cross-border-ap-ar | ⚪️ pending | — | — |
| 4-app. Theme migration: proceeds | ⚪️ pending | — | — |
| 4-app. Theme migration: earn | ⚪️ pending | — | Hardest (RGB conversion) |
| 5A. Webhook framework | ⚪️ pending | — | — |
| 5B. Orchestration API | ⚪️ pending | — | — |
| 5C. Dashboard scaffolding templates + mock-data | ⚪️ pending | — | — |

---

## Wave 5 — skill + deployment

| Phase | Status | PR | Notes |
|---|---|---|---|
| 6A. Skill | ⚪️ pending | — | — |
| 6B. Vercel deploy script | ⚪️ pending | — | — |
| 6C. Engineer runbooks | ⚪️ pending | — | — |

---

## Wave 6 — implicit context

| Phase | Status | PR | Notes |
|---|---|---|---|
| 7. Demo-spec wiring + skill prefill | ⚪️ pending | — | — |

---

## Wave 7 — chat UI / hosted demo creation (post-v1)

| Phase | Status | PR | Notes |
|---|---|---|---|
| 8a. Chat-orchestration backend | ⚪️ pending | — | v0-style; depends on 5C/6/7. Does NOT block v1. |
| 8b. Chat UI surface | ⚪️ pending | — | `/create` page in dashboard |
| 8c. Vercel preview integration | ⚪️ pending | — | Optional — only if existing per-PR pipeline insufficient |

---

## Blockers / decisions needed

- None currently. All dispatch decisions locked in DECISIONS.md.

---

## Completion criteria

The project is complete when **all phases are 🟢 done** AND the Phase 6 skill integration test passes:

> Given a fixture demo-spec for a US→BR stablecoin sandwich, the skill scaffolds, the dashboard routes, and the resulting app builds and renders the configured brand correctly. Zero file changes for any of the four documented failure-mode prompts.

When that's true, file `MILESTONE-1.md` in this directory documenting the launch and any deferred items moved to a v2 plan.
