# Glossary

Terminology used across phase prompts. When a prompt references one of these, agents read the definition here.

---

**1-shot demo** — A demo created from a single user prompt without follow-up questions or manual code edits. The success bar of the entire project.

**AGENTS.md** — Per-package, per-app documentation file with structured frontmatter (machine-queryable) and prose body (human/AI readable). Template at `docs/templates/AGENTS.template.md`. Required for every package and app. CI-linted.

**App** — A Next.js application under `apps/<name>/`. Each app is a demo or operator surface. Apps don't access Postgres directly. The dashboard (`apps/dashboard/`) is special: it's the operator UI and orchestrator.

**Brand** — A reusable record holding theme + branding + asset references. Stored in Postgres `brands` table (Phase 2). Demo configs reference a brand by ID. Apps fetch via `/api/orchestrate/...` or per-demo-type endpoints.

**Canonical state machine** — The single source of truth for transaction lifecycle. States: `initialized → draft → submitted → pending → confirmed`, terminals `expired`, `abandoned`, `failed`, `cancelled`. Lives in `packages/transactions`.

**Custody** — Who controls user funds at a given lifecycle step. AGENTS.md frontmatter field; legal values: `non-custodial`, `custodial`, `mixed`, `n/a`.

**Dashboard** — `apps/dashboard/`. The operator UI for demo creators. Owns Postgres, holds commodity-provider secrets, exposes `/api/orchestrate/*`, receives all webhooks. Has its own dedicated Dynamic env (separate from demo apps' envs).

**Demo creator** — A non-engineer using the dashboard or skill to provision a new demo for a customer. The 1-shot user.

**Demo end-user** — The customer or prospect interacting with a deployed demo. Authenticated via the demo's own Dynamic env (not the dashboard's).

**Demo instance** — A specific instantiation of a demo type for a specific customer, identified by `demoInstanceId`. Stored as a config record in Postgres referencing a brand.

**Demo registry** — Auto-generated index at `.claude/demo-registry.md`. Lists all demo types, all provider packages, regions, custody, current status. The skill reads this first to route user intent.

**Demo-spec** — Versioned JSON record (schema at `docs/templates/demo-spec.schema.json`) capturing the user's intent for a demo. Persisted alongside the demo's config. Lets the AI know what the demo creator *would have specified* if they knew to.

**Demo type** — A category of demo, e.g. `remittance`, `stablecoin-sandwich`, `proceeds`. Each demo type has its own dashboard section under `apps/dashboard/src/app/<demoType>/` and its own app under `apps/<demoType>/`.

**Direct path (Path B)** — App calls Dynamic SDK or Fireblocks directly using its own credentials. Used for demo-defining concerns where per-demo customization matters.

**`flow_role`** — AGENTS.md frontmatter field. Legal values: `onramp | wallet | bridge | offramp | checkout | payouts | auth | theming | shared-ui | utility`. Drives skill matching of user intent to packages.

**Independent provider** — A provider with its own API/SDK independent of Fireblocks. Gets its own package (e.g., `packages/alfredpay`, `packages/blindpay`).

**Logical PR** — A single-purpose, atomic, reviewable PR. One concern per PR. Phase prompts call out where to split.

**Orchestration API** — `apps/dashboard/src/app/api/orchestrate/...` namespace. Endpoints: `/quotes`, `/onramp`, `/offramp`, `/swap`, `/transactions/:id`, `/wallets/verify`. Demo apps call these for commodity-provider operations.

**Orchestrated path (Path A)** — Demo app calls dashboard `/api/orchestrate/...`; dashboard uses its provider keys. Default for commodity providers (alfredPay-direct REST, BlindPay, Iron, Coinbase, LI.FI).

**Package** — A workspace package under `packages/<name>/`. Reusable, versioned (workspace-internal), AGENTS.md-documented.

**Phase** — A bounded unit of work in this plan. Each phase has its own dispatch prompt at `phases/<N>-<name>.md`.

**Provider** — A third-party service (alfredPay, BlindPay, Iron, Coinbase, LI.FI, Dynamic, Fireblocks). Each has a corresponding `packages/<name>/` (independent providers) or sub-module (`packages/fireblocks/providers/<name>.ts` for Fireblocks Network listings).

**Provider environment** — `'sandbox' | 'production'`. Default: sandbox. Production opt-in via explicit env var + `[prod-creds]` PR title.

**Region** — Country code + currency + payment rail combination an onramp/offramp package supports. AGENTS.md frontmatter `regions` field; queryable.

**Sandbox-by-default** — D-005. No demo, no app, no provider call uses production credentials unless deliberately opted in.

**Skill** — `.claude/skills/create-demo-app/`. Claude Code skill that takes user intent, reads the demo registry, and either (a) routes to existing dashboard `new` form pre-filled, or (b) scaffolds a new demo type into a branch + PR (rare).

**Spark26 zero-touch rule** — D-006. No source modifications under `apps/spark26/`. Doc-only AGENTS.md changes permitted in Phase 3. CI enforces.

**State mapping** — Per-provider translation from upstream status (e.g., alfredPay's `received`, `completed`, `rejected`) to canonical `TransactionState`. Lives in `packages/<provider>/src/state-mapping.ts` (or equivalent for Fireblocks providers).

**Superpowers skill** — Process discipline skills installed via the `superpowers:` plugin. See `superpowers:using-superpowers` for the full set. Phase prompts reference specific ones (TDD, planning, verification, etc.).

**Transaction** — A canonical record of "money in flight" lifecycle. Stored in Postgres `transactions` table. References `demoInstanceId`, `brandId`, optionally `parentTransactionId` (for sandwich flows). Holds canonical state.

**Wave** — A group of phases that can be dispatched in parallel. The plan defines six waves; PROGRESS.md tracks completion within each.

**Webhook event** — Provider-emitted notification (transaction status, KYC update, etc.). Lands at dashboard `/api/webhooks/<provider>`. Verified, deduped, persisted to `WebhookEvent` table, optionally fans out via QStash.

**Worktree** — Isolated git worktree under `.worktrees/<phase-id>/`. Created via `superpowers:using-git-worktrees`. Each agent works in its own worktree; never share.
