# Phase 1F — pnpm catalog for shared dependencies

> **Self-contained agent prompt.** Read this entire file. Then `PLAN.md`, `DECISIONS.md`, `GLOSSARY.md`, `PROGRESS.md`.

---

## Your role

Promote duplicated dependency versions across all apps into a single `pnpm-workspace.yaml` catalog, so future bumps are one-line edits. Without this, every SDK / framework upgrade requires editing N package.json files (Phase 1D just did exactly that across 9 apps for Dynamic SDK).

This phase ships as **one logical PR**.

## Wave + dependencies

- Wave 2 (sequenced after Phase 1D — 1D consolidates SDK versions; this phase locks them into the catalog).
- Independent of Phase 2-migrate, Phase 3, Phase 4. Can land alongside Wave 3.
- Does NOT block any other phase.

## Skills to use

1. `superpowers:using-git-worktrees` — `.worktrees/phase-1f-catalog`, branch `phase/01f-catalog`.
2. `superpowers:writing-plans` — survey-then-edit, document version analysis before changes.
3. `superpowers:verification-before-completion`.
4. `superpowers:requesting-code-review`.

## Hard rules

- **`apps/spark26/` is ZERO-TOUCH.** If spark26 currently uses different versions than the consolidated values, do NOT force it into the catalog — leave it on its explicit versions. Do not modify spark26's `package.json` even to swap a version string for `catalog:`.
- No version changes. This is a syntactic refactor only — same versions, new reference mechanism.
- pnpm 9.15.4 (current) supports `catalog:` references. CI runs pnpm 9.15.4 (`.github/workflows/ci.yml`). Verify compatibility with Vercel's pnpm version before declaring done.
- Lockfile changes are expected (pnpm rewrites resolutions when adding catalog references). Commit the regenerated lockfile.
- One commit per logical group, not one per package.json edit.

## Required reading before code changes

- `pnpm-workspace.yaml` (current state — likely just `packages:` block).
- Every `apps/*/package.json` and every `packages/*/package.json`.
- `apps/spark26/package.json` for awareness (zero-touch).
- pnpm catalogs documentation: https://pnpm.io/catalogs (use Context7 / WebFetch as needed).
- `docs/projects/demo-meta-system/DECISIONS.md` — D-006 (spark26 zero-touch).
- The post-Phase-1D state — Dynamic SDK already aligned at 0.25.0 across 9 apps.

## What needs to happen

### Step 1 — Survey

Run a script to enumerate every dependency declared in `apps/*/package.json` + `packages/*/package.json`. Output a table per package showing:

```
Package: @dynamic-labs-sdk/client
  apps/checkouts: 0.25.0
  apps/dashboard: 0.25.0
  apps/deposit: 0.25.0
  apps/earn: 0.25.0
  ...
  apps/spark26: 0.25.0   ← spark26 inclusion is informational only; we do NOT modify it
```

Mark each package with one of:
- **Eligible for catalog** — same version everywhere except possibly spark26
- **Mixed versions** — different apps use different versions deliberately; SKIP unless trivially alignable
- **Single use** — only one app uses it; not catalog-worthy
- **Workspace-only** — `workspace:*`; already handled by pnpm workspace; SKIP

Document the survey output in your plan before editing anything.

### Step 2 — Define catalog entries

In `pnpm-workspace.yaml`:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'

catalog:
  # Dynamic SDK
  '@dynamic-labs-sdk/client': '0.25.0'
  '@dynamic-labs-sdk/evm': '0.25.0'
  '@dynamic-labs-sdk/solana': '0.25.0'
  '@dynamic-labs-sdk/zerodev': '0.25.0'
  '@dynamic-labs-sdk/wallet-connect': '0.25.0'
  '@dynamic-labs-sdk/bitcoin': '0.25.0'
  # ...other Dynamic packages found in survey

  # Dynamic wallet
  '@dynamic-labs-wallet/browser-wallet-client': '<version>'
  # ... wallet packages found

  # Framework
  next: '15.5.9'
  react: '19.1.4'
  react-dom: '19.1.4'

  # Shared infrastructure
  zod: '<version>'
  '@t3-oss/env-nextjs': '<version>'
  '@upstash/redis': '<version>'
  '@upstash/qstash': '<version>'
  '@tanstack/react-query': '<version>'

  # Shared UI primitives (where versions align)
  'lucide-react': '<version>'   # if aligned across apps
  'clsx': '<version>'
  'tailwind-merge': '<version>'

  # Tooling — the @types/* worth catalog'ing
  '@types/react': '<version>'
  '@types/react-dom': '<version>'
  '@types/node': '<version>'
