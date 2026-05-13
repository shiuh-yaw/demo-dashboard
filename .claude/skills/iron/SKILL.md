---
name: iron
description: Use when the user needs to integrate Iron Finance (a MoonPay product) — stablecoin ↔ fiat onramp/offramp, KYC, customers/wallets/bank accounts, third-party payments, named virtual accounts (US/ACH+WIRE, EU/SEPA, GB/FASTER_PAYMENTS). Triggers on "iron", "iron finance", "iron.xyz", "moonpay offramp", "virtual account", "stablecoin offramp EUR", "@dynamic-demos/iron". Non-custodial offramp: settles via Dynamic wallet → bank.
---

# Iron Finance

## Where to look first

1. **Local wrapper:** `packages/iron/` — read its `AGENTS.md` for the public surface. Dashboard-side only (D-003); demo apps never import it.
2. **Authoritative docs:** https://docs.iron.xyz/
3. **API reference (sandbox):** https://docs.iron.xyz/reference-sandbox
4. **Local detail:** `packages/iron/docs/iron-api.md` (full surface used by dashboard) and `packages/iron/docs/iron-api-flows.md` (onboarding + ramp flows).

## The client and its public surface

`IronFinanceClient` exposes a **namespaced surface** — 13 namespaces grouped by domain. `MockIronClient` mirrors the same shape for tests.

```typescript
import { createIronClient } from "@dynamic-demos/iron";

const iron = createIronClient({
  apiKey: process.env.IRON_API_KEY!,
  env: "sandbox", // or "production" — defaults to sandbox (D-005)
});

// Customers (KYC subject)
iron.customers.create(...) / iron.customers.get(id)
iron.customers.list(...)   / iron.customers.update(id, ...)

// KYC + identifications + signings
iron.kyc.start({ customer_id, return_url? })
iron.kyc.getSession(sessionId) / iron.kyc.getStatus(customerId)
iron.identifications.list(customerId)
iron.identifications.updateStatus(identificationId, approved)
iron.signings.listRequired(customerId)
iron.signings.create(customerId, request)

// Wallets (hosted + self-hosted — same Iron endpoint, alias methods)
iron.wallets.registerHosted(req) / iron.wallets.registerSelfHosted(req)
iron.wallets.get(id) / iron.wallets.list(customerId)

// Bank accounts (FiatAddresses)
iron.bank.register(req) / iron.bank.get(id)
iron.bank.list(customerId) / iron.bank.delete(id)

// Onramp + offramp (quote + create + get + list + cancel each)
iron.onramp.quote(req)  / iron.onramp.create(req)
iron.onramp.get(id)     / iron.onramp.list(customerId, limit?, offset?)
iron.onramp.cancel(id)
iron.offramp.quote(req) / iron.offramp.create(req)
iron.offramp.get(id)    / iron.offramp.list(customerId, limit?, offset?)
iron.offramp.cancel(id)

// Quotes (Iron has no quote-by-ID endpoint; .get throws)
iron.quotes.get(id) // throws — use onramp.quote / offramp.quote instead

// Third-party payments + autoramps + virtual accounts + metadata
iron.thirdPartyPayments.create(req)
iron.thirdPartyPayments.get(id) / iron.thirdPartyPayments.list(customerId, limit?, offset?)
iron.autoramps.list(customerId)
iron.virtualAccounts.list(customerId)
iron.virtualAccounts.create(customerId, request)
iron.metadata.listFiatCurrencies()

// Webhooks
import { verifyIronSignature, normalizeIronEvent, IRON_SIGNATURE_HEADER } from "@dynamic-demos/iron";

// Simple offramp helpers (used by apps/proceeds)
import { getOfframpQuote, createOfframp, chainIdToBlockchain } from "@dynamic-demos/iron";
```

Supported corridors (frontmatter / `regions` is the source of truth): US/ACH+WIRE, DE+FR+ES+IT+NL/SEPA, GB/FASTER_PAYMENTS.

## Env vars

- `IRON_API_KEY` — Iron API key — required at runtime (read by dashboard).
- `IRON_ENVIRONMENT` — `sandbox` | `production` — optional, defaults to sandbox (D-005).
- `IRON_WEBHOOK_SECRET` — for `verifyIronSignature` — required when wiring the receiver.

The package does **not** read `process.env`. The dashboard reads Iron env via `apps/dashboard/src/lib/iron/client.ts` (`getIronClient()`), which is the only sanctioned env-reader. Routes call `getIronClient().customers.get(id)` etc.

## Escape hatch — when the typed wrapper doesn't cover what you need

There is **no escape hatch on disk today**. The internal `request<T>` helper inside `IronFinanceClient` is private. If you need an endpoint not exposed by the typed methods:

- **Short-term:** call the upstream API directly with `fetch` using the `X-API-Key` header against `resolveIronBaseUrl(env)`. Don't reimplement the header / base-URL resolution in more than one site.
- **Medium-term:** add a typed method on the appropriate namespace and submit a PR. The surface is already large; one more method has marginal cost.

## Promote to typed only when…

Same three-tier rule as Fireblocks: prefer the typed method > extend `IronFinanceClient` > raw `fetch`. Only promote a raw call to a typed method when (a) multiple demos need it AND (b) the operation has a uniform shape.

## Out of scope / things this wrapper does NOT do

- Direct invocation from `apps/*`. Apps go through dashboard `/api/orchestrate/*` (D-003). Apps don't hold Iron credentials.
- The onramp surface is fully exposed but **not yet wired to a demo** — if your demo adds onramp, set `flow_role` on the package's frontmatter accordingly (or split the package).

## Common gotchas

- `apiKey` is **required** on `createIronClient` — the package no longer falls back to `process.env`. Dashboard route handlers should call `getIronClient()` from `apps/dashboard/src/lib/iron/client.ts`.
- `rampStatusToCanonical` / `ironAutorampStatusToCanonical` are placeholders until Phase 1E rebinds them to `TransactionState` from `@dynamic-demos/transactions`.
- `verifyIronSignature(rawBody, signature, secret)` requires the **raw** body (pre-JSON-parse). Don't call `JSON.parse` before verifying.
- Iron's API uses `X-API-Key` (not `Authorization: Bearer`) and `IDEMPOTENCY-KEY` for idempotency — don't copy auth from another provider's wrapper.
- `iron.quotes.get(id)` throws — Iron has no quote-by-ID endpoint. Use `iron.onramp.quote(req)` / `iron.offramp.quote(req)` instead.
- `iron.wallets.registerHosted` and `iron.wallets.registerSelfHosted` both hit the same `/api/addresses/crypto/selfhosted` endpoint — the alias exists because Iron exposes a single endpoint for both types.
- For broader API surface (beyond what the namespaces expose), check `packages/iron/docs/iron-api.md`.
