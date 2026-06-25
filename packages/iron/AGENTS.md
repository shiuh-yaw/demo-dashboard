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
- **Sandbox testing:** `packages/iron/docs/iron-sandbox-testing.md` — the sandbox deposit address is **not real**; progress offramps/autoramps by simulating the deposit with `sandbox.createTransaction` → `setTransactionState`/`approveAutoramp` instead of sending crypto.

## Supported regions

| Country | Currency | Rails             | Notes |
|---------|----------|-------------------|-------|
| US      | USD      | ACH, WIRE         | Same-day ACH; intra-day wire. |
| DE/FR/ES/IT/NL | EUR | SEPA          | SEPA business hours. |
| GB      | GBP      | FASTER_PAYMENTS   | Sub-minute. |

If region coverage changes, update this table and the `regions` field in frontmatter.

## Capabilities

- Client factory — `createIronClient({ apiKey, env })`. `apiKey` is required; the constructor no longer reads `process.env`.
- Mock client — `MockIronClient` mirrors the namespace surface for tests and non-network demos.
- Customer + KYC + wallet + bank account management.
- Onramp + offramp quote/execute (autoramp + simple).
- Third-party payments + named virtual accounts.
- SumSub token sharing — `kyc.startWithToken(request)` for reliance KYC via SumSub share tokens.
- Sandbox operations — `sandbox.approveAutoramp`, `sandbox.approveFiatAddress`, `sandbox.createTransaction`, `sandbox.setTransactionState`, `sandbox.reset`.
- Webhook verification — `verifyIronSignature(rawBody, headers, secret)` (Standard Webhooks spec).
- Webhook normalisation — `normalizeIronEvent(payload)`.
- Status mappers — `rampStatusToCanonical`, `ironAutorampStatusToCanonical`, `ironTransactionStatusToCanonical`.

## Public surface

Stable, all live at the package root.

- `IronFinanceClient`, `createIronClient`, `MockIronClient`. (stable)
- `IronClientConfig`, `IIronFinanceClient`, plus each namespace interface (`CustomersNamespace`, `KycNamespace`, etc.). (stable)
- `resolveIronBaseUrl`, `resolveIronEnvironment`, `IronEnvironment`. (stable)
- `rampStatusToCanonical`, `ironAutorampStatusToCanonical`, `ironTransactionStatusToCanonical`, `CanonicalTransactionState`. (stable)
- Simple offramp helpers — `getOfframpQuote`, `createOfframp`, `chainIdToBlockchain`, `SimpleOfframp*` types. (stable)
- Webhooks — `verifyIronSignature`, `normalizeIronEvent`, `IRON_SIGNATURE_HEADER`, `IRON_TIMESTAMP_HEADER`, `IRON_ID_HEADER`, `CanonicalEvent`, `IronWebhookHeaders`. (stable)

The 14 namespaces exposed by `IronFinanceClient` (and `MockIronClient`): `customers`, `kyc`, `identifications`, `signings`, `wallets`, `bank`, `onramp`, `offramp`, `quotes`, `thirdPartyPayments`, `autoramps`, `virtualAccounts`, `metadata`, `sandbox`. See `IIronFinanceClient` in `src/types.ts` for method signatures.

## Dashboard API surface

Demos do not import this package directly. They call the dashboard endpoints below that expose it. The Phase 6A Skill reads this section when scaffolding to know which endpoints to wire.

