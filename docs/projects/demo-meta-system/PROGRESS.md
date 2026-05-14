# Execution Progress

Single source of truth for what's done, in flight, and blocked. Update after every PR merge.

**Format:** mark a phase row `🟢 done` (with PR link) when its PR merges. `🟡 in-flight` while an agent is working. `⚪️ pending` when not started. `🔴 blocked` with a reason. `🚫 superseded` when a phase was rejected or replaced by a different shape.

> **Reframe history (kept for context):**
> - **Phase 5C** (substitution templates, PR #88) was closed unmerged. The composition model — each demo is its own complete Next.js app composed from provider packages exposed through per-provider dashboard endpoints — removed the need for shared scaffold templates. Provider selection happens at scaffold time inside the Phase 6A skill, not at runtime.
> - **Phase 5B** was reframed from a runtime `/api/orchestrate/*` abstraction to **per-provider documentation**: a "Dashboard API surface" section in each provider package's `AGENTS.md` so the Phase 6A skill knows which endpoints to wire (D-001 / D-003 / D-029, PR #89).

---

## Wave 1 — foundation

| Phase | Status | PR | Notes |
|---|---|---|---|
| 0. Cleanup | 🟢 done | [#21](https://github.com/dynamic-labs/demo-dashboard/pull/21) | — |
| 0.5. CI baseline | 🟢 done | [#22](https://github.com/dynamic-labs/demo-dashboard/pull/22) | Pre-existing lint/build failures in apps/deposit and apps/shop run with continue-on-error; tracked for follow-up. |

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
| 1D. Dynamic SDK consolidation | 🟢 done | [#35](https://github.com/dynamic-labs/demo-dashboard/pull/35) | Bucket 1: package primitives + 5 app migrations (remittance, visa-direct, proceeds, trade, earn). Bucket 2: client-singleton factory + `createSafeWrapper`/`createAsyncSafeWrapper` promoted to `@dynamic-demos/dynamic/client-singleton`; wallet+deposit fully migrated, checkouts+shop partially migrated. All 9 SDK-consuming apps aligned to `@dynamic-labs-sdk/*` 0.25.0. Spark26 zero-touch. |
| 1F. pnpm catalog for shared dependencies | 🟢 done | [#39](https://github.com/dynamic-labs/demo-dashboard/pull/39) | Catalog established post-1D; spark26 zero-touch preserved. |
| 2-scaffold. Prisma + Supabase setup | 🟢 done | [#25](https://github.com/dynamic-labs/demo-dashboard/pull/25) | Independent of provider work. |

---

## Wave 3 — data + docs (parallel within wave)

| Phase | Status | PR | Notes |
|---|---|---|---|
| 2-migrate. Brand model (Part A) | 🟢 done | [#52](https://github.com/dynamic-labs/demo-dashboard/pull/52) | Brand model + Postgres service + parity tests; backfill deferred to Part B. |
| 2-migrate. Brand backfill (Part B) | 🟢 done | [#56](https://github.com/dynamic-labs/demo-dashboard/pull/56) | Idempotent backfill via `pnpm --filter @dynamic-demos/dashboard backfill:brands`; deterministic id from `(ownerId, primaryColor, logoUrl)`. |
| 2-migrate. Brand cutover | 🟢 done | [#64](https://github.com/dynamic-labs/demo-dashboard/pull/64) | Legacy `BrandProfile` aggregate routes through `BrandService`; Brand row is the source of truth for theme (D-028). |
| 2-migrate. First config-type migration (remittance) | 🟢 done | [#59](https://github.com/dynamic-labs/demo-dashboard/pull/59) | Superseded by the unified-`DemoConfig` fold-in ([#82](https://github.com/dynamic-labs/demo-dashboard/pull/82)): the per-type table was dropped and rows moved into `DemoConfig` with `kind="remittance"`. |
| 2-migrate. Unified `DemoConfig` table | 🟢 done | [#81](https://github.com/dynamic-labs/demo-dashboard/pull/81), [#82](https://github.com/dynamic-labs/demo-dashboard/pull/82) | Single `DemoConfig` table with `kind` discriminator replaces what would have been one table per demo type — see D-029. #81 covers earn/wallet/trade/visa-direct/checkout; #82 folds RemittanceConfig in. |
| 2-migrate. Action-layer cutover (TD-002) | 🟢 done | [#83](https://github.com/dynamic-labs/demo-dashboard/pull/83) | All 6 demo-type action files (`earns`, `wallets`, `trade`, `visa-direct`, `checkouts`, `remittance`) route through `services.demoConfigs.*` via per-kind mappers. Brand resolution is deterministic via `(ownerId, primaryColor, logoUrl)` hash. |
| 2-migrate. Postgres cutover deploy prep | 🟢 done | [#84](https://github.com/dynamic-labs/demo-dashboard/pull/84), [#85](https://github.com/dynamic-labs/demo-dashboard/pull/85), [#87](https://github.com/dynamic-labs/demo-dashboard/pull/87) | Migrate-on-deploy + backfill fix; Turbo pipes `DATABASE_URL`/`USE_POSTGRES_*` into build; Prisma Linux query engine bundled for Vercel serverless runtime. |
| 2-migrate. Transactions + WebhookEvents tables | 🟢 done | [#55](https://github.com/dynamic-labs/demo-dashboard/pull/55) | Prisma models + migrations for the canonical transaction + webhook event tables. |
| 3. AGENTS.md + demo-registry | 🟢 done | [#40](https://github.com/dynamic-labs/demo-dashboard/pull/40), [#47](https://github.com/dynamic-labs/demo-dashboard/pull/47), [#48](https://github.com/dynamic-labs/demo-dashboard/pull/48), [#89](https://github.com/dynamic-labs/demo-dashboard/pull/89), [#94](https://github.com/dynamic-labs/demo-dashboard/pull/94), [#95](https://github.com/dynamic-labs/demo-dashboard/pull/95) | Per-package + per-app AGENTS.md authored; Phase 5B-reframed dashboard-API-surface added per provider (#89); Fireblocks AGENTS.md expanded with namespace surface (#94); 8 provider SKILL.md files + blindpay AGENTS.md docs-accuracy fix (#95). `.claude/demo-registry.{md,json}` generated by `scripts/generate-demo-registry.mjs`. |

---

## Wave 4 — theming + dashboard surface

| Phase | Status | PR | Notes |
|---|---|---|---|
| 4-defaults. Default theme extracted from proceeds | 🟢 done | [#54](https://github.com/dynamic-labs/demo-dashboard/pull/54) | Canonical `@dynamic-demos/theme/defaults.css` extracted; `--brand-*` namespace is the shared contract. |
| 4-app. Theme migration: wallet | 🟢 done | [#61](https://github.com/dynamic-labs/demo-dashboard/pull/61) | — |
| 4-app. Theme migration: remittance | 🟢 done | [#63](https://github.com/dynamic-labs/demo-dashboard/pull/63) | — |
| 4-app. Theme migration: visa-direct | 🟢 done | [#70](https://github.com/dynamic-labs/demo-dashboard/pull/70) | Reference implementation — done last as planned. |
| 4-app. Theme migration: cross-border-ap-ar | 🟢 done | [#62](https://github.com/dynamic-labs/demo-dashboard/pull/62) | `--etsy-*` identity tokens retained outside the `--brand-*` contract. |
| 4-app. Theme migration: proceeds | 🟢 done | [#57](https://github.com/dynamic-labs/demo-dashboard/pull/57) | — |
| 4-app. Theme migration: earn | 🟢 done | [#71](https://github.com/dynamic-labs/demo-dashboard/pull/71) | Unified theme injection pattern adopted. |
| 4-app. Theme migration: trade | 🟢 done | [#67](https://github.com/dynamic-labs/demo-dashboard/pull/67) | Theme + middleware simplification (path-based `/t/[id]` routing dropped in favor of cookie + `?theme=`). |
| 4-app. Theme migration: checkouts | 🟢 done | [#66](https://github.com/dynamic-labs/demo-dashboard/pull/66), [#78](https://github.com/dynamic-labs/demo-dashboard/pull/78) | #66 theme; #78 dropped `/w/[id]` tree, consolidated at `/`. |
| 4-app. Theme migration: shop | 🟢 done | [#68](https://github.com/dynamic-labs/demo-dashboard/pull/68) | — |
| 4-app. Theme migration: deposit | 🟢 done | [#69](https://github.com/dynamic-labs/demo-dashboard/pull/69) | — |
| 4-app. `?id=` → `?theme=` rename | 🟢 done | [#74](https://github.com/dynamic-labs/demo-dashboard/pull/74), [#77](https://github.com/dynamic-labs/demo-dashboard/pull/77), [#80](https://github.com/dynamic-labs/demo-dashboard/pull/80) | Query-param rename across SDK + dashboard link generation + middleware tests. |
| 5A. Webhook framework | 🟢 done | [#60](https://github.com/dynamic-labs/demo-dashboard/pull/60) | Receiver framework + BlindPay reference wiring. alfredpay/iron/coinbase/lifi receivers follow as separate small PRs. Transaction resolution from upstream resource ids deferred (events currently persist as `ignored` until a `(provider, providerResourceId) → transactionId` index lands). |
| 5B. Per-provider Dashboard API surface (reframed) | 🟢 done | [#89](https://github.com/dynamic-labs/demo-dashboard/pull/89) | Original orchestration-API shape rejected (D-001/D-003/D-029). Reframed: each provider's `AGENTS.md` ships a "Dashboard API surface" section the Phase 6A skill reads when scaffolding. |
| 5C. Dashboard scaffolding templates + mock-data | 🚫 superseded | [#88](https://github.com/dynamic-labs/demo-dashboard/pull/88) (closed unmerged) | Substitution templates obsolete under the composition architecture. Provider selection happens at scaffold time inside the Phase 6A skill; mock-data needs are handled per-demo. |

---

## Wave 5 — skill + deployment

| Phase | Status | PR | Notes |
|---|---|---|---|
| 6A. Create-demo-app skill | 🟢 done | [#90](https://github.com/dynamic-labs/demo-dashboard/pull/90) | `.claude/skills/create-demo-app/SKILL.md` shipped alongside Dynamic reference skills (`dynamic-node-sdk`, `dynamic-javascript-sdk`, `dynamic-api`, `dynamic-webhooks`). Skill consumes `.claude/demo-registry.json`. Trigger description broadened in [#99](https://github.com/dynamic-labs/demo-dashboard/pull/99) to preempt generic brainstorming for "build a {neobank, savings, ...}" requests. |
| 6B. Vercel deploy script | ⚪️ pending | — | — |
| 6C. Engineer runbooks | ⚪️ pending | — | — |

---

## Wave 6 — implicit context

| Phase | Status | PR | Notes |
|---|---|---|---|
| 7. Magic-send dashboard infra | 🟢 done | [#90](https://github.com/dynamic-labs/demo-dashboard/pull/90) | Magic-send service in `apps/dashboard/src/lib/services/magic-send/` (intent service, vault adapter, executor abstraction, webhook processing). Real userop executor stubbed — Dynamic Node SDK-backed implementation deferred (a Fireblocks Vault → embedded wallet path will land when first magic-send demo is built; see project memory `project_magic_send_primitive.md`). |
| 7. Demo-spec wiring + skill prefill | 🚫 superseded | — | Original spec referenced Phase 5C (🚫 superseded) and runtime scripts the LLM-driven skill doesn't have. The implicit-context-capture goal is achieved inside the skill (#90 + #99). Completion gate is now the skill integration acceptance test (next row). |
| 7. Skill integration acceptance test | 🟡 in-flight | [#99](https://github.com/dynamic-labs/demo-dashboard/pull/99) | Fixtures + manual runbook for the project's completion criterion per PLAN.md ("US→BR stablecoin sandwich" + 4 failure-mode prompts). Operator runs the runbook before MILESTONE-1. |

---

## Wave 7 — chat UI / hosted demo creation (post-v1)

| Phase | Status | PR | Notes |
|---|---|---|---|
| 8a. Chat-orchestration backend | ⚪️ pending | — | v0-style; depends on 5C/6/7. Does NOT block v1. |
| 8b. Chat UI surface | ⚪️ pending | — | `/create` page in dashboard |
| 8c. Vercel preview integration | ⚪️ pending | — | Optional — only if existing per-PR pipeline insufficient |

---

## Wave 8 — post-Phase-6A package cleanup

Polish work driven by the audit against PR #94's Fireblocks expansion (the "gold standard" namespace + escape-hatch pattern). Each provider package is brought up to the pattern via its own PR.

| Phase | Status | PR | Notes |
|---|---|---|---|
| 8-fireblocks. Namespace surface + compliance + REST escape hatch | 🟢 done | [#94](https://github.com/dynamic-labs/demo-dashboard/pull/94) | Reshape `@dynamic-demos/fireblocks` into typed namespaces (`fb.vault.*`, `fb.transactions.*`, `fb.internalWallets.*`, `fb.orders.*`, `fb.compliance.*`, `fb.providers.*`) plus `fb.sdk` / `fb.api.*` escape hatches. Adds compliance pre-tx screening. Migrates `apps/deposit` + `apps/remittance` callsites in the same PR. Establishes the pattern. NCW remains explicitly out of scope (deprecated). |
| 8-skills. LLM-discovery skills for 8 packages + blindpay AGENTS.md fix | 🟢 done | [#95](https://github.com/dynamic-labs/demo-dashboard/pull/95) | Bulk-creates `.claude/skills/<pkg>/SKILL.md` for alchemy/alfredpay/blindpay/coinbase-onramp/coingecko/iron/lifi/polymarket. Fixes blindpay AGENTS.md (described an aspirational namespaced API that didn't exist). |
| 8-iron. Namespace surface + remove env-leak + remove singleton | 🟢 done | [#98](https://github.com/dynamic-labs/demo-dashboard/pull/98) | 13 typed namespaces, `IronClientConfig` requires `apiKey` explicitly, `ironClient` singleton removed, 29 dashboard route handlers migrated, `apps/dashboard/src/lib/iron/client.ts` is the only sanctioned env-reader for iron. `MockIronClient` mirrors the new surface. |
| 8-coinbase-onramp. Document existing escape hatches + cleanup | 🟡 in-flight | [#99](https://github.com/dynamic-labs/demo-dashboard/pull/99) | Documents pre-existing `client.request` + `client.generateToken` escape hatches (AGENTS.md + SKILL.md were claiming "no escape hatch"). Removes `process.env` fallback from the package constructor; adds `apps/dashboard/src/lib/coinbase-onramp/client.ts` helper; adds `MockCoinbaseOnrampClient`; broadens `create-demo-app` skill trigger. Env-var rename (`COINBASE_API_KEY` → `COINBASE_API_KEY`) deferred to a separate PR. |
| 8-iron-simple-offramp. Env-decoupling follow-up | 🟡 in-flight | [#99](https://github.com/dynamic-labs/demo-dashboard/pull/99) | `simple-offramp.ts` no longer reads `process.env`; `SimpleOfframpConfig` requires `apiKey`/`customerId`/`bankIban` explicitly; `apps/proceeds/lib/iron-env.ts` is the only sanctioned env-reader on the consumer side. Bundled into PR #99 alongside the coinbase rename + Phase 6B/6C work. |
| 8-coinbase-onramp-env-rename. Env-var rename + `COINBASE_API_ENVIRONMENT` field | 🟡 in-flight | [#99](https://github.com/dynamic-labs/demo-dashboard/pull/99) | `COINBASE_API_KEY` / `COINBASE_API_SECRET` renamed to `COINBASE_API_KEY` / `COINBASE_API_SECRET`; new `COINBASE_API_ENVIRONMENT` Zod field wired through `getCoinbaseOnrampClient` (replaces hardcoded `"sandbox"`). Vercel env config requires update at merge time. |

---

## Blockers / decisions needed

- None currently. All dispatch decisions locked in DECISIONS.md.

---

## Completion criteria

The project is complete when **all phases are 🟢 done** (or 🚫 superseded) AND the Phase 6 skill integration test passes:

> Given a fixture demo-spec for a US→BR stablecoin sandwich, the skill scaffolds, the dashboard routes, and the resulting app builds and renders the configured brand correctly. Zero file changes for any of the four documented failure-mode prompts.

When that's true, file `MILESTONE-1.md` in this directory documenting the launch and any deferred items moved to a v2 plan.
