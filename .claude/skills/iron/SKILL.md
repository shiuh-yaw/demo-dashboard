---
name: iron
description: Use when the user needs to integrate Iron Finance (a MoonPay product) — stablecoin <-> fiat onramp/offramp, KYC (hosted link or SumSub token sharing), sandbox operations (approve autoramps, fiat addresses, simulate transactions), customers/wallets/bank accounts, third-party payments, named virtual accounts, Standard Webhooks verification (US/ACH+WIRE, EU/SEPA, GB/FASTER_PAYMENTS). Triggers on "iron", "iron finance", "iron.xyz", "moonpay offramp", "virtual account", "stablecoin offramp EUR", "sumsub token sharing", "iron sandbox", "@dynamic-demos/iron". Non-custodial offramp: settles via Dynamic wallet -> bank.
---

# Iron Finance

## Where to look first

1. **Local wrapper:** `packages/iron/` -- read its `AGENTS.md` for the public surface. Dashboard-side only (D-003); demo apps never import it.
2. **Authoritative docs:** https://docs.iron.xyz/
3. **API reference (sandbox):** https://docs.iron.xyz/reference-sandbox
4. **SumSub token sharing:** https://docs.iron.xyz/reliance-kyc-token-sharing
5. **Sandbox operations:** https://docs.iron.xyz/sandbox
6. **Local detail:** `packages/iron/docs/iron-api.md` (full surface used by dashboard) and `packages/iron/docs/iron-api-flows.md` (onboarding + ramp flows).

## The client and its public surface

`IronFinanceClient` exposes a **namespaced surface** -- 14 namespaces grouped by domain. `MockIronClient` mirrors the same shape for tests.

```typescript
import { createIronClient } from "@dynamic-demos/iron";

const iron = createIronClient({
  apiKey: process.env.IRON_API_KEY!,
  env: "sandbox", // or "production" -- defaults to sandbox (D-005)
});

// Customers (KYC subject)
iron.customers.create(...) / iron.customers.get(id)
iron.customers.list(...)   / iron.customers.update(id, ...)

// KYC + identifications + signings
iron.kyc.start({ customer_id, return_url? })         // hosted link flow (type: "Link")
iron.kyc.startWithToken({ customer_id, token, intended_use, ... })  // SumSub token sharing (type: "Token")
iron.kyc.getSession(sessionId) / iron.kyc.getStatus(customerId)
iron.identifications.list(customerId)
iron.identifications.updateStatus(identificationId, approved)
iron.signings.listRequired(customerId)
iron.signings.create(customerId, request)

// Wallets (hosted + self-hosted -- same Iron endpoint, alias methods)
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
iron.quotes.get(id) // throws -- use onramp.quote / offramp.quote instead

// Third-party payments + autoramps + virtual accounts + metadata
iron.thirdPartyPayments.create(req)
iron.thirdPartyPayments.get(id) / iron.thirdPartyPayments.list(customerId, limit?, offset?)
iron.autoramps.list(customerId)
iron.virtualAccounts.list(customerId)
iron.virtualAccounts.create(customerId, request)
iron.metadata.listFiatCurrencies()

// Sandbox operations (move entities through lifecycle in sandbox)
iron.sandbox.approveAutoramp(autorampId)                          // PUT /api/sandbox/autoramp/{id} -> "Approved"
iron.sandbox.setAutorampStatus(autorampId, status)                // PUT /api/sandbox/autoramp/{id} -> status
iron.sandbox.approveFiatAddress(fiatAddressId)                    // PUT /api/sandbox/fiat-verification/{id} -> "Registered"
iron.sandbox.setFiatAddressStatus(fiatAddressId, status)          // PUT /api/sandbox/fiat-verification/{id} -> status
iron.sandbox.createTransaction({ autoramp_id, amount, ... })      // POST /api/sandbox/transaction
iron.sandbox.setTransactionState(transactionId, state)            // PUT /api/sandbox/transaction/{id}/state
iron.sandbox.reset(idempotencyKey?)                               // POST /api/sandbox/reset

// Webhooks (Standard Webhooks spec)
import {
  verifyIronSignature,
  normalizeIronEvent,
  IRON_SIGNATURE_HEADER,   // "webhook-signature"
  IRON_TIMESTAMP_HEADER,   // "webhook-timestamp"
  IRON_ID_HEADER,          // "webhook-id"
  type IronWebhookHeaders,
} from "@dynamic-demos/iron";

// Status mappers
import {
  rampStatusToCanonical,             // RampStatus -> CanonicalTransactionState
  ironAutorampStatusToCanonical,     // Iron autoramp status string -> canonical
  ironTransactionStatusToCanonical,  // Iron transaction status string -> canonical
} from "@dynamic-demos/iron";

// Simple offramp helpers (used by apps/proceeds)
import { getOfframpQuote, createOfframp, chainIdToBlockchain } from "@dynamic-demos/iron";
```

