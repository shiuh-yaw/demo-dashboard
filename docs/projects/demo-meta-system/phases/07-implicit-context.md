# Phase 7 — Implicit context capture

> **Self-contained agent prompt.** Read this entire file. Then `PLAN.md`, `DECISIONS.md`, `GLOSSARY.md`.

---

## Your role

Close the loop on "non-engineers don't need to know what to ask." Wire `demo-spec.json` into the dashboard's create flow so every demo persists the structural intent. Tune the skill's prefill logic so derivable defaults are never asked.

Ships as **one logical PR** (or two if the skill prefill changes are large).

## Wave + dependencies

- Wave 6 (final).
- Depends on Phase 5C (demo-spec persistence already wired in dashboard) and Phase 6 (skill exists).

## Skills

1. `superpowers:using-git-worktrees` — `.worktrees/phase-7-implicit-context`.
2. `superpowers:writing-plans`.
3. `superpowers:test-driven-development`.
4. `superpowers:verification-before-completion`.
5. `superpowers:requesting-code-review`.

## Hard rules

- `apps/spark26/` zero-touch.
- Skill asks at most 2 disambiguating questions per session, never to gather info that's derivable.
- Skill never bypasses the failure-mode invariant (zero file changes for unfulfillable prompts) when prefilling defaults.

## Required reading

- `docs/templates/demo-spec.schema.json`.
- `apps/dashboard/src/lib/demo-spec.ts` (Phase 5C output).
- `apps/dashboard/src/app/<demoType>/new/page.tsx` (existing create forms).
- `.claude/skills/create-demo-app/SKILL.md` (Phase 6A output).
- `.claude/demo-registry.md` (Phase 3 output).
- `DECISIONS.md` D-021, D-025.

## What needs to happen

### 1. Dashboard create flow surfaces demo-spec preview

When a user fills the `new` form for a demo type, the form computes a live preview of the resulting `demo-spec.json` (collapsed by default; expandable for power users / engineers reviewing skill outputs).

Implementation:
- Reactively compute `demo-spec` from form state.
- Validate against schema as the user types (Zod-equivalent of the JSON schema).
- Show schema validation errors inline.
- On submit, persist both the demo's config AND the corresponding `DemoSpec` record (already wired in 5C; this PR ensures the form's spec preview matches what gets persisted).

### 2. Skill prefill logic

Update `.claude/skills/create-demo-app/scripts/parse-intent.ts` (Phase 6A output) to:

1. **Resolve from registry first.** If the user's prompt mentions a region (Brazil, MX, etc.), look up which providers cover it. Pre-select a single best-fit provider for each segment.
2. **Resolve brand from context.** If the user mentions a brand name they've created before ("Acme Corp"), look up the existing brand record. If not found, pre-fill with the demo-default brand and note this in the PR description.
3. **Resolve sandbox/prod from prompt.** Default sandbox unless the user explicitly says "production" or "live."
4. **Resolve custody preference.** Default non-custodial. Custodial requires explicit user mention.
5. **Resolve corridor.** Source country/currency, destination country/currency, payment rail. Inferred from the prompt where possible; left as defaults from registry where not.

Output of parse-intent: a fully-populated `demo-spec.json` with markers showing which fields were inferred vs user-specified.

### 3. Disambiguation question budget

Skill computes the spec, then evaluates remaining ambiguities:
- Multiple providers cover the same segment with similar quality → ask once which to use.
- User specified destination but not source → ask for source if the demo type requires it.
- Brand reference is ambiguous → ask once.

If ambiguities exceed two, the skill stops and reports: "Your request is ambiguous in N ways. Please refine and re-prompt." (Class 3 failure mode from Phase 6.)

### 4. Hardcoded invariants in scaffolding

