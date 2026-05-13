---
name: blindpay
description: Use when the user needs to integrate BlindPay — custodial stablecoin payouts/payins, live FX rates, Svix webhook verification, LATAM + US/EU corridors (PIX/TED/ACH/WIRE/SPEI/PSE/CBU). Triggers on "blindpay", "stablecoin payout", "stablecoin payin", "Svix webhook", "Brazil PIX payout", "@dynamic-demos/blindpay". Custodial: BlindPay holds funds between USDC receipt and fiat disbursement.
---

# BlindPay

## Where to look first

1. **Local wrapper:** `packages/blindpay/` — read its `AGENTS.md` for the public surface. Dashboard-side only (D-003); demo apps never import it.
2. **Authoritative docs:** https://www.blindpay.com/docs/getting-started/overview
3. **API reference:** https://www.blindpay.com/docs/api-reference
4. **Webhooks:** https://www.blindpay.com/docs/essentials/webhooks (Svix HMAC-SHA256)

## The client and its public surface

The client surface is **flat methods**, not namespaced. (Past versions of the AGENTS.md described a `client.payouts.*` / `client.payins.*` shape that does not exist in code.)

```typescript
import { createBlindpayClient } from "@dynamic-demos/blindpay";

const client = createBlindpayClient({
  env: "sandbox", // or "production"
  instanceId: process.env.BLINDPAY_INSTANCE_ID!,
  apiKey: process.env.BLINDPAY_API_KEY!,
});

// Payouts (stablecoin → local fiat)
const payoutQuote = await client.createPayoutQuote({
  bank_account_id, currency_type, cover_fees, request_amount, network, token,
});
const payout = await client.executePayout({ quote_id, sender_wallet_address });
const payoutStatus = await client.getPayoutStatus(payoutId);

// Payins (local fiat → stablecoin)
const payinQuote = await client.createPayinQuote({
  blockchain_wallet_id, currency_type, cover_fees, request_amount, payment_method, token,
});
const payin = await client.executePayin({ payin_quote_id });
const payinStatus = await client.getPayinStatus(payinId);

// FX rates (with 402 fallback to full quote when bank_account + network supplied)
const rates = await client.getRates({ from, to, amount, currency_type });

// Webhooks (Svix HMAC-SHA256)
import { webhooks } from "@dynamic-demos/blindpay";
webhooks.verifySignature(...);
webhooks.normalize(rawPayload); // → CanonicalEvent
```

Supported corridors: BR/PIX/TED, US/ACH/WIRE, MX/SPEI, CO/PSE, AR/CBU.

## Env vars

The package reads no `process.env` directly — credentials live at the dashboard (D-003):

- `BLINDPAY_API_KEY` — BlindPay API key — required.
- `BLINDPAY_INSTANCE_ID` — BlindPay tenant id — required.
- `BLINDPAY_ENVIRONMENT` — `sandbox` | `production` — optional, defaults to sandbox (D-005).
- `BLINDPAY_WEBHOOK_SECRET` — Svix endpoint secret — required when wiring the receiver.

## Escape hatch — when the typed wrapper doesn't cover what you need

There is **no escape hatch on disk today**. The internal `request<T>` helper inside `client.ts` is closed over and not exported. If you need an endpoint the typed methods don't expose:

- **Option (a):** extend the wrapper — add a new typed method that calls into the existing baseUrl + Bearer-token pattern, and submit a PR.
- **Option (b):** call the upstream API directly with `fetch` using `Authorization: Bearer ${apiKey}` against `${apiUrl}/instances/${instanceId}/...`. Don't reimplement the URL/auth in more than one site.

Prefer (a) — adding a typed method is cheap, and the API surface is small enough that an escape hatch hasn't been worth the wrapping cost.

## Promote to typed only when…

Same three-tier rule as Fireblocks: prefer the typed methods > extend the wrapper > raw `fetch`. Only promote a raw call to a typed method when (a) multiple demos need it AND (b) the operation has a uniform shape.

## Out of scope / things this wrapper does NOT do

- KYB / business onboarding — separate dashboard workflow, not this package.
- Direct invocation from `apps/*`. Apps go through `/api/orchestrate/offramp` (D-001 / D-003).
- Order placement on a CLOB or any non-payout/payin/rates operation.

## Common gotchas

- **`getRates` has special 402 fallback behavior:** the primary path is `POST /quotes/fx`. If BlindPay returns 402 and the caller supplied `bank_account_id` + `network`, the helper falls back to `POST /quotes` (the full-quote endpoint) and returns a `quote_type: "full"` shape instead. Consumers must handle both shapes — check `quote_type` before reading `result_amount`.
- **Custodial:** BlindPay holds funds between USDC receipt and fiat disbursement. Surface this in demo UX — users should know it's not non-custodial.
- Svix signatures must verify before any state transitions; replay attacks otherwise.
- `mapBlindpayStatus` is a placeholder until Phase 1E rebinds it to `TransactionState` from `@dynamic-demos/transactions`.
- Wire format is `snake_case`; the typed request/response objects keep `snake_case` field names (unlike alfredpay, which translates to camelCase). Don't accidentally rename.
