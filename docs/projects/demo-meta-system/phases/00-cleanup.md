# Phase 0 — Repo cleanup

> **Self-contained agent prompt.** You are a fresh Claude Code agent. You have no prior conversation context. Read this entire file before doing anything. The plan and locked decisions are in `docs/projects/demo-meta-system/PLAN.md` and `DECISIONS.md`; read those next.

---

## Your role

You are executing **Phase 0** of the demo meta-system project. Your job is to clean noise from the repo so that subsequent phases (which add lots of new docs and packages) can land on a tidy foundation rather than an existing mess.

This phase ships as **one logical PR**.

## Wave + dependencies

- This is the first phase in Wave 1.
- No dependencies. Begin immediately.
- This phase blocks Phase 0.5 (CI baseline) and everything downstream.

## Skills to use

Invoke these `superpowers:` skills before starting work:

1. `superpowers:using-git-worktrees` — create an isolated worktree at `.worktrees/phase-0-cleanup` on a new branch `phase/00-cleanup` based off `main`. All your file changes happen inside the worktree.
2. `superpowers:writing-plans` — write a short execution plan tracking the file moves below as todos.
3. `superpowers:verification-before-completion` — before opening the PR.
4. `superpowers:requesting-code-review` — at PR open time.

## Hard rules (apply across this phase)

- `apps/spark26/` is **zero-touch**. Don't move, edit, rename, or delete anything under it.
- Use `git mv` for relocations so history is preserved. Never `rm + write new`.
- No code changes — only file moves, deletions, and the trim of root `CLAUDE.md`.
- One commit per logical group of changes (see commit plan below) — not one giant commit.
- Don't skip pre-commit hooks. If a hook fails, investigate and fix the cause.

## What needs to happen

### 1. Move `.planning/` to docs/projects/

`.planning/` contains 27 files belonging to a completed Crypto Shop project. Today they read as authoritative current-state to AI but aren't.

```
git mv .planning docs/projects/crypto-shop-demo
```

