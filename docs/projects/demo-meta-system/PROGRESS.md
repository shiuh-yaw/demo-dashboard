# Execution Progress

Single source of truth for what's done, in flight, and blocked. Update after every PR merge.

**Format:** mark a phase row `🟢 done` (with PR link) when its PR merges. `🟡 in-flight` while an agent is working. `⚪️ pending` when not started. `🔴 blocked` with a reason.

> **Recent reframe (May 2026):** Phase 5C (substitution templates, PR #88) was closed unmerged and Phase 5B was reframed from a runtime `/api/orchestrate/*` abstraction to **per-provider documentation**. Under the composition model now in force (see PR #88's closing note + D-001/D-003/D-029), each demo is its own complete Next.js app composed from provider packages exposed through per-provider dashboard endpoints (`/api/iron/...`, `/api/blindpay/...`, `/api/coinbase/...`). Provider selection happens at scaffold time in the Phase 6A Skill, not at runtime. Phase 5B now ships the "Dashboard API surface" section in each provider package's `AGENTS.md` so the Skill knows which endpoints to wire.

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
| 2-migrate. Brand backfill (Part B) | 🟢 done | [#56](https://github.com/dynamic-labs/demo-dashboard/pull/56) | Idempotent backfill via `pnpm --filter @dynamic-demos/dashboard backfill:brands`; deterministic id from `(ownerId, primaryColor, logoUrl)`. |
| 2-migrate. Brand cutover | 🟡 in-flight | — | Legacy `BrandProfile` actions route through `BrandService` (Postgres when `USE_POSTGRES_BRANDS=true`); Brand row carries the full visual theme + linked demo-config ids. Demo-config records (earn/wallet/checkout/remittance) still Redis-resident pending PR 2-others. |
| 2-migrate. First config-type migration (remittance) | 🟢 done | https://github.com/dynamic-labs/demo-dashboard/pull/59 | `RemittanceConfig` Prisma model + migration with RLS, Postgres + Redis services, parity tests, `USE_POSTGRES_REMITTANCE` flag, and idempotent backfill auto-upserting a Brand per legacy config (Q-014). Superseded by the unified-`DemoConfig` fold-in (#82): the per-type table was dropped and rows moved into `DemoConfig` with `kind="remittance"`. |
| 2-migrate. Unified `DemoConfig` table | 🟢 done | [#81](https://github.com/dynamic-labs/demo-dashboard/pull/81), [#82](https://github.com/dynamic-labs/demo-dashboard/pull/82) | Single `DemoConfig` Postgres table with `kind` discriminator replaces what would have been one table per demo type — see D-029. #81 covers earn/wallet/trade/visa-direct/checkout. #82 folds RemittanceConfig into the unified table (`kind="remittance"`), drops the legacy table, extends `backfill:demo-configs` to walk the remittance Redis store, and makes `DemoConfig.name` nullable. The previously-planned per-type PRs (#83/#84/#85) are obsolete; close when convenient. Action-layer cutover tracked separately — see next row. |
| 2-migrate. Action-layer cutover (TD-002) | 🟢 done | [#83](https://github.com/dynamic-labs/demo-dashboard/pull/83) | All 6 demo-type action files (`earns`, `wallets`, `trade`, `visa-direct`, `checkouts`, `remittance`) now route through `services.demoConfigs.*` via per-kind mappers in `lib/services/demo-config-mappers/`. Brand resolution is deterministic — `(ownerId, primaryColor, logoUrl)` hashes via `scripts/backfill-brands/hash.ts` so action-created and backfill-created rows converge on the same Brand. `RedisDemoConfigService.get` falls back to the legacy per-kind keyspace (read-only, no lazy upsert) so the cutover is read-non-breaking. `USE_POSTGRES_DEMO_CONFIGS=false` default preserved. |
| 2-migrate. Transactions + WebhookEvents tables | ⚪️ pending | — | — |
| 3. AGENTS.md + demo-registry | ⚪️ pending | — | Parallel per package/app |

---

## Wave 4 — theming + dashboard surface

| Phase | Status | PR | Notes |
|---|---|---|---|
| 4-defaults. Default theme extracted from proceeds | ⚪️ pending | — | — |
| 4-app. Theme migration: wallet | 🟢 done | [#61](https://github.com/dynamic-labs/demo-dashboard/pull/61) | Migrated to `@dynamic-demos/theme/defaults.css`; `--brand-*` namespace adopted with wallet's brand encoded as value overrides in `app/globals.css`; `<ThemeStyleTag>` not wired (no per-config theming today — wallet has no middleware). |
| 4-app. Theme migration: remittance | ⚪️ pending | — | — |
| 4-app. Theme migration: visa-direct | ⚪️ pending | — | Reference implementation; do last |
| 4-app. Theme migration: cross-border-ap-ar | 🟢 done | [#62](https://github.com/dynamic-labs/demo-dashboard/pull/62) | Migrated to `@dynamic-demos/theme/defaults.css`; no `--widget-*` tokens existed (sweep was a no-op); `--brand-page-bg` / `--brand-fg` overridden app-locally to preserve byte-identical Etsy operator surface; `--etsy-*` identity tokens retained outside the `--brand-*` contract. No `<ThemeStyleTag>` (no middleware / per-config theming). |
| 4-app. Theme migration: proceeds | 🟢 done | [#57](https://github.com/dynamic-labs/demo-dashboard/pull/57) | Migrated to `@dynamic-demos/theme/defaults.css`; `--brand-*` namespace adopted; `--proceeds-*` chrome tokens retained app-locally. |
| 4-app. Theme migration: earn | ⚪️ pending | — | Hardest (RGB conversion) |
| 4-app. Theme migration: trade | 🟡 in-flight | [#67](https://github.com/dynamic-labs/demo-dashboard/pull/67) | Theme migration (`--brand-*` contract + `--widget-*` compat) plus middleware simplification: dropped `/t/[id]/<rest>` path-based config routing in favor of cookie + `?id=` only; legacy deep links handled by `next.config.ts` redirect. |
| 5A. Webhook framework | 🟡 in-flight | — | Framework + BlindPay reference wired. alfredpay/iron/coinbase/lifi receivers follow as separate small PRs. Transaction resolution from upstream resource ids deferred (events currently persist as `ignored` until a `(provider, providerResourceId) → transactionId` index lands). |
| 5B. Orchestration API | 🟢 done | this PR | Reframed to docs-only. Original `/api/orchestrate/*` runtime abstraction discarded — provider selection happens at scaffold time in the Phase 6A Skill, not at runtime. Dashboard API surface per provider documented in each provider package's `AGENTS.md` (iron / blindpay / coinbase-onramp + "no dashboard surface" notes for alfredpay / lifi / alchemy / coingecko / polymarket). See PR #88's closing note + D-001/D-003/D-029. AGENTS.md line cap raised 150 → 200 to accommodate the new section. |
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
