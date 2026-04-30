# Phase 3 — AGENTS.md authoring + demo registry

> **Self-contained agent prompt — heavily parallelizable.** Read this entire file. Then `PLAN.md`, `DECISIONS.md`, `GLOSSARY.md`, and `docs/templates/AGENTS.template.md`.

---

## Your role

Author AGENTS.md for every package and app, generate the canonical `.claude/demo-registry.md`, and migrate stashed `.cursor/` content from Phase 0 into the right AGENTS.md targets.

This phase ships as **multiple PRs in parallel**, one per package or app (or batched in groups of 2–3 if very small). The registry generator and lint workflow ship as a single shared PR.

## Wave + dependencies

- Wave 3.
- Depends on Phase 1 (1A, 1B, 1D, 1E) merged — package landscape must be stable.
- Phase 2 PRs need not all be done; AGENTS.md for `packages/db` can be authored once 2-scaffold merges.
- Parallelizable per target.

## Skills

1. `superpowers:using-git-worktrees` — separate worktree per PR (`.worktrees/phase-3-<target>`).
2. `superpowers:writing-plans` — for batched PRs.
3. `superpowers:dispatching-parallel-agents` — orchestrator dispatches multiple agents in parallel, one per AGENTS.md target.
4. `superpowers:verification-before-completion` — lint workflow must pass.
5. `superpowers:requesting-code-review`.

## Hard rules

