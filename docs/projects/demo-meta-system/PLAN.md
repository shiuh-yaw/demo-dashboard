# Demo Meta-System — Execution Plan

> **This plan is executed by parallel AI agents.** Each phase file in `phases/` is a self-contained prompt. The dispatcher (human or orchestrator agent) launches agents per the dependency graph below. Every agent works in a git worktree, uses superpowers skills, and commits a logical PR.

---

## Goal

Make it possible for non-engineers to 1-shot a new demo app via Claude Code. The repo, packages, dashboard, and skill encode enough implicit context that a single one-line prompt produces a working, themed, secure demo without further input.

## Status

**Plan complete. Full execution decided.** Awaiting Phase 0 dispatch.

Track progress in `PROGRESS.md` and update it as each PR merges.

---

## Project shape (decisions already locked)

See `DECISIONS.md` for full rationale. Summary:

1. Dashboard is the orchestrator: owns Postgres, owns commodity-provider secrets, exposes `/api/orchestrate/*`, receives all webhooks.
2. Demo apps are thin presentation layers. They hold their own Dynamic + Fireblocks credentials (with shared defaults). All other provider operations go through dashboard.
3. Single CSS variable contract (`--brand-*`), defaults sourced from proceeds, applied via the visa-direct cookie + SSR pattern.
4. State machine lives in `packages/transactions`. No raw state assignment anywhere.
5. Webhooks land at dashboard only. Apps poll for state changes.
6. Sandbox-by-default. Production opt-in via explicit env var + `[prod-creds]` PR title.
7. Skill writes to a branch + PR, never main.
8. **`apps/spark26/` is production. Zero-touch.** Every prompt enforces this. CI blocks accidental modifications.
9. Provider package boundary is by API mechanism, not partner brand.
10. AGENTS.md is required for every package and app. Frontmatter is queryable.

---

## Dispatch graph

Phases must be dispatched in waves. Within a wave, sub-phases run in parallel.

```
Wave 1  ─→  [Phase 0: Cleanup]         (1 agent)
            [Phase 0.5: CI baseline]   (1 agent, after Phase 0 PR merges)

Wave 2  ─→  [Phase 1A: Fireblocks Orders]      ┐
            [Phase 1B-alfredpay]                │
            [Phase 1B-blindpay]                 │  parallel
            [Phase 1B-iron]                     │
            [Phase 1B-coinbase-onramp]          │
            [Phase 1B-lifi]                     │
            [Phase 1E: Transactions package]   ─┘
            [Phase 1D: Dynamic consolidation]  (separately, after others — touches many apps)
            [Phase 1F: pnpm catalog]  (sequenced after 1D — locks consolidated versions)
            [Phase 2 scaffold: Prisma + Supabase setup]  (in parallel, independent)

Wave 3  ─→  [Phase 2 migrations: brands, then per demo type]  (mostly serial)
            [Phase 3: AGENTS.md authoring]      (parallel per package/app)

Wave 4  ─→  [Phase 4: Theme migration per app]  (parallel per app)
            [Phase 5A: Webhook framework]
            [Phase 5B: Orchestration API]
            [Phase 5C: Dashboard scaffolding templates]

Wave 5  ─→  [Phase 6A: Skill]
            [Phase 6B: Vercel deploy script]
            [Phase 6C: Engineer runbooks]

Wave 6  ─→  [Phase 7: Implicit context capture]

Wave 7  ─→  [Phase 8: Chat UI / hosted demo creation]   (post-MILESTONE-1; does NOT block v1)
```

### Dispatch rules

- **Each agent owns one phase file** (or one sub-phase within a multi-section file). Never split a single phase across agents.
- **Each agent creates its own git worktree** under `.worktrees/<phase-id>` using `superpowers:using-git-worktrees`. Never share a worktree.
- **Each agent merges via a single logical PR** before the next dependent wave begins.
- **A wave is complete only when all PRs in that wave are merged to main.** Wait, don't dispatch the next wave with stale main.
- **Conflicts:** if two parallel agents would touch the same file, sequence them. The phase prompts call out known conflict zones.

---

## How to dispatch a phase

Pick a phase file from `phases/` and hand its full contents to a fresh Claude Code agent (or the orchestrator agent that fans out). The phase file is the complete prompt — agent has no other context.

The dispatcher's role:
1. Verify all this phase's dependencies are merged to main (check `PROGRESS.md`).
2. Hand the phase prompt to the agent.
3. When the agent reports the PR open, queue review.
4. After merge, mark the phase row in `PROGRESS.md`.
5. Dispatch the next eligible wave.

