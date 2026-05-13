---
name: "@dynamic-demos/blindpay"
kind: package
flow_role: offramp
custody: custodial
status: experimental
regions:
  - country: BR
    currency: BRL
    rails: [pix, ted]
  - country: US
    currency: USD
    rails: [ach, wire]
  - country: MX
    currency: MXN
    rails: [spei]
  - country: CO
    currency: COP
    rails: [pse]
  - country: AR
    currency: ARS
    rails: [cbu]
provider:
  name: BlindPay
  docs: https://www.blindpay.com/docs/getting-started/overview
  api_reference: https://www.blindpay.com/docs/api-reference
  agent_docs: none
  status_page: https://status.blindpay.com
---

# @dynamic-demos/blindpay

BlindPay payouts/payins/rates client + Svix webhook verifier. Custodial offramp: BlindPay holds the USD/USDC and disburses local fiat through bank rails. Used by dashboard offramp orchestration; demo apps don't import this package directly (D-003).

## Provider documentation

If you are an AI agent integrating against BlindPay, **consult the provider docs first**:

- **Main docs:** [blindpay.com/docs](https://www.blindpay.com/docs/getting-started/overview)
- **API reference:** [blindpay.com/docs/api-reference](https://www.blindpay.com/docs/api-reference)
- **Webhooks:** [blindpay.com/docs/essentials/webhooks](https://www.blindpay.com/docs/essentials/webhooks) (Svix HMAC-SHA256)
- **Status:** [status.blindpay.com](https://status.blindpay.com)

## Supported regions

| Country | Currency | Rails    | Notes |
|---------|----------|----------|-------|
| BR      | BRL      | PIX, TED | PIX sub-minute; TED business hours. |
| US      | USD      | ACH, WIRE| ACH same-day; wire intra-day. |
| MX      | MXN      | SPEI     | Business hours. |
| CO      | COP      | PSE      | Bank business hours. |
| AR      | ARS      | CBU      | Argentina bank account routing. |

If region coverage changes, update both this table and the `regions` field in frontmatter.

## Capabilities

- REST client factory — `createBlindpayClient({ env, instanceId, apiKey })`.
- Quote + execute payouts — `client.payouts.quote(...)`, `client.payouts.execute(...)`.
- Quote + execute payins — `client.payins.quote(...)`, `client.payins.execute(...)`.
- Live FX rates — `client.rates.fetch(...)`.
- Webhook signature verification — `webhooks.verifySignature` (Svix HMAC-SHA256).
- Webhook normalisation — `webhooks.normalize` → `CanonicalEvent`.
- Status mapping — `mapBlindpayStatus(upstream)` → canonical placeholder (Phase 1E swaps in `TransactionState`).

## Public surface

All exports are stable and live at the package root.

- `createBlindpayClient`, `BlindpayClient`, `CreateBlindpayClientOptions` — client factory + types. (stable)
- `DEFAULT_BLINDPAY_API_URL`, `resolveBlindpayApiUrl`, `BlindpayEnvironment` — env helpers. (stable)
- Types: `BlindpayBankDetails`, `Currency`, `CurrencyType`, `FiatCurrency`, `Network`, `PaymentMethod`, request/response shapes for payins/payouts/rates. (stable)
- `webhooks` namespace — `verifySignature`, `normalize`, header types. (stable)
- `mapBlindpayStatus`, `BlindpayStatus`, `CanonicalTransactionStatePlaceholder` — state mapping (placeholder). (stable, will rebind in Phase 1E)

## Dashboard API surface

Demos do not import this package directly. They call the dashboard endpoints below that expose it. The Phase 6A Skill reads this section when scaffolding to know which endpoints to wire.

| Endpoint | Method | Purpose | Audience |
|---|---|---|---|
| `/api/blindpay/payouts/quote` | POST | Quote a stablecoin → fiat payout (step 1) | demo |
| `/api/blindpay/payouts/execute` | POST | Execute a payout after user token approval (step 2) | demo |
| `/api/blindpay/payouts/[id]` | GET | Get payout status | demo / operator |
| `/api/blindpay/payins/quote` | POST | Quote a fiat → stablecoin payin (step 1) | demo |
| `/api/blindpay/payins/execute` | POST | Execute a payin after fiat deposit (step 2) | demo |
| `/api/blindpay/payins/[id]` | GET | Get payin status | demo / operator |
| `/api/blindpay/rates` | GET | Get FX rates (with bank-account fallback to full quote) | demo |
| `/api/webhooks/blindpay` | POST | Svix-verified webhook receiver (D-011) | provider → dashboard |

## Required environment

The package reads no `process.env` directly — credentials live at the dashboard (D-003).

- `BLINDPAY_API_KEY` — BlindPay API key — required (dashboard runtime).
- `BLINDPAY_INSTANCE_ID` — BlindPay tenant id — required.
- `BLINDPAY_ENVIRONMENT` — `sandbox` | `production` — optional, defaults to sandbox (D-005).
- `BLINDPAY_WEBHOOK_SECRET` — Svix endpoint secret for signature verify — required when wiring the receiver.

## Slots vs invariants

**Slots:** corridor + rail, payout currency, beneficiary bank details, KYB business profile.

**Invariants:**

- Sandbox-by-default (D-005).
- **Custodial**: BlindPay holds funds between USDC receipt and fiat disbursement — surface this in demo copy.
- Webhook signatures (Svix) must verify before any transaction state transitions. Replay attacks otherwise.
- Apps never import this package — go through the dashboard endpoints listed in "Dashboard API surface" above (D-001/D-003).

## Integration map

**Imports:** none (uses global `fetch`).
**Imported by:** `apps/dashboard` (orchestration + webhook receiver). Demo apps interact via dashboard HTTP API.

## Examples

```ts
import { createBlindpayClient } from "@dynamic-demos/blindpay";

const client = createBlindpayClient({
  env: "sandbox",
  instanceId: process.env.BLINDPAY_INSTANCE_ID!,
  apiKey: process.env.BLINDPAY_API_KEY!,
});

const quote = await client.payouts.quote({
  request_amount: 100_00,
  currency_type: "sender",
  cover_fees: false,
  payment_method: "pix",
});
const result = await client.payouts.execute({ quote_id: quote.quote_id, /* beneficiary */ });
```

## Do / Don't

- Do: keep secrets in dashboard env. Never `apps/*`.
- Do: surface "custodial" status in demo UX — users should know BlindPay holds funds in flight.
- Don't: import this package from a demo app.
- Don't: skip Svix signature verification on webhook delivery.

## Open questions / known gaps

- Phase 1E re-binds `mapBlindpayStatus` to `TransactionState` from `@dynamic-demos/transactions`.
- Phase 5A wires the dashboard webhook framework against `webhooks.verifySignature` + `normalize`.
- KYB onboarding flow is a separate dashboard workflow; this package is payout/payin/rates only.
- No real-network tests in CI (D-023). Vitest stubs `fetch`.
