# Phase 6 — Skill + Vercel deploy script + engineer runbooks

> **Self-contained agent prompt — multi-PR phase.** Read this entire file. Then `PLAN.md`, `DECISIONS.md`, `GLOSSARY.md`, `docs/templates/AGENTS.template.md`, `docs/templates/demo-spec.schema.json`.

---

## Your role

Build the Claude Code skill that makes 1-shot demo creation real. Plus the Vercel scripted setup and engineer runbooks. This is the project's user-visible deliverable.

Ships as **3 logical PRs**:
1. PR 6A — `.claude/skills/create-demo-app/` skill itself.
2. PR 6B — `pnpm setup:deploy` and `pnpm teardown:deploy` scripts.
3. PR 6C — Engineer runbooks (`docs/engineering/*.md`).

## Wave + dependencies

- Wave 5.
- Depends on Phase 3 (demo registry generated), Phase 4 (theming primitive), Phase 5 (dashboard scaffolding + orchestration + webhooks).

## Skills (every PR)

1. `superpowers:using-git-worktrees`.
2. `superpowers:writing-plans`.
3. `superpowers:test-driven-development` — skill failure-mode tests are the project's success criteria.
4. `superpowers:verification-before-completion`.
5. `superpowers:requesting-code-review`.

## Hard rules

- `apps/spark26/` zero-touch.
- Skill writes to a branch + PR, never main (D-012).
- Sandbox-by-default (D-005).
- Skill failure modes are explicitly tested (D-025).
- Reference Dynamic SDK source authoritatively when scaffolding Dynamic-related code (D-027).

---

## PR 6A — The skill

### What needs to happen

#### 1. Create `.claude/skills/create-demo-app/`

Standard Claude Code skill structure:

```
.claude/skills/create-demo-app/
  SKILL.md                              # frontmatter + instructions for the agent invoking
  scripts/                              # executable helpers used by the skill
    parse-intent.ts
    match-providers.ts
    pick-template.ts
    scaffold-dashboard-section.ts
    scaffold-app.ts
    open-pr.ts
  templates/                            # references docs/templates/dashboard-section
  fixtures/                             # test fixtures for failure modes + success path
    success-stablecoin-sandwich.json
    failure-no-coverage.json
    failure-wrong-region.json
    failure-ambiguous.json
    failure-out-of-scope.json
  __tests__/
    skill-integration.test.ts            # the project success criterion
    failure-modes.test.ts
```

#### 2. `SKILL.md` frontmatter

```yaml
---
name: create-demo-app
description: Use when the user asks to create a new demo app, scaffold a payment flow demo, or spin up a customer-branded demo. Triggers on phrases like "create a demo for...", "make a stablecoin sandwich demo", "scaffold a remittance demo for X". Reads .claude/demo-registry.md to know what's available.
---
```

#### 3. SKILL.md body — the agent's instructions

Self-contained instructions for the agent invoking the skill. Structure:

1. **Read these first** — `.claude/demo-registry.md`, `docs/projects/demo-meta-system/DECISIONS.md`, `docs/templates/demo-spec.schema.json`.
2. **Parse the user's intent** — extract corridor (source/dest country + currency + rails), brand reference, demo type (if explicitly named), custody preference, custom name. Use `scripts/parse-intent.ts` as a structured helper.
3. **Match against the registry** — find demo types that fit. If the user named a demo type that doesn't exist, treat as a new-demo-type request (rare path).
4. **Match providers** — for each flow segment (onramp, bridge, offramp), find packages whose `regions` cover the corridor and whose `flow_role` matches.
5. **Determine path** (existing vs new demo type):
   - **Existing:** the matched demo type already has a dashboard section. Don't generate code. Open the dashboard's `new` form pre-filled with the parsed intent. Output: a URL the user opens to complete creation.
   - **New (rare):** no existing demo type matches. Confirm with user explicitly before proceeding. Then scaffold via `scripts/scaffold-*.ts` into a worktree branch. Open a PR. Output: PR URL.