Per D-025, invariants come from canonical templates' AGENTS.md, not from prompting. Verify:
- Every scaffolded app's `AGENTS.md` declares non-custodial as an invariant (where applicable).
- Sandbox is the default in scaffolded `.env.example`.
- State machine transitions go through helpers (no raw assignment in generated code).
- Webhook routes go to dashboard (apps don't receive webhooks).

These are enforced by template structure, not skill prompt logic.

### 5. End-to-end smoke test

The project's final acceptance test:

```ts
test('non-engineer prompts → working themed demo', async () => {
  const userPrompt = "create a demo for sending USD from Miami to São Paulo, branded for Acme";
  const result = await runSkill(userPrompt);

  // Skill resolves intent without follow-up questions.
  expect(result.disambiguationQuestions).toHaveLength(0);

  // PR opened (or dashboard form opened, depending on whether stablecoin-sandwich exists).
  expect(['opened-pr', 'opened-dashboard-form']).toContain(result.outcome);

  // If PR: scaffolded demo builds.
  if (result.outcome === 'opened-pr') {
    await checkoutBranch(result.branchName);
    expect(await runBuild()).toBe(0);
  }

  // Demo-spec persisted with all derivable fields populated.
  expect(result.demoSpec).toMatchObject({
    demoType: 'stablecoin-sandwich',
    corridor: { sourceCurrency: 'USD', destinationCurrency: 'BRL', settlementMethod: 'pix' },
    flow: { offramp: 'blindpay' },
    brandRef: expect.any(String),
  });
});
```

This test passing closes out the project.

### 6. Documentation

Update `docs/engineering/create-demo-flow.md` (NEW): document the full pipeline from user prompt → skill → demo-spec → dashboard form OR scaffolded PR.

Update root `CLAUDE.md` to point at the create-demo workflow.

## Acceptance criteria

- [ ] Dashboard create forms show demo-spec preview matching what gets persisted.
- [ ] Skill prefills sensible defaults from registry + brand + prompt.
- [ ] Skill asks ≤2 disambiguating questions; reports overload as Class 3 failure.
- [ ] Hardcoded invariants enforced via templates (sandbox, non-custodial, state-helpers, webhooks-to-dashboard).
- [ ] End-to-end smoke test passes.
- [ ] All four Phase 6 failure-mode tests still pass.
- [ ] Documentation updated.
- [ ] CI gates pass.
- [ ] `apps/spark26/` untouched.

## Commit plan

1. `feat(dashboard): surface demo-spec preview in create forms`
2. `feat(skill): prefill from registry + brand + prompt`
3. `feat(skill): disambiguation budget enforcement`
4. `test(skill): end-to-end smoke test (project success criterion)`
5. `docs(engineering): create-demo-flow reference`
6. `docs(claude-md): point at create-demo workflow`

## PR title

`feat(meta): Phase 7 — implicit context capture`

## PR description

```
## Phase 7 of demo meta-system — final phase

Closes the loop: non-engineers prompt with intent; skill prefills derivable defaults; demo-spec captures structural intent; ≤2 disambiguating questions; invariants enforced via templates.

### What changed
- Dashboard create forms show live demo-spec preview matching persistence.
- Skill prefills from registry + brand context + prompt parsing.
- Disambiguation budget enforcement (≤2 questions; overload → Class 3 failure).
- End-to-end smoke test passes ("create a demo for sending USD from Miami to São Paulo, branded for Acme" → working scaffolded PR or dashboard form).

### Spark26
Untouched.

### Project success
This PR's smoke test passing closes the meta-system project. Subsequent enhancements move to Phase 8 (deferred items in OPEN-QUESTIONS.md).

### References
- `DECISIONS.md` (D-021, D-025)
- Phase prompt: `docs/projects/demo-meta-system/phases/07-implicit-context.md`
```

After merge:
1. Update `PROGRESS.md` row "7. Demo-spec wiring + skill prefill" to `🟢 done`.
2. File `docs/projects/demo-meta-system/MILESTONE-1.md` documenting the launch:
   - Date.
   - Phases completed (link to merged PRs).
   - Deferred items moved to v2 (point at OPEN-QUESTIONS.md remaining entries).
   - Lessons learned.
   - Next planned phase (Phase 8 candidates).
