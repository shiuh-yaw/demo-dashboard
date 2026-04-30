# Phase 1B — Independent provider packages

> **Self-contained agent prompt — five sub-prompts.** Each sub-prompt is dispatched to a separate agent. Read this header, then your assigned sub-prompt only.

---

## Common context (all sub-prompts)

You are extracting one independent provider integration from `apps/dashboard/src/lib/<provider>/` (and possibly `apps/dashboard/src/app/api/<provider>/`) into a new `packages/<provider>/` workspace package. Each provider has its own API, its own auth, its own webhooks — they get their own packages per `DECISIONS.md` D-009.

This wave parallelizes: alfredpay, blindpay, iron, coinbase-onramp, lifi each get their own agent + worktree + PR.

### Skills (every sub-prompt)

1. `superpowers:using-git-worktrees` — worktree at `.worktrees/phase-1b-<provider>`, branch `phase/01b-<provider>`.
2. `superpowers:writing-plans`.
3. `superpowers:test-driven-development` — smoke + signature tests precede extraction.
4. `superpowers:verification-before-completion`.
5. `superpowers:requesting-code-review`.

### Hard rules (every sub-prompt)

- `apps/spark26/` zero-touch.
- New package follows the existing `packages/fireblocks` shape (`package.json`, `tsconfig.json`, `src/index.ts`, `src/__tests__/` or co-located test files).
- Sandbox-by-default: every public function takes `env: 'sandbox' | 'production'` (or accepts a configured client that does).
- Move code via `git mv` where files transplant directly. Use clean refactor where rewriting.
- Preserve consumer behavior: dashboard's existing API routes (`apps/dashboard/src/app/api/<provider>/`) must continue to work — they become thin handlers importing from the new package.
- Webhook handlers stay in dashboard (`apps/dashboard/src/app/api/webhooks/<provider>/...` — created in Phase 5A) but signature verification + event normalization live in the package's `webhooks.ts`.

### Required reading before any code (every sub-prompt)

- `packages/fireblocks/` — reference shape for a provider package.
- `packages/fireblocks/src/index.ts` — export pattern.
- `apps/dashboard/src/lib/<your-provider>/` — current implementation.
- `apps/dashboard/src/app/api/<your-provider>/` — current routes (if present).
- `DECISIONS.md` D-005, D-009, D-010.

### Common deliverables (every sub-prompt)

A package directory:

```
packages/<provider>/
  package.json
  tsconfig.json
  src/
    index.ts                    # public exports
    client.ts                   # REST client (or wrapper)
    types.ts                    # shared types
    state-mapping.ts            # provider status → canonical TransactionState
    webhooks.ts                 # signature verify + normalize
    env.ts                      # ProviderEnvironment + endpoint resolution
    __tests__/
      smoke.test.ts             # public surface compiles & exports as expected
      <fn>.test.ts              # contract tests per public function
      webhooks.test.ts          # signature verify + normalize fixtures
  AGENTS.md                     # stubbed if Phase 3 not yet run
  README.md                     # short pointer
```

If `packages/transactions` (Phase 1E) hasn't merged when you run, stub `state-mapping.ts` with a typed `TODO` and a placeholder enum. AGENTS.md gets a minimal stub; Phase 3 fills it in.

Update consumers:
- API route handlers in `apps/dashboard/src/app/api/<provider>/` import from the new package and become thin.
- Any direct imports from `apps/dashboard/src/lib/<provider>/` switch to package imports.
- Delete the now-empty `apps/dashboard/src/lib/<provider>/` directory.

### Common acceptance criteria (every sub-prompt)

- [ ] New package builds, typechecks, lints, tests pass.
- [ ] No consumer code importing from `apps/dashboard/src/lib/<provider>/` (the path no longer exists).
- [ ] All API routes under `apps/dashboard/src/app/api/<provider>/` continue to work — they're thin handlers now.
- [ ] At least one webhook signature verify test with a real-payload fixture (scrubbed of PII).
- [ ] `state-mapping.ts` exists (real or stub depending on 1E status).
- [ ] AGENTS.md stub or full file (depending on Phase 3 status).
- [ ] CI gates pass.
- [ ] `apps/spark26/` untouched.