6. **Failure modes** — see Failure Modes section below. The skill must produce useful errors and zero file changes for unfulfillable prompts.
7. **PR convention** for new demo type scaffolding (D-012):
   - Branch: `skill/<demo-type>-<id>-<timestamp>`.
   - PR title: includes `[demo-spec]` to trigger the dedicated CI workflow.
   - PR body: embeds full demo-spec.json, file-by-file rationale, AGENTS.md compliance checklist, sandbox/prod confirmation.
   - Never commit to main directly. Never auto-merge.

#### 4. Failure modes — explicit acceptance tests

Per D-025, four classes:

1. **No provider matches the corridor.** Example: "Send USD to Antarctica."
   - Skill response: "No offramp providers cover Antarctica. Supported destinations: <list from registry>." Zero file changes.
2. **Specific provider explicitly requested but doesn't cover region.** Example: "Use BlindPay for Mexico."
   - Skill response: "BlindPay covers BR (PIX). For MX try alfredPay or Iron." Zero file changes.
3. **Ambiguous corridor / multiple matches.** Example: "Send to Brazil." (multiple PIX providers)
   - Skill response: asks ONE disambiguating question with options + recommendation. If user declines all, treats as Class 1.
4. **Unparseable / out-of-scope request.** Example: "Build me a Twitter clone."
   - Skill response: "This skill builds payment demos. Available demo types: <list>." Zero file changes.

Hard invariant: zero file changes for any of these classes. Compute the resolution plan first, validate, only then begin file writes. If validation fails, exit cleanly.

#### 5. Path-selection logic

For each provider segment (onramp, offramp), determine whether the path is:

- **Path A — Dashboard-orchestrated** (alfredPay-direct REST, BlindPay, Iron, Coinbase, LI.FI). Demo app calls `/api/orchestrate/...`. No app-side keys needed.
- **Path B — App-direct** (always for Dynamic auth; for Fireblocks if the demo-spec specifies a custom workspace). Demo app holds its own credentials.

Output to user / PR description: which path is used for which segment.

#### 6. SDK source reference

When scaffolding Dynamic auth code, verify the requested feature exists in the SDK source (D-027). If absent, report the gap honestly. Cite SDK file paths in generated comments.

#### 7. Tests

`__tests__/skill-integration.test.ts` — the project success criterion (Phase 7 close-out gate):

```ts
test('success path — stablecoin sandwich US→BR', async () => {
  const result = await runSkill(fixtures.success);
  // For now (existing demo type if 'stablecoin-sandwich' exists, or new if not):
  expect(result.outcome).toBe('opened-dashboard-form' | 'opened-pr');
  expect(result.errors).toEqual([]);
  // If PR: scaffolded files build cleanly; brand renders correctly.
});
```

`__tests__/failure-modes.test.ts` — one test per failure class:

```ts
test('class 1: no coverage → useful error, zero file changes', async () => { ... });
test('class 2: wrong region → suggests alternatives', async () => { ... });
test('class 3: ambiguous → asks one question', async () => { ... });
test('class 4: out of scope → reports demo-builder scope', async () => { ... });
```

All four must pass before the skill ships.

### Acceptance criteria (PR 6A)

- [ ] Skill exists at `.claude/skills/create-demo-app/`.
- [ ] SKILL.md frontmatter triggers on demo-creation phrases.
- [ ] Parse-intent, match-providers, scaffold-section, scaffold-app, open-pr scripts exist.
- [ ] All four failure-mode tests pass.
- [ ] Integration test for the success path passes.
- [ ] Skill never commits to main; always opens a PR.
- [ ] Sandbox-by-default verified.
- [ ] CI gates pass.
- [ ] `apps/spark26/` untouched.

### Commit plan (PR 6A)

1. `feat(skill): scaffold .claude/skills/create-demo-app structure`
2. `feat(skill): parse-intent + match-providers helpers`
3. `feat(skill): pick-template + scaffold-dashboard-section + scaffold-app helpers`
4. `feat(skill): open-pr helper with PR convention enforced`
5. `test(skill): failure-mode suite (four classes)`
6. `test(skill): integration test (success path)`

### PR title

`feat(skill): Phase 6A — create-demo-app skill`

---

## PR 6B — Vercel deploy + teardown scripts

### What needs to happen

#### 1. `scripts/setup-vercel-project.ts`

```bash
pnpm setup:deploy <app-name>
```