| Endpoint | Method | Purpose | Audience |
|---|---|---|---|
| `/api/iron/customers` | GET | List customers | demo / operator |
| `/api/iron/customers` | POST | Create a customer | demo / operator |
| `/api/iron/customers/[id]` | GET | Get a customer | demo / operator |
| `/api/iron/customers/[id]` | PATCH | Update a customer | demo / operator |
| `/api/iron/customers/[id]/kyc` | GET | Get KYC status | demo |
| `/api/iron/customers/[id]/kyc` | POST | Start KYC verification | demo |
| `/api/iron/customers/[id]/identifications` | GET | List customer identifications | demo |
| `/api/iron/customers/[id]/signings` | GET | List required signing documents | demo |
| `/api/iron/customers/[id]/signings` | POST | Sign a required document | demo |
| `/api/iron/customers/[id]/wallets` | GET | List wallets for a customer | demo / operator |
| `/api/iron/customers/[id]/banks` | GET | List bank accounts for a customer | demo / operator |
| `/api/iron/customers/[id]/virtual-accounts` | GET | List named virtual accounts | demo / operator |
| `/api/iron/customers/[id]/virtual-accounts` | POST | Create a named virtual account | demo / operator |
| `/api/iron/customers/[id]/autoramps` | GET | List autoramp transactions for a customer | demo / operator |
| `/api/iron/banks` | POST | Register a bank account | demo / operator |
| `/api/iron/banks/[id]` | GET | Get a bank account | demo / operator |
| `/api/iron/banks/[id]` | DELETE | Delete a bank account | operator |
| `/api/iron/wallets/hosted` | POST | Register a hosted (Iron-managed) wallet | demo |
| `/api/iron/wallets/self-hosted` | POST | Register a self-hosted wallet (signed proof) | demo |
| `/api/iron/wallets/[id]` | GET | Get a wallet | demo / operator |
| `/api/iron/quotes/onramp` | POST | Get an onramp quote (fiat → crypto) | demo |
| `/api/iron/quotes/offramp` | POST | Get an offramp quote (crypto → fiat) | demo |
| `/api/iron/quotes/[id]` | GET | Get a quote by id | demo |
| `/api/iron/onramps` | GET | List onramps | demo / operator |
| `/api/iron/onramps` | POST | Create an onramp transaction | demo |
| `/api/iron/onramps/[id]` | GET | Get an onramp by id | demo / operator |
| `/api/iron/onramps/[id]/cancel` | POST | Cancel an onramp | operator |
| `/api/iron/offramps` | GET | List offramps | demo / operator |
| `/api/iron/offramps` | POST | Create an offramp transaction | demo |
| `/api/iron/offramps/[id]` | GET | Get an offramp by id | demo / operator |
| `/api/iron/offramps/[id]/cancel` | POST | Cancel an offramp | operator |
| `/api/iron/third-party-payments` | GET | List third-party payments | operator |
| `/api/iron/third-party-payments` | POST | Create a third-party payment | operator |
| `/api/iron/third-party-payments/[id]` | GET | Get a third-party payment | operator |
| `/api/iron/fiatcurrencies` | GET | List Iron-supported fiat currencies | demo / operator |
| `/api/iron/customers/[id]/kyc/token` | POST | Start KYC via SumSub token sharing | demo |
| `/api/iron/sandbox/identification/[id]` | POST | Force identification approval/rejection (sandbox only) | operator |
| `/api/iron/sandbox/autoramp/[id]` | PUT | Approve or set autoramp status (sandbox only) | operator |
| `/api/iron/sandbox/fiat-verification/[id]` | PUT | Approve or set fiat address status (sandbox only) | operator |
| `/api/iron/sandbox/transaction` | POST | Create a mock transaction (sandbox only) | operator |
| `/api/iron/sandbox/transaction/[id]/state` | PUT | Set transaction state (sandbox only) | operator |
| `/api/iron/sandbox/reset` | POST | Reset all sandbox data (sandbox only) | operator |

## Required environment

The package no longer reads `process.env`. Callers pass `apiKey` (and optionally `env`) explicitly to `createIronClient`. The dashboard reads `IRON_API_KEY` + `IRON_ENVIRONMENT` from validated env in `apps/dashboard/src/lib/iron/client.ts` (the only sanctioned env-reader for Iron credentials).

- `IRON_API_KEY` — Iron API key — required at runtime (dashboard).
- `IRON_ENVIRONMENT` — `sandbox` | `production` — optional, defaults to sandbox (D-005).
- `IRON_WEBHOOK_SECRET` — for signature verification — required when wiring the receiver.

## Slots vs invariants

**Slots:** corridor + rail, source/destination currencies, customer KYC profile, wallet address, virtual account allocation.

**Invariants:**

- Sandbox-by-default (D-005).
- Non-custodial: Iron's offramp settles via Dynamic wallet → bank account; the user controls their crypto until offramp execution.
- `apiKey` must be passed explicitly to `createIronClient`. The package does not fall back to `process.env`.
- Apps never import this package — go through the per-provider dashboard endpoints listed in "Dashboard API surface" above (D-003).

## Integration map

**Imports:** none (uses global `fetch`).
**Imported by:** `apps/dashboard` (orchestration, webhooks, customer/KYC API) via the dashboard helper `apps/dashboard/src/lib/iron/client.ts`. Apps interact via dashboard HTTP API.

## Examples

```ts
import { createIronClient } from "@dynamic-demos/iron";

const iron = createIronClient({
  apiKey: process.env.IRON_API_KEY!,
  env: "sandbox",
});

const customer = await iron.customers.create({
  type: "individual",
  email: "ada@example.com",
});
const quote = await iron.onramp.quote({
  customer_id: customer.id,
  source_currency: "EUR",
  destination_currency: "USDC",
  payment_rail: "sepa",
  wallet_address: "0x...",
});

const onramp = await iron.onramp.create({
  quote_id: quote.id,
  customer_id: customer.id,
  wallet_address: "0x...",
});
```

## Do / Don't

- Do: pass `apiKey` explicitly to `createIronClient` (no env fallback).
- Do: keep secrets in dashboard env (D-003) — read via `apps/dashboard/src/lib/iron/client.ts`.
- Do: use `MockIronClient` in tests that don't need a real network.
- Don't: import this package from a demo app.
- Don't: skip `verifyIronSignature` before persisting webhook events.

## Open questions / known gaps

- Phase 1E re-binds the canonical state to `TransactionState` from `@dynamic-demos/transactions`.
- Phase 5A wires the dashboard webhook framework to `verifyIronSignature` + `normalizeIronEvent`.
