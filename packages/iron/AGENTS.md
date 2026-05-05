---
name: "@dynamic-demos/iron"
kind: package
flow_role: offramp
custody: non-custodial
status: experimental
regions:
  - country: US
    currency: USD
    rails: [ach, wire]
  - country: DE
    currency: EUR
    rails: [sepa]
  - country: FR
    currency: EUR
    rails: [sepa]
  - country: ES
    currency: EUR
    rails: [sepa]
  - country: IT
    currency: EUR
    rails: [sepa]
  - country: NL
    currency: EUR
    rails: [sepa]
  - country: GB
    currency: GBP
    rails: [faster_payments]
provider:
  name: Iron Finance
  docs: https://docs.iron.xyz/
  api_reference: https://docs.iron.xyz/reference-sandbox
  agent_docs: none
  status_page: none
  changelog: none
---

# @dynamic-demos/iron

Iron Finance (a MoonPay product) integration. Supports both onramp (fiat → stablecoin)
and offramp (stablecoin → fiat) flows plus KYC, customer/wallet/bank management,
third-party payments, and named virtual accounts.

`flow_role` is set to `offramp` because the dashboard's primary live use of Iron
today is USDC/EUR offramp. Phase 3 will refine this if onramp becomes a primary
flow.

## Status

**Stub.** Phase 3 fills in the rest of the body. Until then, see:

- [`docs/iron-api.md`](./docs/iron-api.md) — full API surface used by the dashboard.
- [`docs/iron-api-flows.md`](./docs/iron-api-flows.md) — onboarding + ramp flows.
- [`README.md`](./README.md) — quick start.
- [Iron Finance docs](https://docs.iron.xyz/) — official.

## Public surface (preview)

- `createIronClient({ env, apiKey })` — factory. Sandbox-by-default.
- `IronFinanceClient` — class form for explicit construction.
- `ironClient` — process-env singleton (avoid in tests).
- `verifyIronSignature(rawBody, signatureHeader, secret)` — HMAC-SHA256 verifier.
- `normalizeIronEvent(payload)` — provider event → `CanonicalEvent`.
- `rampStatusToCanonical`, `ironAutorampStatusToCanonical` — status mappers.

## Required environment

- `IRON_API_KEY` — Iron API key — required at runtime for any non-mocked call.
- `IRON_ENVIRONMENT` — `sandbox` | `production` — optional (defaults to sandbox).

## Open items

- [ ] Phase 3 fills in full AGENTS.md body (capabilities, slots/invariants, gotchas).
- [ ] Phase 1E re-points `state-mapping.ts` at `@dynamic-demos/transactions`.
- [ ] Phase 5A wires webhook verifier + normalizer into the dashboard webhook framework.