---

## Phase index

| File | Phase | Sizing | Depends on |
|---|---|---|---|
| `phases/00-cleanup.md` | 0. Repo cleanup | 1–2 days | — |
| `phases/00.5-ci-baseline.md` | 0.5. CI + spark26 protection | 1–2 days | Phase 0 |
| `phases/01a-fireblocks-orders.md` | 1A. Fireblocks Orders client + provider sub-modules | 2–3 days | Phase 0.5 |
| `phases/01b-providers.md` | 1B. Independent provider packages (alfredpay, blindpay, iron, coinbase-onramp, lifi) — five sub-prompts | 5–7 days (parallel) | Phase 0.5 |
| `phases/01d-dynamic-consolidation.md` | 1D. Dynamic SDK consolidation | 2–3 days | Phase 0.5; sequence after 1A/1B/1E to minimize conflicts |
| `phases/01e-transactions-package.md` | 1E. Transaction state machine package | 2 days | Phase 0.5 |
| `phases/01f-pnpm-catalog.md` | 1F. pnpm catalog for shared dependencies | 0.5 day | Phase 1D (locks consolidated versions) |
| `phases/02-prisma-supabase.md` | 2. Prisma + Supabase + brand FK + per-type migrations | 5–7 days | Phase 1 (mostly) |
| `phases/03-agents-md.md` | 3. AGENTS.md authoring + demo-registry generator | 2–3 days | Phase 1; parallelizable per package/app |
| `phases/04-theming.md` | 4. Default theme + visa-direct cookie pattern + per-app migration | 4–6 days | Phase 1D + Phase 3; parallel per app |
| `phases/05a-webhooks.md` | 5A. Webhook receiver framework | 3 days | Phase 1, Phase 1E, Phase 2 |
| `phases/05b-orchestration.md` | 5B. Orchestration API | 2–3 days | Phase 1B |
| `phases/05c-dashboard-scaffolding.md` | 5C. Dashboard scaffolding templates + demo-spec wiring + mock-data package | 2–3 days | Phase 2, Phase 5A |
| `phases/06-skill.md` | 6. Skill + Vercel deploy script + engineer runbooks (3 sub-prompts) | 4.5–5.5 days | Phases 3–5 |
| `phases/07-implicit-context.md` | 7. Implicit context capture (demo-spec wiring + skill prefill) | 1–2 days | Phase 6 |
| `phases/08-chat-ui.md` | 8. Chat UI / hosted demo creation (v0-style; 2–3 sub-PRs) | 5–8 days | Phases 5C, 6, 7 — does NOT block v1 milestone |

**Total: 43–66 agent-days for v1 (Phases 0–7); +5–8 agent-days for Phase 8 (post-v1).** Wall-clock significantly less due to parallelization within waves.

---

## Hard rules every agent must enforce

Lifted into every phase prompt; also maintained here for reference:

1. **`apps/spark26/` is zero-touch.** Doc-only changes (AGENTS.md) permitted later. Source code, env, build config, package.json — never modify.
2. **Apps don't access Postgres.** Read config from dashboard API; Redis for ephemeral state; Dynamic metadata for user state; events to dashboard for canonical persistence.
3. **Apps hold only Dynamic + Fireblocks credentials.** All other provider secrets stay in dashboard.
4. **Sandbox by default.** Production opt-in requires explicit env var + `[prod-creds]` in the PR title.
5. **No commits to main directly.** All work goes through PRs from worktree branches.
6. **No new code without tests.** Vitest is the standard. Smoke + contract tests at minimum for new packages.
7. **No skipping pre-commit hooks.** No `--no-verify`, no `--no-gpg-sign`. If a hook fails, fix the cause.
8. **No emojis in code or docs unless explicitly requested.**
9. **AGENTS.md is updated in the same PR that changes behavior.** Stale AGENTS.md is worse than missing.

---

## Connected artifacts

- `DECISIONS.md` — locked decisions with rationale.
- `OPEN-QUESTIONS.md` — outstanding decisions (mostly low-priority, items that can wait).
- `GLOSSARY.md` — terminology used across phase prompts.
- `PROGRESS.md` — running execution log; updated as each PR merges.
- `docs/templates/AGENTS.template.md` — frontmatter + body convention all packages/apps adopt.
- `docs/templates/demo-spec.schema.json` — versioned demo specification.
- `.claude/demo-registry.md` — auto-generated index, lands in Phase 3.