Supported corridors (frontmatter / `regions` is the source of truth): US/ACH+WIRE, DE+FR+ES+IT+NL/SEPA, GB/FASTER_PAYMENTS.

## Typical onboarding flow (sandbox)

The standard Iron integration flow for a new demo app:

```
1. Create customer        -> iron.customers.create({ type, email })
2. Start KYC              -> iron.kyc.start({ customer_id })           // hosted link
                          OR iron.kyc.startWithToken({ customer_id, token, intended_use })  // SumSub
3. (Sandbox) Approve ID   -> iron.identifications.updateStatus(identificationId, true)
4. Sign required docs     -> iron.signings.listRequired(customerId) + iron.signings.create(...)
5. Register wallet        -> iron.wallets.registerSelfHosted({ customerId, address, blockchain, ... })
6. Register bank account  -> iron.bank.register({ customer_id, ... })
7. (Sandbox) Approve bank -> iron.sandbox.approveFiatAddress(fiatAddressId)
8. Create autoramp        -> iron.offramp.create({ customer_id, ... })  // or onramp
9. (Sandbox) Approve ramp -> iron.sandbox.approveAutoramp(autorampId)
10. (Sandbox) Simulate tx -> iron.sandbox.createTransaction({ autoramp_id, amount })
11. (Sandbox) Complete tx  -> iron.sandbox.setTransactionState(txId, "Completed")
```

**Critical sandbox note:** Without steps 3, 7, 9, sandbox flows dead-end. Autoramps stay in `Authorized` (no deposit_rails), fiat addresses stay `RegistrationPending`. The `sandbox` namespace exists specifically to unblock these.

## SumSub token sharing