- AGENTS.md template at `docs/templates/AGENTS.template.md` is authoritative.
- Frontmatter fields are queryable — exact field names, lowercase YAML.
- For `flow_role: onramp | offramp` packages: `regions` field REQUIRED.
- For provider-wrapping packages: `provider.docs`, `provider.api_reference`, `provider.agent_docs` REQUIRED (set `agent_docs: none` if provider doesn't publish one).
- For `packages/dynamic`: include `provider.source` pointing at the SDK source path (D-027). Author against the **actual SDK source**, not docs reconstruction.
- AGENTS.md must be ≤150 lines per file.
- Update AGENTS.md in the same PR that modifies the package's behavior — never lag.
- `apps/spark26/AGENTS.md` is permitted (doc-only). Document the spark26 zero-touch exception explicitly inside it.

## Required reading

- `docs/templates/AGENTS.template.md` — the template (frontmatter + body sections).
- `DECISIONS.md` — every decision is referenced from AGENTS.md where relevant.
- `GLOSSARY.md`.
- For each target: that package's source code, its current README (if any), its actual exports, env vars, and capabilities.
- Stashed Phase 0 content: `docs/projects/demo-meta-system/migrations/cursor-content-*.md`.

## Targets

### Packages (each its own PR or grouped 2–3)

- `packages/ui`
- `packages/dynamic` — **special: reference Dynamic SDK source authoritatively (D-027)**
- `packages/fireblocks` — covers shared client + sub-providers (mtlco, alfredpay)
- `packages/alchemy`
- `packages/coingecko`
- `packages/polymarket`
- `packages/utils`
- `packages/types`
- `packages/theme`
- `packages/transactions` — replace stub from Phase 1E
- `packages/alfredpay` — replace stub from Phase 1B
- `packages/blindpay` — replace stub
- `packages/iron` — replace stub. Migrate stashed iron docs into the file (link, not embed).
- `packages/coinbase-onramp` — replace stub
- `packages/lifi` — replace stub
- `packages/db` — once Phase 2-scaffold merged

### Apps (each its own PR or grouped 2–3)

- `apps/dashboard` — central operator UI; full AGENTS.md including the orchestration model, the two Dynamic envs, webhook receiver responsibilities. **Migrate stashed `cursor-content-mock-mode.md` content here if it's dashboard-relevant.**
- `apps/proceeds`
- `apps/remittance`
- `apps/visa-direct` — restructure existing CLAUDE.md (renamed in Phase 0) against the template
- `apps/wallet`
- `apps/trade` — **migrate stashed `cursor-content-mock-mode.md` here if trade-relevant** (see stash content)
- `apps/earn`
- `apps/deposit`
- `apps/checkouts`
- `apps/shop`
- `apps/cross-border-ap-ar`
- `apps/spark26` — **doc-only. Explicitly note zero-touch and self-contained exceptions.**

### Stashed content to retire

After authoring, **delete** the stash files:
- `docs/projects/demo-meta-system/migrations/cursor-content-mock-mode.md`
- `docs/projects/demo-meta-system/migrations/cursor-content-tailwind.md`
- `docs/projects/demo-meta-system/migrations/cursor-content-dynamic-javascript.md`

(One PR can do all three deletions after their content has been incorporated into the right AGENTS.md.)

### Tooling

- `scripts/generate-demo-registry.ts` — reads every `AGENTS.md` frontmatter, emits `.claude/demo-registry.md` with sections grouped by `flow_role`, summary tables of providers and regions.
- `.github/workflows/agents-md-lint.yml` — CI workflow validating AGENTS.md frontmatter against schema (regions present where required, provider docs present where required, ≤150 lines, etc.).

## Per-target authoring guide

### Frontmatter fields

```yaml
---
name: <package-or-app-name>     # matches directory name
kind: package | app | integration
flow_role: <role>               # see GLOSSARY for legal values
custody: non-custodial | custodial | mixed | n/a
status: stable | experimental | stub
# REQUIRED for onramp/offramp packages:
regions:
  - country: BR
    currency: BRL
    rails: [pix]
# REQUIRED for provider wrappers:
provider:
  name: <Partner Name>
  docs: https://...
  api_reference: https://...
  agent_docs: https://.../llms.txt    # or 'none'
  status_page: https://...            # optional
  changelog: https://...              # optional
  source: <repo-path>                 # only for first-party SDKs we own (D-027)
---
```

### Body sections (in order)

1. **Title + opening paragraph** — what this is, why it exists.
2. **Provider documentation** — for provider wrappers. Live links + "consult provider docs first" instruction.
3. **Supported regions** — table form for onramp/offramp.
4. **Capabilities** — verbs the package/app does.
5. **Public surface** — exports + (stable/internal) markers.
6. **Required environment** — env vars, required/optional, sandbox vs prod.
7. **Slots vs invariants** — what's configurable per instance vs locked by contract.
8. **Integration map** — imports + imported by.
9. **Examples** — one minimal canonical usage code block.
10. **Do / Don't** — gotchas.
11. **Open questions / known gaps** — be honest.

### Per-app required sections (additions to template)

Each app AGENTS.md adds:
- **Theming** — note that the app uses `createDemoMiddleware` + `<ThemeStyleTag>`. SSR-only theme. No client-side theme fetch. (D-008)
- **Credentials** — Dynamic env (per-app or default), Fireblocks (per-app, default, or none), other providers via dashboard orchestration.
- **Deployment** — Vercel project name, root dir, required env, custom domain status, owner.
- **Data boundaries** — apps don't access Postgres; Redis for ephemeral; Dynamic metadata for user state; events to dashboard for canonical persistence.

### Spark26 AGENTS.md

Doc-only. Explicit exception language:

> ## Important: spark26 zero-touch
>
> Spark26 is production. Source files under `apps/spark26/` must not be modified except via PRs explicitly titled `[spark26]` (CI-enforced). This applies to all Phase 1–7 work in the demo meta-system project.
>
> Spark26 uses local primitives that diverge from monorepo conventions:
> - Local Dynamic helpers in `lib/dynamic/server.ts` (not `@dynamic-demos/dynamic`).
> - Local `lib/types/order-state.ts` state machine (not `@dynamic-demos/transactions`).
> - Local `lib/store/order-store.ts` (Redis, not Postgres).
> - Local theme in `app/globals.css` (not `--brand-*` contract).
>
> These are preserved by exception (D-006). To converge, schedule a separate planned project with its own QA gate.

## Demo registry generator

`scripts/generate-demo-registry.ts`:

- Walks `packages/*/AGENTS.md` and `apps/*/AGENTS.md`.
- Parses YAML frontmatter (use `yaml` or `gray-matter` package).
- Outputs `.claude/demo-registry.md` with sections:
  1. Demo types index (apps with `kind: app`).
  2. Onramp providers (packages with `flow_role: onramp`) — table by region.
  3. Offramp providers (`flow_role: offramp`) — table by region.
  4. Bridge/swap providers (`flow_role: bridge`).
  5. Wallet/auth providers.
  6. Theming and shared utilities.
- Emits machine-parseable JSON sibling at `.claude/demo-registry.json` for the skill to consume programmatically.

Add to `package.json`: `"registry": "tsx scripts/generate-demo-registry.ts"`. Run in CI on every PR; if regenerated registry differs from committed `.claude/demo-registry.md`, fail (forces authors to commit registry updates).

## Lint workflow

`.github/workflows/agents-md-lint.yml`:

- Triggered on PR.
- Runs a lint script (`scripts/lint-agents-md.ts`):
  - Every package/app has an `AGENTS.md`.
  - Frontmatter parses as valid YAML.
  - Required fields present per `kind` and `flow_role`.
  - File ≤150 lines.
  - All `provider.*` URLs are syntactically valid.
- Fails PR if any check fails.

## Acceptance criteria (per AGENTS.md PR)

- [ ] AGENTS.md follows the template structure.
- [ ] Frontmatter validates against schema (lint passes).
- [ ] Body sections required for the target type are all present.
- [ ] File is ≤150 lines.
- [ ] DECISIONS.md references included where relevant (D-NNN inline).
- [ ] If migrating from a CLAUDE.md or stashed content: original deleted in same PR.
- [ ] Demo registry regenerated and committed.
- [ ] CI gates pass.
- [ ] `apps/spark26/` source untouched (AGENTS.md doc-only is permitted).

## Acceptance criteria (registry generator + lint workflow PR)

- [ ] `scripts/generate-demo-registry.ts` exists and runs.
- [ ] `.claude/demo-registry.md` and `.claude/demo-registry.json` generated.
- [ ] Lint workflow passes for all existing AGENTS.md files.
- [ ] CI gates pass.

## Commit plan (per AGENTS.md PR)

1. `docs(<target>): author AGENTS.md per template`
2. `docs(registry): regenerate demo-registry`

## Commit plan (registry/lint PR)

1. `feat(scripts): add generate-demo-registry`
2. `feat(scripts): add agents-md lint`
3. `ci(github): add agents-md-lint workflow`
4. `chore(claude): commit initial generated registry`

## PR title patterns

- `docs(<target>): Phase 3 — author AGENTS.md`
- `feat(scripts): Phase 3 — demo-registry generator + lint`

## PR description template

```
## Phase 3 of demo meta-system — <target>

Authors AGENTS.md for `<target>` per the canonical template. <Migrates stashed Phase 0 content if applicable.>

### What changed
- `<target>/AGENTS.md` created.
- Demo registry regenerated.
- <Stashed content from `docs/projects/demo-meta-system/migrations/<file>` migrated and stash deleted.>

### Spark26
<Untouched — or, for spark26 itself: doc-only, exception clearly documented.>

### Tests
- `agents-md-lint` passes.
- CI gates pass.

### References
- `DECISIONS.md` (D-014, D-027 if Dynamic, D-006 if spark26)
- Phase prompt: `docs/projects/demo-meta-system/phases/03-agents-md.md`
```

After merge, update `PROGRESS.md` row "3. AGENTS.md + demo-registry" — track per-target completion in a sub-list if useful.