### Common commit plan (every sub-prompt)

1. `feat(<provider>): scaffold package (package.json, tsconfig, index)`
2. `feat(<provider>): add client + types extracted from apps/dashboard/src/lib/<provider>/`
3. `feat(<provider>): add webhook signature verify + normalize`
4. `feat(<provider>): add state-mapping (real or stub)`
5. `refactor(dashboard): consume @dynamic-demos/<provider> package`
6. `chore(<provider>): add stub AGENTS.md`

### Common PR title

`feat(<provider>): Phase 1B — extract package from apps/dashboard/src/lib/`

### Common PR description template

```
## Phase 1B-<provider> of demo meta-system

Extracts <Provider> integration from `apps/dashboard/src/lib/<provider>/` into a workspace package.

### What changed
- `packages/<provider>/` — new workspace package: client, types, webhooks, state-mapping, tests, AGENTS.md stub.
- `apps/dashboard/src/lib/<provider>/` — removed; logic now lives in the package.
- `apps/dashboard/src/app/api/<provider>/` — thin handlers importing from the package.

### Tests
- Smoke + contract tests passing.
- Webhook signature verify against fixture payload.

### Spark26
Untouched.

### Open items
- [ ] AGENTS.md final content lands in Phase 3.
- [ ] Webhooks framework (signature → persist → fan-out) lands in Phase 5A; this PR ships verifier + normalizer only.

### References
- `DECISIONS.md` (D-009)
- Phase prompt: `docs/projects/demo-meta-system/phases/01b-providers.md`
```

After merge, update `PROGRESS.md` row `1B-<provider>` to `🟢 done`.

---

# Sub-prompt 1B-alfredpay

## Provider-specific guidance

alfredPay is a LATAM payment processor with its own REST API at `alfredpay.readme.io`. Coverage: Mexico, Brazil, Colombia, Argentina, El Salvador, US. The Fireblocks-mediated path lives in `packages/fireblocks/src/providers/alfredpay.ts` (Phase 1A) — this package is the **direct REST** path.

Today the repo has **no direct alfredPay integration**, only the Fireblocks-DVP stub in `apps/cross-border-ap-ar/`. So Phase 1B-alfredpay is a green-field package, not an extraction.

### Public surface

- `createAlfredpayClient({ env: 'sandbox' | 'production', apiKey: string })` — REST client factory.
- `createOfframp(client, params)` — start an offramp (USDC/USDT → local fiat).
- `getOfframpStatus(client, id)` — status check.
- `webhooks.verifySignature(req)` — verify alfredPay webhook signature.
- `webhooks.normalize(event)` — translate alfredPay event → CanonicalEvent.

### Regions (frontmatter for AGENTS.md)

```yaml
regions:
  - country: BR
    currency: BRL
    rails: [pix]
  - country: MX
    currency: MXN
    rails: [spei]
  - country: CO
    currency: COP
    rails: [pse]
  - country: AR
    currency: ARS
    rails: [cbu]
  - country: SV
    currency: USD
    rails: [bank]
  - country: US
    currency: USD
    rails: [ach]
```

(Verify against `https://alfredpay.readme.io` — these are the documented coverage areas as of plan authoring.)

### Provider docs (frontmatter for AGENTS.md)

```yaml
provider:
  name: alfred (alfredPay)
  docs: https://alfredpay.io/documentation
  api_reference: https://alfredpay.readme.io
  agent_docs: none
  status_page: none
```

### Dependencies

None — green-field. Wait for Phase 0.5 only.

---

# Sub-prompt 1B-blindpay

## Provider-specific guidance

BlindPay is a PIX/bank withdrawal provider for Brazil. Existing integration at `apps/dashboard/src/lib/blindpay/` and `apps/dashboard/src/app/api/blindpay/`.

### Public surface

Match what's currently exported by `apps/dashboard/src/lib/blindpay/`. Common shape:
- `createBlindpayClient({ env, apiKey })`.
- `createTransfer`, `getTransferStatus` (or whatever the current functions are — read existing code).
- `webhooks.verifySignature`, `webhooks.normalize`.

### Regions

Look up actual BlindPay coverage. Likely BR-only (PIX) but verify from the existing integration's docs:

