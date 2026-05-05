# Phase 8 — Chat UI for hosted demo creation (v0-style)

> **Self-contained agent prompt.** Read this entire file. Then `PLAN.md`, `DECISIONS.md`, `GLOSSARY.md`, `PROGRESS.md`.

---

## Your role

Wrap the demo meta-system in a v0-style chat UI hosted in `apps/dashboard`. Non-engineers (or engineers without local repo access) describe a demo in natural language, the system fills out a `demo-spec.json` interactively via tool calls, then scaffolds + opens a PR + surfaces the Vercel preview URL — without leaving the browser.

This phase ships as **two logical PRs minimum**:

1. **Backend (orchestration)** — Anthropic streaming endpoint + tool definitions + spec persistence + scaffold trigger.
2. **Frontend (chat surface)** — `/create` chat page in dashboard with streaming UI, live demo-spec preview pane, deploy status panel.

Optionally a third PR for Vercel deploy automation if the existing per-app preview pipeline needs new glue.

## Wave + dependencies

- **Wave 7 (post-MILESTONE-1).** Tracked but does NOT block the v1 milestone. v1 ships when Phase 7 closes.
- Hard prerequisites:
  - Phase 5C (dashboard scaffolding templates + demo-spec persistence wired) — the chat UI calls these.
  - Phase 6 (skill exists + scaffold-from-spec logic is documented) — server-side scaffolding mirrors the skill's logic.
  - Phase 7 (implicit context capture) — chat UI inherits the same prefill rules as the skill.
- Soft prerequisites: Phase 1D (Dynamic consolidation), Phase 2 (Prisma + Supabase + DemoSpec model), Phase 3 (AGENTS.md + demo-registry).

## Skills to use

1. `superpowers:using-git-worktrees` — `.worktrees/phase-8-chat-ui`, branch `phase/08-chat-ui` (or `phase/08a-chat-backend` + `phase/08b-chat-frontend` if splitting).
2. `superpowers:writing-plans` — multi-step delivery; per-PR plan with todos.
3. `superpowers:test-driven-development` — write tests for tool handlers and spec validation before the chat surface.
4. `superpowers:subagent-driven-development` — per-tool implementation can fan out once shapes are agreed.
5. `superpowers:verification-before-completion`.
6. `superpowers:requesting-code-review`.

## Hard rules