Steps:
1. Read `apps/<app-name>/package.json` and `.env.example`.
2. Call Vercel API with `VERCEL_TOKEN` (from env or 1Password CLI):
   - Create project named `dynamic-demos-<app-name>`.
   - Link to GitHub repo (assumes org-level integration is configured).
   - Set root directory to `apps/<app-name>`.
   - Set framework preset to Next.js.
3. Env var population — interactive prompt:
   - For shared keys (Dynamic env ID default, dashboard URL): pull from a known source.
   - For demo-specific keys (provider creds): prompt the engineer to paste; never echo.
4. Trigger initial deploy.
5. Print preview URL + reminder that custom domain requires manual Vercel dashboard step.

Add to root `package.json`:
```json
{
  "scripts": {
    "setup:deploy": "tsx scripts/setup-vercel-project.ts",
    "teardown:deploy": "tsx scripts/teardown-vercel-project.ts"
  }
}
```

#### 2. `scripts/teardown-vercel-project.ts`

```bash
pnpm teardown:deploy <app-name>
```

Reverse: deletes the Vercel project, drops env vars. Confirms with `--yes` flag for safety.

#### 3. Tests

- Mock Vercel API. Verify the script issues correct calls in correct order.
- Failure cases: missing token, invalid app-name, project already exists.

#### 4. Documentation

`docs/engineering/deploy-new-demo.md` (lands in PR 6C).

### Acceptance criteria (PR 6B)

- [ ] `pnpm setup:deploy` and `pnpm teardown:deploy` scripts work end-to-end.
- [ ] Tests pass with mocked Vercel API.
- [ ] No actual Vercel project created during CI tests.
- [ ] CI gates pass.

---

## PR 6C — Engineer runbooks

### What needs to happen

Author engineer-facing rare-path runbooks. Short, scannable, action-oriented.

#### 1. `docs/engineering/deploy-new-demo.md`

How to provision Vercel for a new demo. Prerequisites (`VERCEL_TOKEN`, secrets vault access). Script usage (`pnpm setup:deploy <name>`). Failure handling. Custom domain step. Rollback. Teardown.

#### 2. `docs/engineering/add-new-provider.md`

Step-by-step adding a new provider package:
1. Decide path (Fireblocks Network listing → sub-module of `packages/fireblocks`; independent API → own package).
2. Scaffold per the existing package shape.
3. Author AGENTS.md.
4. Add state-mapping.
5. Add webhook signature verify + normalize.
6. Add orchestration endpoint mapping (Path A only).
7. Update demo-registry by running the generator.

#### 3. `docs/engineering/add-new-demo-type.md`

Step-by-step adding a new demo type when the skill's automation isn't enough:
1. Use the dashboard section template (`docs/templates/dashboard-section/`).
2. Substitute `__DEMO_TYPE__` placeholders.
3. Add `<DemoType>Config` model to Prisma + migration.
4. Add to dashboard nav.
5. Scaffold the demo app under `apps/<name>/`.
6. Author AGENTS.md.
7. Run `pnpm setup:deploy`.

#### 4. `docs/engineering/extend-state-machine.md`

When canonical states need a new value:
1. Update `packages/transactions/src/state.ts` enum.
2. Update `LegalTransitions` table.
3. Update every provider's `state-mapping.ts`.
4. Document the change in `DECISIONS.md` with a new D-NNN entry.
5. Migrate existing transactions if state semantics change.

#### 5. `docs/engineering/add-new-webhook-receiver.md`

(Already promised in Phase 5A — verify it exists or create.)

### Acceptance criteria (PR 6C)

- [ ] Five runbooks authored.
- [ ] Each runbook is ≤200 lines, action-oriented, links to relevant DECISIONS / phases.
- [ ] CI gates pass.

---

## Common acceptance criteria

- [ ] CI gates pass.
- [ ] `apps/spark26/` untouched.
- [ ] DECISIONS.md references included.

After each PR merges, update `PROGRESS.md` rows "6A", "6B", "6C" to `🟢 done`.

---

## Project success gate

Phase 6A's `skill-integration.test.ts` is the project's success criterion. When that test passes (success path produces working PR/demo + all four failure modes have zero file changes), the meta-system delivers 1-shot demo creation.

When Phase 6 + Phase 7 are both `🟢 done`, file `MILESTONE-1.md` documenting the launch and any deferred items.
