# Skill integration acceptance test — runbook

End-to-end acceptance test for the `create-demo-app` skill. Run before any release that touches `.claude/skills/create-demo-app/**`, `.claude/demo-registry.json`, or the underlying registry providers.

## Purpose

This runbook is the **project completion criterion** per `docs/projects/demo-meta-system/PLAN.md`:

> Given a fixture demo-spec for a US→BR stablecoin sandwich, the skill scaffolds, the dashboard routes, and the resulting app builds and renders the configured brand correctly. Zero file changes for any of the four documented failure-mode prompts.

There are two paths to running the test:

1. **Automated (preferred).** `pnpm test:skill` (failure modes) and `pnpm test:skill:success` (success path). The harness at `.claude/skills/create-demo-app/__tests__/harness.ts` spawns real `claude -p` sessions against fresh git worktrees per fixture and asserts the declared YAML-frontmatter expectations.
2. **Manual fallback.** When no `ANTHROPIC_API_KEY` is available (e.g. CI machine without budget, contractor laptop), an operator runs each fixture by hand and fills in the checklist below.

Both paths exercise the same fixtures under `.claude/skills/create-demo-app/fixtures/`.

## Path 1 — Automated

### Prerequisites

- `ANTHROPIC_API_KEY` in env. Token cost is small for failure modes (~5 short sessions × <30s) and larger for success-path (one full scaffolding run).
- Clean local working tree.
- `pnpm install --frozen-lockfile` against current `main`.

### Run

```bash
# All 5 failure-mode fixtures (~3-8 minutes):
pnpm test:skill

# Success-path fixture (expensive; full scaffolding + typecheck):
pnpm test:skill:success
```

The harness creates a fresh worktree per fixture, runs the skill, asserts on stdout + `git status`, and cleans up. Failures are reported with the fixture filename, the failed assertion, and the captured session output.

If any fixture fails, fix the skill (typically `.claude/skills/create-demo-app/SKILL.md` or `.claude/demo-registry.json`) and re-run. A change to one failure-class template can regress another class — always re-run the full suite, not just the failing fixture.

## Path 2 — Manual fallback

Use this path when `ANTHROPIC_API_KEY` is unavailable, OR when you want to eyeball the actual session output (e.g. you suspect a regression that the automated assertions don't catch — wording quality, off-by-one questions, etc.).

### Prerequisites

- [Claude Code](https://docs.anthropic.com/claude/docs/claude-code) installed and signed in.
- Local clone of this repo, `main` up to date.
- A fresh branch off `main` (one per fixture, or one shared if you fully clean state between runs).
- `pnpm install --frozen-lockfile` completes against current `main`.

### Procedure (one fixture)

For each fixture file under `.claude/skills/create-demo-app/fixtures/`:

1. **Check out a fresh branch from `main`:**

   ```bash
   git fetch origin main
   git checkout -B skill-acceptance/<fixture-slug>-<unix-timestamp> origin/main
   ```

2. **Start a new Claude Code session** in the repo root.

3. **Paste the fixture's `prompt` value verbatim** (read it from the YAML frontmatter at the top of the fixture file). Do NOT add context, instructions, or qualifiers — the whole point is to verify the skill triggers from the prompt alone.

4. **Let the skill auto-trigger.** If it does not (regression), invoke explicitly via `/create-demo-app`. Note whether auto-trigger worked in the table below.

5. **Verify against the fixture's frontmatter expectations:**
   - `expected_outcome: success` → the session should produce a working scaffold + PR.
   - `expected_outcome: failure` with `expected_class: N` → the session should print the Class N response template per `SKILL.md`.
   - `expected_files_created` → check the listed paths exist after the session.
   - `must_contain` → the session output must include each listed string.
   - `must_be_question_count` → the session's final output must contain exactly that many `?` characters.
   - `must_not_change_files: true` → `git status` after the session MUST report a clean tree (zero file changes).

6. **Record pass/fail** in the release-gate table below.

7. **Clean up.** Delete the branch and close any opened PRs.

### Release-gate checklist (manual path)

| Fixture | Run date | Tester | Outcome | Notes |
|---|---|---|---|---|
| `success-stablecoin-sandwich.md` | | | | |
| `failure-no-coverage.md` | | | | |
| `failure-wrong-region.md` | | | | |
| `failure-ambiguous.md` | | | | |
| `failure-out-of-scope.md` | | | | |
| `failure-missing-piece.md` | | | | |

All six must pass before merging the release. If a fixture fails:

1. **Do NOT merge the release** until the skill is updated.
2. **File a GitHub issue** describing the failure: fixture filename, exact prompt, failed expectation, actual skill output (paste verbatim), and `git status` output if the failure was an unexpected file change.
3. **Fix the skill** and re-run.
4. **Re-run every fixture** after the fix — see note above about cross-class regressions.

## Cadence

Run this runbook (automated or manual) before any release that touches:

- `.claude/skills/create-demo-app/**` (skill prompt, fixtures, tests, harness).
- `.claude/demo-registry.json` or `.claude/demo-registry.md` (regenerated by `scripts/generate-demo-registry.mjs`).
- Any provider package's `AGENTS.md` `regions[]`, `flow_role`, or `provider:` block (these flow into the registry).
- The skill's required-reading files: `docs/projects/demo-meta-system/DECISIONS.md`, `GLOSSARY.md`, `docs/templates/demo-spec.schema.json`, `packages/dynamic/AGENTS.md`.

Not required for unrelated changes (e.g. spark26-only PRs, theme migrations of existing apps, dashboard service refactors that don't touch the registry).

## What this runbook does NOT verify

In the spirit of being honest about scope:

- It does **not** measure skill latency or token cost.
- It does **not** verify the generated demo app's runtime behavior beyond `pnpm turbo typecheck` / `pnpm turbo lint` (no e2e Playwright run, no actual Dynamic-auth round-trip).
- It does **not** verify that the generated app's branding looks correct in a browser — the success-path fixture's expectations stop at "theme cookie wiring is present" (structural), not "the rendered page is on-brand" (visual).
- It does **not** exercise every demo-type / corridor combination — only the canonical US→BR stablecoin sandwich plus the five failure classes. Coverage of other combinations is the operator's judgment call when adding new providers.

Visual verification, deeper e2e runtime checks, and broader corridor coverage are tracked as deferred follow-ups.