- `apps/spark26/` zero-touch.
- Apps don't access Postgres directly (D-002). The chat UI lives in `apps/dashboard` (orchestrator), so DB access is fine — but it must NOT introduce new DB writes from any non-dashboard app.
- Chat UI never emits credentials to the client. All provider secrets stay server-side. Client receives demo-spec + status updates only.
- Sandbox-by-default for any provider auto-selected (D-005). Production opt-in still requires `[prod-creds]` PR title at scaffold time.
- Scaffolding writes to a branch + PR, never main (mirrors the skill — D-019 / D-024).
- Anthropic API key is server-side only. Use `ANTHROPIC_API_KEY` from dashboard env (already supported per `apps/dashboard/package.json`'s `@anthropic-ai/sdk` dep).
- No raw HTML rendering of model output — sanitize via the existing markdown rendering pipeline. Treat tool input/output strictly via Zod-validated schemas.
- No fine-tuned model calls; Claude API only. Default to `claude-sonnet-4-6`; allow override via env for evals.
- All chat sessions are scoped to an authenticated dashboard user (Dynamic JWT). Anonymous access blocked.

## Required reading before code changes

- `apps/dashboard/src/app/` — current dashboard layout + auth gating.
- `apps/dashboard/src/lib/demo-spec.ts` (Phase 5C output) — canonical spec persistence.
- `docs/templates/demo-spec.schema.json` — the contract the chat UI fills out.
- `.claude/skills/create-demo-app/SKILL.md` (Phase 6A output) — the skill's question/decision logic, which the chat UI mirrors as tools.
- `.claude/skills/create-demo-app/scripts/parse-intent.ts` (Phase 6A + 7 output) — same prefill logic should be reused server-side, not re-implemented.
- `.claude/demo-registry.md` (Phase 3 output) — provider/region/brand registry.
- `packages/db/prisma/schema.prisma` — `DemoSpec` and `Brand` models.
- `DECISIONS.md` D-001, D-002, D-019, D-021, D-024, D-025.
- Anthropic streaming + tool use docs (use Context7 / official SDK reference).
- Vercel REST API (project create + deploy hook + env upsert) — at least skim before scoping.

## What needs to happen

### PR 1 — backend orchestration

#### 1. Chat session model

Add to `packages/db/prisma/schema.prisma` (new migration):

```prisma
model ChatSession {
  id          String      @id @default(cuid())
  userId      String      // Dynamic user ID
  demoSpecId  String?     // FK to DemoSpec once one is created
  status      String      // 'collecting' | 'scaffolding' | 'deployed' | 'failed'
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  messages    ChatMessage[]
  demoSpec    DemoSpec?   @relation(fields: [demoSpecId], references: [id])
}

model ChatMessage {
  id          String      @id @default(cuid())
  sessionId   String
  role        String      // 'user' | 'assistant' | 'tool_result'
  content     Json        // structured (text + tool calls + tool results)
  createdAt   DateTime    @default(now())

  session     ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
}
```

#### 2. Tool definitions

Server-side tools the model can call. Each tool is a Zod-validated input + DB/registry read or write.

| Tool | Purpose |
|---|---|
| `set_demo_type` | Selects a demo type from the registry (`stablecoin-sandwich`, `remittance`, `payouts`, ...). Idempotent. |
| `set_brand` | Either selects an existing brand by name OR creates a new one with `--brand-*` defaults. |
| `set_corridor` | `{ sourceCurrency, destinationCurrency, sourceCountry, destinationCountry, settlementMethod }`. |
| `select_provider` | Picks a provider per segment (onramp / offramp / bridge / orchestrator). Reads `demo-registry.md`. |
| `set_custody` | `'non-custodial'` (default) or `'custodial'`. |
| `set_environment` | `'sandbox'` (default) or `'production'`. Production triggers PR-title `[prod-creds]` flag at scaffold. |
| `validate_spec` | Runs the demo-spec Zod schema. Returns errors inline so the model can self-correct. |
| `scaffold` | Validates, then triggers server-side scaffolding via the same pipeline as the skill. Returns `{ branchName, prUrl }`. |
| `get_deployment_status` | Polls Vercel for the PR's preview deployment. Returns URL + state. |

Each tool exists at `apps/dashboard/src/lib/chat-tools/<tool>.ts`, exports a Zod input schema and an async handler. Aggregate via `apps/dashboard/src/lib/chat-tools/registry.ts`.

#### 3. Streaming endpoint

`apps/dashboard/src/app/api/chat/route.ts`:
- Accepts `{ sessionId, userMessage }`.
- Loads session + history from DB.
- Streams Anthropic `messages.stream` with the tool registry.
- Persists each tool call + result.
- Streams text deltas + tool events to the client over Server-Sent Events.
- On `scaffold` tool success: updates session status, persists branch/PR refs, kicks off deploy polling job.

#### 4. Scaffolding pipeline reuse

Extract the skill's scaffolding logic into a shared library if it isn't already (Phase 6A may have done this). The chat backend imports + calls the same function — never duplicate logic. If the skill writes files locally, the server-side path writes the same files into a new branch via the GitHub REST API (create-tree + create-commit + create-branch + create-PR). Document the divergence point.

#### 5. System prompt

`apps/dashboard/src/lib/chat-tools/system-prompt.ts`:
- Mirrors the skill's instructions (same prefill rules, same disambiguation budget per Phase 7).
- Explicitly documents the tool list + when to call each.
- Tells the model to ask ≤2 disambiguating questions and otherwise infer + scaffold.
- Never claims capability not represented by a tool.

### PR 2 — frontend chat surface

#### 1. `/create` page

`apps/dashboard/src/app/create/page.tsx`:
- Auth-gated (existing dashboard auth wrapper).
- Renders three panes:
  - Left: chat thread with streaming responses + tool-call cards (collapsible).
  - Right top: live `demo-spec.json` preview, validated against schema. Updates as tools fire.
  - Right bottom: deploy panel — "Scaffolding…" → branch name → PR link → "Building…" → preview URL.

#### 2. Streaming consumption

Use the dashboard's existing SSE / fetch streaming pattern (or `@anthropic-ai/sdk`'s client streamer if it works server-from-server). Render text deltas progressively. Render tool calls as structured cards, not as raw JSON.

#### 3. Spec preview

The right pane is read-only by default but power users can toggle "expert mode" to edit the spec directly. Edits round-trip through `validate_spec` and update the chat history with a `user-edit-applied` synthetic message.

#### 4. Failure-mode UX