```yaml
regions:
  - country: BR
    currency: BRL
    rails: [pix, ted]
```

### Provider docs

Look up real URLs (don't guess):

```yaml
provider:
  name: BlindPay
  docs: <real URL>
  api_reference: <real URL>
  agent_docs: none
```

### Existing files to migrate

- `apps/dashboard/src/lib/blindpay/` — full directory.
- `apps/dashboard/src/app/api/blindpay/` — keep route files; replace internals with imports.
- `apps/dashboard/src/app/api/blindpay/README.md` — move to `packages/blindpay/docs/`.

### Dependencies

Wait for Phase 0.5. Independent of other providers.

---

# Sub-prompt 1B-iron

## Provider-specific guidance

Iron Finance is a multi-region onramp + offramp + KYC provider. Existing integration at `apps/dashboard/src/lib/iron/` and `apps/dashboard/src/app/api/iron/`.

### Public surface

Match current exports. Likely covers customer profiles, KYC submission, onramp creation, offramp creation, status polling.

### Regions

Iron has substantial documentation already at the root: `IRON_API_DOCUMENTATION.md` and `IRON_API_FLOWS.md`. **Move these into `packages/iron/docs/`** as part of this PR (they were intentionally left at root in Phase 0). Read them to determine real region coverage. Don't guess.

### Provider docs

```yaml
provider:
  name: Iron Finance
  docs: <real URL>
  api_reference: <real URL>
  agent_docs: none
```

### Existing files to migrate

- `apps/dashboard/src/lib/iron/` — full directory.
- `apps/dashboard/src/app/api/iron/` — route files thin out.
- `IRON_API_DOCUMENTATION.md` (root) → `packages/iron/docs/iron-api.md` (via `git mv`).
- `IRON_API_FLOWS.md` (root) → `packages/iron/docs/iron-api-flows.md`.
- Update root `CLAUDE.md` — remove the "Iron docs sit at root" note (now they live with the package).

### Dependencies

Wait for Phase 0.5. Independent of other providers.

---

# Sub-prompt 1B-coinbase-onramp

## Provider-specific guidance

Coinbase Onramp SDK integration. Existing at `apps/dashboard/src/lib/coinbase/` (or similar — verify path).

### Public surface

Likely thin wrapper around Coinbase Onramp client. Match current exports.

### Regions

Look up Coinbase Onramp coverage. Global with US-primary; verify and list specifically.

### Provider docs

```yaml
provider:
  name: Coinbase Onramp
  docs: https://docs.cdp.coinbase.com/
  api_reference: <real URL>
  agent_docs: none
```

### Existing files to migrate

- `apps/dashboard/src/lib/coinbase/` (or current path) — full directory.
- Any related API routes.

### Important

`apps/spark26/lib/fx/coinbase.ts` is **not** the onramp client — it's a price-feed wrapper. **Do not touch spark26.** Verify by reading both files; don't conflate them.

### Dependencies

Wait for Phase 0.5. Independent of other providers.

---

# Sub-prompt 1B-lifi

## Provider-specific guidance

LI.FI bridge/swap integration. Existing at `apps/checkouts/lib/actions/lifi.ts` (and possibly elsewhere — search for `@lifi/sdk` imports).

### Public surface

Likely thin wrapper around `@lifi/sdk`. Match current exports.

### Flow role

`flow_role: bridge` — not onramp/offramp. So `regions` field is **omitted** from frontmatter (per template). Add a body section "Supported chains" instead.

### Provider docs

```yaml
provider:
  name: LI.FI
  docs: https://docs.li.fi/
  api_reference: https://apidocs.li.fi/
  agent_docs: none
```

### Existing files to migrate

- Any `apps/*/lib/actions/lifi.ts` or similar. Read all imports of `@lifi/sdk` first to find every site.
- LI.FI is consumed by `apps/checkouts`, `apps/wallet`, `apps/trade` — all need their imports redirected to the new package after extraction.

### Dependencies

Wait for Phase 0.5. Independent of other providers. Multi-app consumer migration makes this slightly more complex than the others — sequence carefully: extract first, migrate one consumer at a time.

---

End of Phase 1B sub-prompts.
