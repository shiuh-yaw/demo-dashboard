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
  name: Iron Finance (a MoonPay product)
  docs: https://docs.iron.xyz/
  api_reference: https://docs.iron.xyz/reference-sandbox
  agent_docs: none
  status_page: none
---

# @dynamic-demos/iron

Iron Finance integration. Iron is a MoonPay product covering both onramp (fiat → stablecoin) and offramp (stablecoin → fiat), plus KYC, customer/wallet/bank management, third-party payments, and named virtual accounts. The dashboard's primary live use today is **USDC/EUR/USD/GBP offramp** (used by `apps/proceeds`); `flow_role` reflects that.

## Provider documentation

If you are an AI agent integrating against Iron, **consult the provider docs first**:

- **Main docs:** [docs.iron.xyz](https://docs.iron.xyz/)
- **API reference (sandbox):** [docs.iron.xyz/reference-sandbox](https://docs.iron.xyz/reference-sandbox)
- **Local detail:** `packages/iron/docs/iron-api.md` (full surface used by dashboard) and `packages/iron/docs/iron-api-flows.md` (onboarding + ramp flows).

## Supported regions

| Country | Currency | Rails             | Notes |
|---------|----------|-------------------|-------|
| US      | USD      | ACH, WIRE         | Same-day ACH; intra-day wire. |
| DE/FR/ES/IT/NL | EUR | SEPA          | SEPA business hours. |
| GB      | GBP      | FASTER_PAYMENTS   | Sub-minute. |

If region coverage changes, update this table and the `regions` field in frontmatter.

## Capabilities

- Client factories — `createIronClient({ env, apiKey })` and the lazy singleton `ironClient` (reads `IRON_API_KEY` / `IRON_ENVIRONMENT`).
- Customer + KYC + wallet + bank account management.
- Onramp + offramp quote/execute (autoramp + simple).
- Third-party payments + named virtual accounts.
- Webhook verification — `verifyIronSignature(rawBody, signature, secret)`.
- Webhook normalisation — `normalizeIronEvent(payload)`.
- Status mappers — `rampStatusToCanonical`, `ironAutorampStatusToCanonical`.

## Public surface

Stable, all live at the package root.

- `IronFinanceClient`, `createIronClient`, `ironClient` (singleton). (stable)
- `resolveIronBaseUrl`, `resolveIronEnvironment`, `IronEnvironment`. (stable)
- `rampStatusToCanonical`, `ironAutorampStatusToCanonical`, `CanonicalTransactionState`. (stable)
- Simple offramp helpers — `getOfframpQuote`, `createOfframp`, `chainIdToBlockchain`, `SimpleOfframp*` types. (stable)
- Webhooks — `verifyIronSignature`, `normalizeIronEvent`, `IRON_SIGNATURE_HEADER`, `CanonicalEvent`. (stable)

## Required environment

The package singleton reads `process.env.IRON_API_KEY` + `IRON_ENVIRONMENT` lazily; **prefer `createIronClient` for testability**.

- `IRON_API_KEY` — Iron API key — required at runtime.
- `IRON_ENVIRONMENT` — `sandbox` | `production` — optional, defaults to sandbox (D-005).
- `IRON_WEBHOOK_SECRET` — for signature verification — required when wiring the receiver.

## Slots vs invariants

**Slots:** corridor + rail, source/destination currencies, customer KYC profile, wallet address, virtual account allocation.

**Invariants:**

- Sandbox-by-default (D-005).
- Non-custodial: Iron's offramp settles via Dynamic wallet → bank account; the user controls their crypto until offramp execution.
- The singleton (`ironClient`) is convenience-only. Tests must use `createIronClient` to avoid env coupling.
- Apps never import this package — go through dashboard `/api/orchestrate/*` (D-003).

## Integration map

**Imports:** none (uses global `fetch`).
**Imported by:** `apps/dashboard` (orchestration, webhooks, customer/KYC API). Apps interact via dashboard HTTP API.

## Examples

```ts
import { createIronClient } from "@dynamic-demos/iron";

const iron = createIronClient({
  env: "sandbox",
  apiKey: process.env.IRON_API_KEY!,
});

const quote = await iron.simple.getOfframpQuote({
  source: { chain: "ethereum", token: "USDC", amount: "100" },
  destination: { country: "US", currency: "USD", rail: "ach" },
});
```

## Do / Don't

- Do: prefer `createIronClient` over the singleton in any new code (testability).
- Do: keep secrets in dashboard env (D-003).
- Don't: import this package from a demo app.
- Don't: skip `verifyIronSignature` before persisting webhook events.

## Open questions / known gaps

- Phase 1E re-binds the canonical state to `TransactionState` from `@dynamic-demos/transactions`.
- Phase 5A wires the dashboard webhook framework to `verifyIronSignature` + `normalizeIronEvent`.
- Onramp surface is exposed but not yet wired to a demo. If a future demo adds onramp, set `flow_role` accordingly (or split this package).
- See `packages/iron/docs/iron-api*.md` for the broader API surface beyond offramp.