For apps that already have KYC data in SumSub (e.g. via Dynamic's identity verification), use token sharing to skip re-verification:

```typescript
import type { StartKYCTokenRequest, IntendedUse, KycQuestionnaire, EddQuestionnaire } from "@dynamic-demos/iron";

const result = await iron.kyc.startWithToken({
  customer_id: "cus_...",
  token: "sumsub-single-use-share-token",  // obtained from SumSub Share API
  intended_use: "Investing",               // or "Trading", "PurchaseDigitalAssets", etc.
  ip_address: "1.2.3.4",                   // optional
  kyc_questionnaire: {                     // optional
    employment_status: "Employed",
    yearly_gross_income: "50000",
    source_of_wealth: "Salary",
    expected_monthly_transaction_count: "LessThan5",
    expected_monthly_transaction_volume: "LessThan500",
  },
  edd_questionnaire: {                     // optional, for enhanced due diligence
    occupation: "Software Engineer",
    approximate_net_worth: "100000",
  },
});

// result.status = "Processed" | "Pending" | "Approved"
// If "Pending" with a url, customer must complete missing steps at that URL
```

Both `kyc.start` (Link) and `kyc.startWithToken` (Token) hit the same Iron endpoint (`POST /api/customers/{id}/identifications/v2`) with different body shapes. Works in both sandbox and production.

## Webhook verification (Standard Webhooks)

Iron uses the **Standard Webhooks** specification. The signature uses `webhook-signature` header (NOT `x-iron-signature`), HMAC-SHA256 with base64-decoded secret, and `timestamp + rawBody` as the signed payload.

```typescript
import { verifyIronSignature, normalizeIronEvent, type IronWebhookHeaders } from "@dynamic-demos/iron";

// In your webhook handler:
const headers: IronWebhookHeaders = {
  "webhook-signature": req.headers["webhook-signature"],
  "webhook-timestamp": req.headers["webhook-timestamp"],
  "webhook-id": req.headers["webhook-id"],
};

const rawBody = await req.text(); // MUST be raw string, NOT parsed JSON
const isValid = verifyIronSignature(rawBody, headers, process.env.IRON_WEBHOOK_SECRET!);

if (isValid) {
  const event = normalizeIronEvent(JSON.parse(rawBody));
  // event.type = "iron.register_autoramp_status" | "iron.transaction_status" | ...
  // event.resource = "autoramp" | "transaction" | "customer" | ...
  // event.state = canonical state ("initialized" | "pending" | "submitted" | "confirmed" | "failed" | "cancelled")
}
```

Iron webhook payload shape (NOT the old `{ event_id, type: "autoramp.status_changed" }` format):
```typescript
{
  type: "register_autoramp_status",  // flat event name, NOT dotted
  timestamp: "2026-...",
  data: {
    customer_id: "cus_...",
    message: {
      RegisterAutorampStatus: { id: "ar_...", status: "Approved" }
    }
  }
}
```

Supported event types: `transaction`, `transaction_status`, `new_autoramp`, `register_autoramp_status`, `new_bank_account`, `deposit_address_created`, `customer_created`, `customer_status`, `register_fiat_address_status`, `identification_status`, `ping`.

## Status mapping: autoramp vs transaction

Iron has **separate** status domains. Do not conflate them:

**Autoramp statuses** (standing rule, NOT a transaction):
`Created` -> `EditPending` -> `Authorized` -> `DepositAccountAdded` -> `Approved` -> `Rejected`/`Cancelled`

- `Approved` means the rule is **active and ready for deposits**, NOT that a transfer completed.
- Canonical mapping: `Created`/`EditPending` = `initialized`, `Authorized`/`DepositAccountAdded` = `pending`, `Approved` = `submitted`.

**Transaction statuses** (actual money movement):
`FundsReviewInProgress` -> `ConversionInProgress` -> `PayoutInProgress` -> `Completed`/`Failed`/`RejectedAml`/`RejectedFraud`/`RejectedMinAmount`

- `Completed` is the only state that means money landed.
- Canonical mapping: `FundsReviewInProgress` = `pending`, `ConversionInProgress`/`PayoutInProgress` = `submitted`, `Completed` = `confirmed`.

## Env vars

- `IRON_API_KEY` -- Iron API key -- required at runtime (read by dashboard).
- `IRON_ENVIRONMENT` -- `sandbox` | `production` -- optional, defaults to sandbox (D-005).
- `IRON_WEBHOOK_SECRET` -- for `verifyIronSignature` (base64-encoded, optionally `whsec_`-prefixed) -- required when wiring the receiver.

The package does **not** read `process.env`. The dashboard reads Iron env via `apps/dashboard/src/lib/iron/client.ts` (`getIronClient()`), which is the only sanctioned env-reader. Routes call `getIronClient().customers.get(id)` etc.

## Dashboard API endpoints

Demo apps call these dashboard endpoints (D-003), not the package directly:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/iron/customers` | GET/POST | List / create customers |
| `/api/iron/customers/[id]` | GET/PATCH | Get / update a customer |
| `/api/iron/customers/[id]/kyc` | GET/POST | Get KYC status / start hosted KYC |
| `/api/iron/customers/[id]/kyc/token` | POST | Start KYC via SumSub token sharing |
| `/api/iron/customers/[id]/identifications` | GET | List identifications |
| `/api/iron/customers/[id]/signings` | GET/POST | List / sign required documents |
| `/api/iron/customers/[id]/wallets` | GET | List wallets |
| `/api/iron/customers/[id]/banks` | GET | List bank accounts |
| `/api/iron/customers/[id]/autoramps` | GET | List autoramps |
| `/api/iron/customers/[id]/virtual-accounts` | GET/POST | List / create virtual accounts |
| `/api/iron/banks` | POST | Register bank account |
| `/api/iron/banks/[id]` | GET/DELETE | Get / delete bank account |
| `/api/iron/wallets/hosted` | POST | Register hosted wallet |
| `/api/iron/wallets/self-hosted` | POST | Register self-hosted wallet |
| `/api/iron/wallets/[id]` | GET | Get wallet |
| `/api/iron/quotes/onramp` | POST | Get onramp quote |
| `/api/iron/quotes/offramp` | POST | Get offramp quote |
| `/api/iron/onramps` | GET/POST | List / create onramps |
| `/api/iron/onramps/[id]` | GET | Get onramp |
| `/api/iron/offramps` | GET/POST | List / create offramps |
| `/api/iron/offramps/[id]` | GET | Get offramp |
| `/api/iron/fiatcurrencies` | GET | List supported fiat currencies |
| `/api/iron/sandbox/identification/[id]` | POST | Approve/reject identification (sandbox) |
| `/api/iron/sandbox/autoramp/[id]` | PUT | Set autoramp status (sandbox) |
| `/api/iron/sandbox/fiat-verification/[id]` | PUT | Set fiat address status (sandbox) |
| `/api/iron/sandbox/transaction` | POST | Create mock transaction (sandbox) |
| `/api/iron/sandbox/transaction/[id]/state` | PUT | Set transaction state (sandbox) |
| `/api/iron/sandbox/reset` | POST | Reset all sandbox data |

## Bank account types: ACH vs SEPA

When registering bank accounts, use the correct identifier type:

```typescript
// ACH (US)
const achIdentifier: ACHAccountIdentifier = {
  type: "ACH",
  routing_number: "021000021",
  account_number: "123456789",
};

// SEPA (EU)
const sepaIdentifier: SEPAAccountIdentifier = {
  type: "SEPA",
  iban: "DE89370400440532013000",
};

// Wire (US)
const wireIdentifier: WireAccountIdentifier = {
  type: "WIRE",
  routing_number: "021000021",
  account_number: "123456789",
};
```

Do NOT send `iban` for ACH accounts or `routing_number`/`account_number` for SEPA -- the types are mutually exclusive.

## Escape hatch -- when the typed wrapper doesn't cover what you need

There is **no escape hatch on disk today**. The internal `request<T>` helper inside `IronFinanceClient` is private. If you need an endpoint not exposed by the typed methods:

- **Short-term:** call the upstream API directly with `fetch` using the `X-API-Key` header against `resolveIronBaseUrl(env)`. Don't reimplement the header / base-URL resolution in more than one site.
- **Medium-term:** add a typed method on the appropriate namespace and submit a PR. The surface is already large; one more method has marginal cost.

## Common gotchas

- `apiKey` is **required** on `createIronClient` -- the package no longer falls back to `process.env`. Dashboard route handlers should call `getIronClient()` from `apps/dashboard/src/lib/iron/client.ts`.
- **Autoramp `Approved` != transaction completed.** Approved means the rule is active. You need `ironTransactionStatusToCanonical` for actual transaction lifecycle.
- `verifyIronSignature(rawBody, headers, secret)` takes a **headers object** (not a single signature string). The `secret` is base64-encoded (optionally `whsec_`-prefixed). Requires the **raw** body (pre-JSON-parse).
- Iron's webhook event types are **flat** (`register_autoramp_status`, `transaction_status`) not dotted (`autoramp.status_changed`).
- `iron.quotes.get(id)` throws -- Iron has no quote-by-ID endpoint. Use `iron.onramp.quote(req)` / `iron.offramp.quote(req)` instead.
- Sandbox flows require explicit approval steps (`sandbox.approveAutoramp`, `sandbox.approveFiatAddress`) -- without them, entities stay in pending states forever.
- Iron's API uses `X-API-Key` (not `Authorization: Bearer`) and `IDEMPOTENCY-KEY` for idempotency -- don't copy auth from another provider's wrapper.
- `SimpleOfframpConfig` accepts either `bankIban` (SEPA) or `routingNumber` + `accountNumber` (ACH) -- not both.