Verify nothing references `.planning/` from outside (it's frozen archive content):

```
git grep -E '\.planning/' -- ':!docs/projects/crypto-shop-demo'
```

If any references exist outside the moved dir, update them or stop and surface the issue.

### 2. Demote root-level `.md` files to `docs/`

Move (with `git mv`) these files. Create destination dirs as needed:

| Source | Destination | Notes |
|---|---|---|
| `API_CREATION_GUIDE.md` | `docs/contributing/api-patterns.md` | Developer guide |
| `CHECKOUTS_POC_DOCUMENTATION.md` | `docs/projects/checkouts-poc/CHECKOUTS_POC_DOCUMENTATION.md` | Historical POC docs |
| `ARCHITECTURE.md` | `docs/apis/checkout-v1-spec.md` | This file is actually a V1 Checkout API spec, not monorepo architecture |

**Defer:** `IRON_API_DOCUMENTATION.md` and `IRON_API_FLOWS.md`. They follow the Iron code into `packages/iron/docs/` during Phase 1B; leave at root for now with a note appended to root `CLAUDE.md` (see step 5).

### 3. Delete `.cursor/`

```
git rm -r .cursor
```

The team is standardizing on `AGENTS.md` as the cross-tool format (see DECISIONS.md D-016). The two pieces of content that lived under `.cursor/`:

- `.cursor/rules/mock-mode.md` — its content migrates into `apps/dashboard`'s AGENTS.md or the trade app's AGENTS.md when those land in Phase 3. **Capture the file's content into a temporary stash file** at `docs/projects/demo-meta-system/migrations/cursor-content-mock-mode.md` so Phase 3 has it.
- `.cursor/rules/tailwind-v4-canonical-utilities.mdc` — same pattern; stash at `docs/projects/demo-meta-system/migrations/cursor-content-tailwind.md`.
- `.cursor/skills/dynamic-javascript/SKILL.md` — same pattern; stash at `docs/projects/demo-meta-system/migrations/cursor-content-dynamic-javascript.md`.

The migrations/ directory is intentionally a temporary staging area — Phase 3 deletes these stash files after migrating their content into the right AGENTS.md targets.

### 4. Convert `apps/visa-direct/CLAUDE.md` → `apps/visa-direct/AGENTS.md`

```
git mv apps/visa-direct/CLAUDE.md apps/visa-direct/AGENTS.md
```

Do **not** restructure the content yet — Phase 3 reformats it against the AGENTS.md template. The file rename is structural only.

### 5. Trim root `CLAUDE.md` to ~50 lines

Read `CLAUDE.md` first. The current content is a project-overview + architecture-summary mixture. Replace with a short pointer file:

```markdown
# CLAUDE.md

Prime context for AI agents working on this monorepo.

## What this is

Multi-app Next.js monorepo for Dynamic Demos. Apps under `apps/<name>/`, shared packages under `packages/<name>/`. The dashboard (`apps/dashboard`) orchestrates demo creation and provider operations.

## Read these before starting any non-trivial task

- `docs/projects/demo-meta-system/PLAN.md` — current execution plan (the demo meta-system effort).
- `docs/projects/demo-meta-system/DECISIONS.md` — locked architectural decisions.
- `docs/projects/demo-meta-system/GLOSSARY.md` — terminology.
- `docs/projects/demo-meta-system/PROGRESS.md` — current execution state.

## Per-package and per-app docs

Every package and app in this monorepo has an `AGENTS.md` (template: `docs/templates/AGENTS.template.md`). Read the relevant `AGENTS.md` before touching code in a given package or app — frontmatter declares capabilities, regions, custody, provider docs links; body documents public surface, env, slots, invariants, and gotchas.

## Hard rules

1. `apps/spark26/` is production. Zero-touch unless your PR title contains `[spark26]` (CI-enforced).
2. Apps don't access Postgres directly — read config via dashboard API, persist transient state in Redis, user state in Dynamic metadata.
3. Apps hold only Dynamic + Fireblocks credentials; other provider secrets stay in dashboard.
4. Sandbox by default for every provider; production opt-in requires explicit env var + `[prod-creds]` PR title.
5. AGENTS.md is updated in the same PR that changes a package's behavior.

## Open archives

Iron API documentation (`IRON_API_DOCUMENTATION.md`, `IRON_API_FLOWS.md`) currently sits at root. These move into `packages/iron/docs/` when Phase 1B extracts the Iron client.

## Commands

- `pnpm install` — install workspace deps.
- `pnpm dev` — see per-app `package.json` for ports.
- `pnpm turbo typecheck && pnpm turbo lint && pnpm turbo build && pnpm turbo test` — full pre-PR check.
```

Trim more if anything above is redundant. Preserve only what an agent reading this cold needs.

### 6. Verify nothing broke

Run from the worktree root:

```
pnpm install --frozen-lockfile
pnpm turbo typecheck
pnpm turbo lint
pnpm turbo build
```

If any fail, **stop and surface the cause.** This phase is move-only, so failures indicate a hidden reference somewhere — fix it before the PR.

## Commit plan (one commit per group)

1. `chore(repo): relocate .planning/ to docs/projects/crypto-shop-demo/`
2. `chore(repo): demote root API/POC/architecture docs to docs/`
3. `chore(repo): remove .cursor/ and stash content for Phase 3 migration`
4. `chore(visa-direct): rename CLAUDE.md to AGENTS.md (content unchanged)`
5. `docs(claude-md): trim root CLAUDE.md to pointer doc`

## Acceptance criteria

- [ ] `.planning/` no longer exists at repo root; contents are at `docs/projects/crypto-shop-demo/` with history preserved.
- [ ] Root has no `API_CREATION_GUIDE.md`, `CHECKOUTS_POC_DOCUMENTATION.md`, or `ARCHITECTURE.md`.
- [ ] `.cursor/` is gone; three stash files exist under `docs/projects/demo-meta-system/migrations/`.
- [ ] `apps/visa-direct/CLAUDE.md` → `apps/visa-direct/AGENTS.md` (content unchanged).
- [ ] Root `CLAUDE.md` is ~50 lines and points to plan + AGENTS.md convention.
- [ ] `pnpm turbo typecheck && pnpm turbo lint && pnpm turbo build` all green from the worktree.
- [ ] No source files (TS/TSX/CSS/JS) modified.
- [ ] No file under `apps/spark26/` touched.

## Open the PR

Title: `chore(repo): Phase 0 cleanup — relocate planning, demote docs, remove .cursor`

Description template:
```
## Phase 0 of demo meta-system

Cleans repo noise so subsequent phases land cleanly. No code changes; pure file moves + a `CLAUDE.md` trim.

### What changed
- `.planning/` (27 files, completed Crypto Shop project) → `docs/projects/crypto-shop-demo/`.
- Root `API_CREATION_GUIDE.md`, `CHECKOUTS_POC_DOCUMENTATION.md`, `ARCHITECTURE.md` demoted to `docs/`.
- `.cursor/` deleted; content stashed at `docs/projects/demo-meta-system/migrations/` for Phase 3 migration into AGENTS.md.
- `apps/visa-direct/CLAUDE.md` → `AGENTS.md` (rename only; content unchanged, restructure in Phase 3).
- Root `CLAUDE.md` trimmed to ~50-line pointer doc.

### Out of scope
- `IRON_API_DOCUMENTATION.md` + `IRON_API_FLOWS.md` stay at root; they relocate into `packages/iron/docs/` during Phase 1B.
- Stashed `.cursor/` content gets migrated into appropriate AGENTS.md files in Phase 3.
- `apps/spark26/` untouched (production app, zero-touch rule).

### Tests
- `pnpm turbo typecheck && pnpm turbo lint && pnpm turbo build` all pass.

### References
- `docs/projects/demo-meta-system/PLAN.md`
- `docs/projects/demo-meta-system/DECISIONS.md` (D-006, D-016, D-017)
```

After merge, update `docs/projects/demo-meta-system/PROGRESS.md` row "0. Cleanup" to `🟢 done` with PR link.
