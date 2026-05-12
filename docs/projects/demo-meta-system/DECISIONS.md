# Locked Decisions

This is the source of truth for architectural and process decisions made during planning. Phase prompts reference these by short label. Update only with a new dated row + rationale; never silently mutate.

---

## D-001 — Dashboard is the orchestrator

Demo apps are thin presentation layers. Dashboard owns Postgres, hosts most provider secrets, exposes `/api/orchestrate/*`, receives webhooks, persists canonical state.

Why: contracts the security surface to one process; gives demos a stable HTTP API instead of N provider integrations; lets demo apps stay disposable.

---

## D-002 — Apps don't access Postgres

Apps read config from dashboard API. Persist transient state in Redis. Persist user state in Dynamic metadata. For canonical persistence (audit, history), apps emit events to dashboard.

Why: lets demos be created without DB provisioning; eliminates schema drift between demos; matches existing pattern (spark26 already does this).

---

## D-003 — Apps hold their own Dynamic + Fireblocks credentials

Other provider secrets (alfredPay-direct REST, BlindPay, Iron, Coinbase, LI.FI) live only in dashboard.

Why: Dynamic env shapes auth UX (per-demo branding, methods, networks). Fireblocks workspace can differ per demo (proceeds vs spark26 vault). Other providers are commodity APIs with no per-demo config.

Default fallbacks exist via shared "demo-default" env so vanilla demos work without per-app credentials.

---

## D-004 — Dashboard has its own Dynamic env, distinct from demo apps

`apps/dashboard` `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` authenticates demo creators logging into dashboard. When demo apps call `/api/orchestrate/...`, they pass `x-dynamic-environment-id: <demo-app-env>` header; dashboard verifies the JWT against THAT env's JWKS. The dashboard is JWT-multi-tenant.

Never collapse these two contexts.

---

## D-005 — Sandbox by default

Every provider package exports `ProviderEnvironment = 'sandbox' | 'production'` with `'sandbox'` as default. Production opt-in requires an explicit `<PROVIDER>_ENVIRONMENT=production` env var + a `[prod-creds]` PR title. CI fails any PR mixing prod credentials into a non-prod-marked PR.

Refuse to boot if `<PROVIDER>_ENVIRONMENT=production` but `NODE_ENV !== 'production'`.

---

## D-006 — Apps/spark26 is production. Zero-touch.

No source modifications under `apps/spark26/`. AGENTS.md doc-only writes are permitted in Phase 3. CI workflow blocks any PR modifying `apps/spark26/*` source unless title contains `[spark26]` (forces deliberate opt-in). Per-app migrations explicitly skip spark26 with a documented exception in its AGENTS.md.

If we later decide to migrate spark26, that's a separate planned project with its own QA gate.

---

## D-007 — Single CSS variable contract: `--brand-*`

Replaces `--widget-*`, `--color-earn-*`, `--trade-*`, `--proceeds-*`, `--etsy-*`. Source: proceeds's `globals.css` (most complete CSS var set today), with proceeds-specific bits (`--proceeds-navy` etc.) stripped out. Lives in `packages/theme/src/defaults.css`.

Apps consume via `import '@dynamic-demos/theme/defaults.css'` plus the SSR `<ThemeStyleTag>` overlay.

---

## D-008 — Visa-direct cookie + SSR pattern is the theming standard

Middleware reads `?id=<configId>` query → sets `<demoType>_config_id` cookie → forwards as `x-<demo>-config-id` header. Server layout reads header → fetches from dashboard → injects theme via inline `<style>` tag. Zero FOUC, zero hydration mismatch, sticky brand across navigation.

Factory: `createDemoMiddleware` from `packages/dynamic`. Theme injection: `fetchDemoConfig` + `<ThemeStyleTag>` from `packages/theme`.

---

## D-009 — Provider package boundary is by API mechanism, not partner brand

A partner with its own API + SDK gets its own package (e.g., `packages/alfredpay` for direct REST). The Fireblocks-mediated path for that same partner lives in `packages/fireblocks/src/providers/<partner>.ts` because the integration mechanism is Fireblocks Orders + DVP.

Generalizable: any partner that's both a Fireblocks Network listing AND has a direct API gets two homes — one per mechanism.

---

## D-010 — `packages/transactions` owns the canonical state machine

States: `initialized → draft → submitted → pending → confirmed`, terminals `expired`, `abandoned`, `failed`, `cancelled`. Helpers `submit()`, `confirm()`, `fail()`, etc. enforce legal transitions at runtime. Validators throw on illegal transitions.

Apps and packages never assign state directly — always through helpers. Each provider exports a `state-mapping.ts` translating its upstream status to canonical state.

Spark26 keeps its local `order-state.ts` (zero-touch); documented as exception.

---

## D-011 — Webhooks land at dashboard only