```

Only include packages where:
1. Multiple apps use the same version, OR
2. Multiple apps SHOULD use the same version (drift in evidence; align here)
3. spark26's version (if any) doesn't conflict — if it does, exclude or accept that spark26 keeps an explicit version

### Step 3 — Replace explicit versions with `catalog:` references

For every package.json that uses a catalog'd dependency:

```json
"@dynamic-labs-sdk/client": "0.25.0"
```

becomes

```json
"@dynamic-labs-sdk/client": "catalog:"
```

**Exception: `apps/spark26/package.json` — DO NOT EDIT.** Even if its version matches the catalog, leave it on the explicit string. Zero-touch.

For packages where spark26 has a different version than the catalog default: leave spark26 with its explicit version. The other apps switch to `catalog:`.

### Step 4 — Regenerate lockfile

```bash
pnpm install --no-frozen-lockfile
```

This rewrites `pnpm-lock.yaml` with catalog'd resolutions. Commit the regenerated lockfile.

### Step 5 — Verify

1. `pnpm install --frozen-lockfile` — must succeed (CI gate).
2. `pnpm turbo typecheck` — must pass (no behavior change expected).
3. `pnpm turbo lint` — must pass.
4. `pnpm turbo test` — must pass.
5. `git diff --stat` — confirm changes are limited to package.json files (NOT spark26's), pnpm-workspace.yaml, and pnpm-lock.yaml. No source files touched.
6. Spot-check 2–3 apps: confirm `node_modules/<dep>` resolves to the same version as before catalog'ization.

### Step 6 — Document

Update `pnpm-workspace.yaml` with header comments explaining the catalog convention:

```yaml
# Dependency catalog — single source of truth for shared package versions.
# Apps reference via `"<pkg>": "catalog:"` instead of pinning. Future bumps
# = edit this file, run `pnpm install --no-frozen-lockfile`.
#
# spark26 is intentionally NOT migrated to catalog references (D-006 zero-touch).
# Leave its package.json untouched even when versions match the catalog.
```

Update root `CLAUDE.md` "Commands" section with a one-liner: how to bump a shared dep (edit `pnpm-workspace.yaml`, then `pnpm install --no-frozen-lockfile`).

Update `docs/projects/demo-meta-system/DECISIONS.md` with a new decision entry (or update an existing one) documenting that the catalog is canonical for shared deps. Reference the visa-direct → unified pnpm-workspace decision shape.

## Acceptance criteria

- [ ] `pnpm-workspace.yaml` has a `catalog:` block covering Dynamic SDK / wallet / framework / shared infrastructure deps where versions align.
- [ ] Every `apps/*/package.json` (except spark26) and `packages/*/package.json` references catalog'd deps via `catalog:`.
- [ ] `apps/spark26/package.json` is byte-identical to its pre-PR state.
- [ ] `pnpm install --frozen-lockfile` succeeds in CI.
- [ ] No source file changes (only package.json + pnpm-workspace.yaml + pnpm-lock.yaml).
- [ ] CI gates pass (typecheck, lint, test).
- [ ] Spark26-protection script-self-test passes (via the existing CI step).
- [ ] DECISIONS.md or CLAUDE.md documents the catalog convention.

## Commit plan

1. `chore(workspace): define pnpm catalog for shared dependencies`
   — adds `catalog:` block to `pnpm-workspace.yaml`; no other file changes.
2. `chore(apps): reference @dynamic-labs-sdk packages via catalog`
   — sweep across all apps EXCEPT spark26; bundles into one commit since the change is identical per app.
3. `chore(apps): reference next + react + framework deps via catalog`
   — Next.js / React / React DOM / @types/react etc.
4. `chore(apps): reference shared infrastructure deps via catalog`
   — zod / @t3-oss / @upstash / @tanstack / etc.
5. `chore(packages): reference shared deps via catalog`
   — same sweep across `packages/*`.
6. `chore(workspace): regenerate pnpm-lock.yaml after catalog migration`
   — lockfile changes.
7. `docs: document pnpm catalog convention in CLAUDE.md + DECISIONS.md`

(Bundle 2–5 if the diffs are small. Keep the lockfile commit separate so reviewers can skip it.)

## PR title

`chore(workspace): Phase 1F — pnpm catalog for shared dependencies`

## PR description template

```
## Phase 1F of demo meta-system

Promotes duplicated dep versions across all apps + packages into a single
`pnpm-workspace.yaml` catalog. Eliminates per-app drift; future bumps are
one-line edits.

### What changed
- `pnpm-workspace.yaml` gains a `catalog:` block covering: Dynamic SDK,
  Dynamic wallet, Next/React, zod, @t3-oss/env-nextjs, @upstash/*,
  @tanstack/react-query, shared UI primitives, common @types.
- All apps + packages reference catalog'd deps via `"catalog:"`.
- `pnpm-lock.yaml` regenerated.

### Spark26
**Untouched.** spark26 keeps explicit versions (D-006 zero-touch).
Even where its versions match the catalog, the package.json is byte-identical.

### Verification
- `pnpm install --frozen-lockfile` succeeds.
- `pnpm turbo typecheck && lint && test` all pass.
- No source files modified — only dependency declarations.

### Future drift prevention
After this PR, the SDK / framework version drift class of bug (the kind
Phase 1D had to fix manually) is no longer possible without explicit
opt-out. To bump:
1. Edit `pnpm-workspace.yaml`.
2. `pnpm install --no-frozen-lockfile`.
3. Commit the lockfile change.

### References
- `DECISIONS.md` (D-006 spark26 zero-touch; new catalog convention entry)
- Phase prompt: `docs/projects/demo-meta-system/phases/01f-pnpm-catalog.md`
- pnpm catalogs: https://pnpm.io/catalogs
```

## After merge

1. Update `PROGRESS.md` row "1F. pnpm catalog for shared dependencies" to `🟢 done`.
2. Add a note to the Phase 4 / Phase 5C prompts (and any future phase that adds new shared deps) reminding agents to add new catalog entries when introducing dependencies that other apps will adopt.
3. If any pnpm catalog edge cases were discovered (e.g., a peer-dep warning that was masked by version drift), document in `OPEN-QUESTIONS.md`.

## Out of scope

- Bumping any package version (this is a syntactic refactor; new versions are a separate PR).
- Migrating dev-only deps that don't need to align (e.g., per-app vitest fixtures).
- Migrating spark26 (D-006).
- Renovate / Dependabot configuration changes (separate concern).
