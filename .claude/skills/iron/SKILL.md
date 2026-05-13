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

Iron has the **largest surface** of any provider in the monorepo (~30 methods on the `IronFinanceClient` class). Group by domain when reaching for a method:

```typescript
import { createIronClient } from "@dynamic-demos/iron";

const iron = createIronClient({
  env: "sandbox", // or "production"
  apiKey: process.env.IRON_API_KEY!,
});

// Customers (KYC subject)
iron.createCustomer(...)
iron.getCustomer(id) / iron.listCustomers(...) / iron.updateCustomer(...)

// KYC
iron.startKYC(...) / iron.getKYCSession(id) / iron.getCustomerKYCStatus(id)
iron.getRequiredSignings(customerId) / iron.createSigning(...)
iron.getCustomerIdentifications(customerId) / iron.updateIdentificationStatus(...)

// Wallets (hosted + self-hosted)
iron.registerHostedWallet(...) / iron.registerSelfHostedWallet(...)
iron.getWallet(id) / iron.listWallets(customerId)

// Bank accounts (FiatAddresses)
iron.registerBankAccount(...)
iron.getBankAccount(id) / iron.listBankAccounts(...) / iron.deleteBankAccount(id)
iron.listFiatCurrencies()

// Quotes + ramps
iron.getOnrampQuote(req)  / iron.createOnramp(...)
iron.getOfframpQuote(req) / iron.createOfframp(...)
iron.getQuote(id) / iron.getOnramp(id) / iron.getOfframp(id)
iron.listOnramps(...) / iron.listOfframps(...)
iron.cancelOnramp(id) / iron.cancelOfframp(id)

// Third-party payments + virtual accounts + autoramps
iron.createThirdPartyPayment(...) / iron.getThirdPartyPayment(id) / iron.listThirdPartyPayments(...)
iron.listAutoramps(customerId)
iron.listVirtualAccounts(...) / iron.createVirtualAccount(...)

// Webhooks
import { verifyIronSignature, normalizeIronEvent, IRON_SIGNATURE_HEADER } from "@dynamic-demos/iron";

// Simple offramp helpers (used by apps/proceeds)
import { getOfframpQuote, createOfframp, chainIdToBlockchain } from "@dynamic-demos/iron";
```

Supported corridors (frontmatter / `regions` is the source of truth): US/ACH+WIRE, DE+FR+ES+IT+NL/SEPA, GB/FASTER_PAYMENTS.

## Env vars

- `IRON_API_KEY` — Iron API key — required at runtime.
- `IRON_ENVIRONMENT` — `sandbox` | `production` — optional, defaults to sandbox (D-005).
- `IRON_WEBHOOK_SECRET` — for `verifyIronSignature` — required when wiring the receiver.

The package also exports a lazy singleton `ironClient` that reads `IRON_API_KEY` + `IRON_ENVIRONMENT` from `process.env` directly (see anti-patterns below).

## Escape hatch — when the typed wrapper doesn't cover what you need

There is **no escape hatch on disk today**. The internal `request<T>` helper inside `IronFinanceClient` is private. If you need an endpoint not exposed by the ~30 typed methods:

- **Short-term:** call the upstream API directly with `fetch` using the `X-API-Key` header against `resolveIronBaseUrl(env)`. Don't reimplement the header / base-URL resolution in more than one site.
- **Medium-term:** add a typed method on `IronFinanceClient` and submit a PR. The surface is already large; one more method has marginal cost.

## Known anti-patterns in this package (avoid in new code)

- **`process.env.IRON_API_KEY` is read inside the constructor.** This breaks the "package never reads env" guarantee that every other Phase 1B provider follows. Prefer passing `apiKey` explicitly via `createIronClient({ apiKey })`. Tests must do this to avoid env coupling.
- **`ironClient` singleton is exported** for convenience. Don't use it in new code — it's untestable and couples runtime to module-load time. Use `createIronClient(...)` and inject.

## Promote to typed only when…

Same three-tier rule as Fireblocks: prefer the typed method > extend `IronFinanceClient` > raw `fetch`. Only promote a raw call to a typed method when (a) multiple demos need it AND (b) the operation has a uniform shape.

## Out of scope / things this wrapper does NOT do

- Direct invocation from `apps/*`. Apps go through dashboard `/api/orchestrate/*` (D-003). Apps don't hold Iron credentials.
- The onramp surface is fully exposed but **not yet wired to a demo** — if your demo adds onramp, set `flow_role` on the package's frontmatter accordingly (or split the package).

## Common gotchas

- Prefer `createIronClient` over the `ironClient` singleton in any new code (testability).
- `rampStatusToCanonical` / `ironAutorampStatusToCanonical` are placeholders until Phase 1E rebinds them to `TransactionState` from `@dynamic-demos/transactions`.
- `verifyIronSignature(rawBody, signature, secret)` requires the **raw** body (pre-JSON-parse). Don't call `JSON.parse` before verifying.
- Iron's API uses `X-API-Key` (not `Authorization: Bearer`) and `IDEMPOTENCY-KEY` for idempotency — don't copy auth from another provider's wrapper.
- For broader API surface (beyond what `IronFinanceClient` exposes), check `packages/iron/docs/iron-api.md`.