Demo apps never receive webhooks. They poll dashboard for state changes via `GET /api/orchestrate/transactions/:id`. Dashboard's `/api/webhooks/<provider>` routes verify signature, dedupe, persist to `WebhookEvent` table, run state-machine transitions, optionally fan out via QStash.

Per-provider routes (not dynamic `[provider]`) — each gets its own raw-body parsing config and IP allowlist.

---

## D-012 — Skill writes to a branch + PR, never main

Branch convention: `skill/<demo-type>-<id>-<timestamp>`. PR description embeds `demo-spec.json`, file-by-file rationale, AGENTS.md compliance checklist, sandbox/prod confirmation. CI pipeline `[demo-spec]` runs full preflight before review.

Skill never auto-merges.

---

## D-013 — Postgres = Prisma + Supabase

ORM: Prisma. Host: Supabase Postgres. `packages/db` consumed only by `apps/dashboard`. Two URLs: `DATABASE_URL` (pooler, runtime), `DIRECT_URL` (migrations only). Serverless-safe singleton in `packages/db/src/client.ts`.

RLS deferred (service-layer ownership checks suffice). Supabase Auth/Storage/Realtime deferred to potential Phase 8.

---

## D-014 — AGENTS.md is required for every package and app

Template: `docs/templates/AGENTS.template.md`. Frontmatter is queryable; body is human/AI readable. CI lint enforces structure.

Frontmatter requirements:
- All: `name`, `kind`, `flow_role`, `custody`, `status`.
- Onramp/offramp packages: `regions` (country + currency + rails) — REQUIRED.
- Provider wrappers: `provider.name`, `provider.docs`, `provider.api_reference`, `provider.agent_docs` — REQUIRED.

Body sections: capabilities, public surface, environment, slots/invariants, integration map, examples, do/don't, open questions. Provider documentation + supported regions sections required where applicable.

---

## D-015 — `packages/db` consumed only by `apps/dashboard`

Apps never import. AGENTS.md says so explicitly. Apps fetch from dashboard via HTTP.

---

## D-016 — `.cursor/` is deleted; AGENTS.md is the cross-tool standard

`mock-mode.md` and `tailwind-v4-canonical-utilities.mdc` content migrates into the relevant package AGENTS.md files when those land.

---

## D-017 — `.planning/` moves to `docs/projects/crypto-shop-demo/`

Preserves history without polluting AI context with stale completed-project state. Going forward, planning artifacts for new projects live under `docs/projects/<project-name>/`.

---

## D-018 — `pnpm setup:deploy` script for new app Vercel provisioning

Engineer-runnable. Vercel API: create project, link to repo, set root dir, populate env. Custom domains always manual via Vercel dashboard. Engineer-gated.

---

## D-019 — CI gates are mandatory before Phase 1

Phase 0.5 ships `ci.yml` (typecheck + lint + build + test) and `spark26-protection.yml`. Phase 3 adds `agents-md-lint.yml`. All subsequent phases run inside these gates.

---

## D-020 — Default theme sourced from proceeds

Most complete CSS var set today. Refactor: namespace `--widget-*` → `--brand-*`, strip `--proceeds-*` app-specific vars, refactor component classes to consume vars not hardcoded hex. Result: `packages/theme/src/defaults.css`.

---

## D-021 — Demo-spec schema is versioned

`$schema_version: "1"` field. Lazy migration on read for v1→v2. New fields require either default values for v1 records or an explicit migration step.

---

## D-022 — Mock data lives in `packages/mock-data`

Shared primitives (users, transactions, KYC profiles). Each demo composes its own seed file using these primitives. Replaces per-app duplicated `mock-data.ts`.

---

## D-023 — No real-provider E2E tests in CI

Sandbox setup per provider is multi-day; defer until a specific demo demands it. Webhook signature verify tests (with fixture replay) cover the highest-stakes per-package code without real network calls.

---

## D-024 — Worktree-based parallel execution

Every agent creates an isolated worktree under `.worktrees/<phase-id>` using `superpowers:using-git-worktrees`. Never share. Each agent merges via one logical PR. Wave N+1 begins only when all Wave N PRs are merged.

---

## D-025 — Skill failure modes have explicit acceptance tests

Four classes (no provider matches, specific provider wrong region, ambiguous corridor, out-of-scope). Each is a Phase 6 test fixture. Skill ships only when all pass.

Hard invariant: zero file changes for any unfulfillable prompt.

---

## D-026 — Doppler / vault choice deferred to Phase 8

Phase 0–7 use Vercel env vars + `.env.local` for development. Vault migration (Doppler recommended) tracked as separate project.

---

## D-027 — Dynamic SDK source is referenced authoritatively

The team has access to Dynamic SDK source. Where AGENTS.md or skill scaffolding needs accurate API knowledge, agents read SDK source directly rather than relying on third-party docs.

`packages/dynamic/AGENTS.md` includes a `provider.source: <repo-path>` field pointing at the SDK source. Phase 6 skill includes SDK source as reference when generating Dynamic-related code (verifies methods/types exist before emitting). Phase 1D wraps SDK primitives mirroring the SDK's actual API surface, not docs reconstruction.

