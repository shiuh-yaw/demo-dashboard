# create-demo-app fixtures

Fixtures for the skill's acceptance test. Each fixture is a YAML-frontmatter markdown file consumed by `__tests__/harness.ts`, which spawns a real `claude -p` session against a fresh git worktree per fixture and asserts the declared expectations.

**Files:**

- `success-stablecoin-sandwich.md` — success path: US→BR stablecoin sandwich (Coinbase onramp → LI.FI bridge → Iron offramp). The project completion criterion per `docs/projects/demo-meta-system/PLAN.md`.
- `failure-no-coverage.md` — Failure Class 1: corridor unsupported.
- `failure-wrong-region.md` — Failure Class 2: named provider doesn't cover named region.
- `failure-ambiguous.md` — Failure Class 3: multiple providers cover the corridor.
- `failure-out-of-scope.md` — Failure Class 4: not a payment-flow demo.
- `failure-missing-piece.md` — Failure Class 5: unknown provider mentioned.

## Running

- `pnpm test:skill` — runs all 5 failure-mode fixtures (~3-8 minutes; <30s each).
- `pnpm test:skill:success` — runs the success-path fixture (expensive: full scaffolding + typecheck).

Both are **local-only — requires an `ANTHROPIC_API_KEY`** in the environment. The repo has no CI Anthropic API key, so these are not gated in CI; the manual procedure for environments without an API key is documented in `docs/engineering/skill-acceptance-test.md`.

Run before any release that touches `.claude/skills/create-demo-app/**`, `.claude/demo-registry.json`, or any of the underlying registry-listed providers.