Maps the Phase 6 / Phase 7 failure classes to UI states:
- Class 1 (tool error): red banner with the model's explanation, "Try again" button.
- Class 2 (validation error): yellow banner with field highlights in the spec preview.
- Class 3 (ambiguity overload): chat pauses with a "Refine your prompt" panel; no PR opened.

### PR 3 (optional) — Vercel deploy automation

If the existing per-PR preview pipeline already covers chat-scaffolded PRs, this PR is unnecessary. If not:
- Add `apps/dashboard/src/lib/vercel/` client (REST + project + deployment APIs).
- Add background job that watches the scaffold-PR's deployment events.
- Surface deployment status back through the SSE stream.

## Acceptance criteria

- [ ] Authenticated dashboard user can navigate to `/create`, type a natural-language prompt, and watch a `demo-spec.json` fill out via tool calls.
- [ ] On `scaffold`, a real branch + PR is opened. PR description references the chat session ID.
- [ ] Vercel preview URL surfaces in the chat UI within 60s of the PR opening (or whatever the existing preview pipeline guarantees).
- [ ] Anonymous users cannot reach `/create` or `/api/chat`.
- [ ] Chat session + messages persist across page reloads.
- [ ] Tool error / validation error / ambiguity overload all surface distinct UI states.
- [ ] Same skill-scaffolding logic is used server-side. No duplication.
- [ ] All four Phase 6 failure-mode tests still pass when invoked through the chat pipeline.
- [ ] Vitest coverage on every tool handler (input validation, expected output, registry lookups).
- [ ] Playwright (or equivalent) E2E for "happy path" prompt → PR open → preview URL.
- [ ] CI gates pass.
- [ ] `apps/spark26/` untouched.

## Commit plan

PR 1 (backend):
1. `feat(db): add ChatSession and ChatMessage models + migration`
2. `feat(dashboard): chat-tools registry + Zod schemas`
3. `feat(dashboard): chat-tools handlers (set_*, validate, scaffold, status)`
4. `feat(dashboard): /api/chat streaming endpoint`
5. `feat(dashboard): server-side scaffolding from chat tool`
6. `test(dashboard): chat-tools unit + integration coverage`

PR 2 (frontend):
1. `feat(dashboard): /create page shell + auth gate`
2. `feat(dashboard): chat thread + streaming consumption`
3. `feat(dashboard): live demo-spec preview pane`
4. `feat(dashboard): deploy status panel`
5. `feat(dashboard): expert-mode spec editing`
6. `test(e2e): /create happy-path spec → PR → preview`

PR 3 (deploy automation, only if needed):
1. `feat(dashboard): Vercel REST client`
2. `feat(dashboard): preview-deployment polling + SSE forwarding`

## PR titles

- PR 1: `feat(dashboard): Phase 8a — chat-orchestration backend`
- PR 2: `feat(dashboard): Phase 8b — chat UI for hosted demo creation`
- PR 3 (if needed): `feat(dashboard): Phase 8c — Vercel preview integration`

## PR description template

```
## Phase 8{a|b|c} of demo meta-system — chat UI for hosted demo creation

Wraps the meta-system in a v0-style chat surface in `apps/dashboard`. Non-engineers
describe a demo in natural language; tool calls fill out a `demo-spec.json`;
on submit a real PR is opened and the Vercel preview URL is surfaced in-UI.

### What changed
- {scoped to this PR}

### Spark26
Untouched.

### Reuses, not duplicates
The skill's scaffolding logic is invoked server-side via {entry point}. No
parallel re-implementation. Failure modes mirror Phase 6 + 7 contracts.

### References
- DECISIONS.md (D-001, D-002, D-019, D-021, D-024, D-025)
- Phase prompt: docs/projects/demo-meta-system/phases/08-chat-ui.md
```

## After merge

1. Update `PROGRESS.md` row "8. Chat UI / hosted demo creation" to `🟢 done`.
2. Update `MILESTONE-1.md` with a "Post-v1: Phase 8" section linking the PRs.
3. If Phase 8c was deferred (existing pipeline sufficient), file a follow-up ticket noting where the chat-scaffolded PRs live and how preview URLs are obtained.

## Out of scope (defer to a v2 phase or `OPEN-QUESTIONS.md`)

- Per-user Vercel project ownership / OAuth (current model: shared dashboard-owned Vercel project).
- Multi-tenant brand isolation beyond what dashboard auth already enforces.
- Inline code editing for scaffolded files (this is spec-driven, not code-gen).
- Voice input.
- Mobile-optimized layout (desktop-first).
- Billing / usage metering.