Optional Phase 8: publish authoritative `llms.txt` for the Dynamic SDK so external AI consumers benefit from the same authority.

---

## D-028 — Brand is the source of truth for theme; demos may carry per-config overrides

Per-demo-type config tables (`CheckoutConfig`, `EarnConfig`, `WalletConfig`, `RemittanceConfig`, `TradeConfig`, `VisaDirectConfig`, `DepositConfig`, `ShopConfig`, `SandwichConfig`) reference `Brand` via a `brandId` foreign key and **do not** carry their own copies of the visual theme columns. The legacy "every demo embeds its own theme" shape (pre-Phase 2) is retired.

Each demo config table additionally carries an optional `themeOverrides Json?` column. When non-null, the rendered theme is the merge `brand.theme ⊕ themeOverrides` (overrides win per token). When null, the demo renders the brand's theme as-is. Default behavior is no override.

**Why:**
- Single source of truth: editing a brand's primary color updates every demo for that brand. Pre-Phase 2 required editing each demo separately.
- Matches operator mental model: "create brand X, spin up demos using it." `brandId` references make that flow first-class.
- Eliminates duplication: the Phase 2-brand-cutover backfill collapsed 115 legacy demo records onto ~95 deduped Brand rows, proving the embedded theme was redundant copy-paste in the common case.
- Preserves flexibility for the rare case (e.g., "Amex Earn wants a premium dark variant of the standard Amex blue") via `themeOverrides` without another schema migration.

**How to apply (per-demo-type cutover migrations):**
1. Add `brandId String` FK + nullable `themeOverrides Json?` to the demo config table (already structurally true for `RemittanceConfig` from PR #59 — `config: Json` becomes the override carrier; embedded theme columns never landed there).
2. Backfill: hash each legacy demo's embedded theme via the same `(ownerId, primaryColor, logoUrl)` derivation used in `apps/dashboard/scripts/backfill-brands/`. Match to existing `bf_<24-hex>` Brand row; upsert one if absent. Set `brandId`. If the demo's full theme exactly matches the brand's, leave `themeOverrides` null. If it diverges, capture the deltas as `themeOverrides`.
3. Drop the embedded theme columns from the demo config table in a follow-up migration once the new `brandId` reference is verified in production.
4. Service abstraction: each demo config service fetches the joined `Brand` (or its bundle of theme tokens) when assembling the payload returned to the demo app.
5. Frontend: `<ThemeStyleTag>` already takes a fetched theme — no signature change. The fetch call swaps from "read demo config's embedded theme" to "fetch brand by id, apply overrides."
6. Spark26 zero-touch (D-006): no migration touches `apps/spark26/`.

---

## D-029 — Unified `DemoConfig` table over per-demo-type tables

Phase 2's per-demo-config storage uses a **single** Postgres table —
`DemoConfig` — discriminated by a `kind` column (`'earn' | 'wallet' |
'trade' | 'visa-direct' | 'checkout' | 'remittance'`). Replaces the
original plan of one table per demo type (`EarnConfig`,
`VisaDirectConfig`, etc., as outlined in the superseded PR 2-others
section of `phases/02-prisma-supabase.md`).

`kind` is a plain Postgres TEXT column. The closed set is enforced
app-side via a Zod discriminated union in
`apps/dashboard/src/lib/services/demo-config-schemas.ts` — **not** via
a Prisma enum. Adding a new demo type is a TypeScript + Zod edit
(no migration).

**Why:**

- The meta-system's core goal is to add new demo types cheaply.
  Per-type tables make this O(migration + service + parity suite +
  backfill) per type; one unified table makes it O(Zod schema +
  literal type).
- One `DemoConfigService` interface; one parity suite covering every
  kind. Per-type tables would have required 6+ near-identical
  services and 6+ near-identical parity test files.
- One backfill (`backfill:demo-configs`) walks every legacy per-type
  Redis store and lands rows into `DemoConfig` with the matching
  `kind`. Per-type tables would have required 6+ backfills.
- D-028 (Brand owns theme) holds verbatim: every row has `brandId`
  FK and optional `themeOverrides Json?`. No embedded theme columns.

**Scope:**

- `RemittanceConfig` (PR #59) stays as its own table for now. A
  follow-up PR folds it into `DemoConfig` with `kind="remittance"`
  and drops the legacy table.
- The action-layer cutover (routing `lib/actions/<demoType>.ts`
  through `DemoConfigService` instead of per-type Redis stores) is a
  deferred follow-up — same scope discipline as PR #59.
- Strict per-kind Zod schemas land alongside the action-layer
  cutover; the initial discriminated union accepts
  `z.record(z.unknown())` per kind.

**Spark26 zero-touch** (D-006) holds; spark26 has no dashboard config
and is explicitly excluded.
