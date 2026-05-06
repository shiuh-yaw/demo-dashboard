---
name: "@dynamic-demos/coinbase-onramp"
kind: package
flow_role: onramp
custody: non-custodial
status: experimental
regions:
  - country: US
    currency: USD
    rails: [card, ach, apple_pay]
  - country: GB
    currency: GBP
    rails: [card]
  - country: CA
    currency: CAD
    rails: [card]
  - country: AU
    currency: AUD
    rails: [card]
  - country: EU
    currency: EUR
    rails: [card, sepa]
provider:
  name: Coinbase Onramp (CDP)
  docs: https://docs.cdp.coinbase.com/
  api_reference: https://docs.cdp.coinbase.com/onramp/docs
  agent_docs: none
  status_page: https://status.coinbase.com
---

# @dynamic-demos/coinbase-onramp

Coinbase Onramp REST client + webhook helpers. Lets a demo end-user buy crypto with USD/EUR/GBP/CAD/AUD via Coinbase's hosted onramp flow; settlement lands directly in the user's Dynamic wallet (non-custodial). Used by dashboard onramp orchestration; demo apps don't import this package directly (D-003).

## Provider documentation

If you are an AI agent integrating against Coinbase Onramp, **consult the provider docs first**:

- **CDP docs:** [docs.cdp.coinbase.com](https://docs.cdp.coinbase.com/)
- **Onramp API:** [docs.cdp.coinbase.com/onramp/docs](https://docs.cdp.coinbase.com/onramp/docs)
- **Status:** [status.coinbase.com](https://status.coinbase.com)

## Supported regions

| Country | Currency | Rails               | Notes |
|---------|----------|---------------------|-------|
| US      | USD      | CARD, ACH, APPLE_PAY| Apple Pay requires CDP allowlist. |
| GB      | GBP      | CARD                | 3DS required. |
| CA      | CAD      | CARD                | Card-only. |
| AU      | AUD      | CARD                | Card-only. |
| EU      | EUR      | CARD, SEPA          | SEPA same-day in most members. |

Coverage shifts as Coinbase enables new corridors — confirm against [Coinbase's supported countries page](https://docs.cdp.coinbase.com/onramp/docs/supported-countries) before launching a new corridor demo and update both this table and the `regions` field in frontmatter.

## Capabilities

- Sandbox / production endpoint resolution — `resolveCoinbaseOnrampEndpoint(env)`.
- REST client — `createCoinbaseOnrampClient({ env, apiKey, apiSecret })` (CDP API key + secret pair).
- Hosted-onramp order creation — `createOnrampOrder(client, params)` returning a redirect URL + payment link.
- Schemas — `createOnrampOrderApiSchema`, `createOnrampOrderValidationSchema` (Zod).
- Webhook verification — header `COINBASE_ONRAMP_SIGNATURE_HEADER` + verifier (HMAC-SHA256).
- Webhook normalisation — provider event → `CanonicalEvent`.
- Status mapping — `mapCoinbaseOnrampStatus(upstream)` → canonical placeholder (Phase 1E swaps in `TransactionState`).

## Public surface

Stable, all live at the package root.

- `createCoinbaseOnrampClient`, `createOnrampOrder`, `CoinbaseError`. (stable)
- `resolveCoinbaseOnrampEndpoint`, `CoinbaseOnrampEndpoint`, `CoinbaseOnrampEnvironment`. (stable)
- Schemas: `createOnrampOrderApiSchema`, `createOnrampOrderValidationSchema`. (stable)
- Types: `CoinbaseOrder`, `CoinbaseOrderResponse`, `CoinbasePaymentLink`, `CoinbaseTokenRequest`, `CreateOnrampOrderApiParams`, `CreateOnrampOrderParams`, `OnrampOrderResponse`. (stable)
- `mapCoinbaseOnrampStatus`, `CoinbaseOnrampOrderStatus`, `CanonicalTransactionStatePlaceholder`. (stable, rebinds in Phase 1E)
- Webhooks: `COINBASE_ONRAMP_SIGNATURE_HEADER`, signature verifier, normaliser.

## Required environment

The package reads no `process.env` directly — credentials live at the dashboard (D-003).

- `COINBASE_ONRAMP_API_KEY` — CDP API key id — required.
- `COINBASE_ONRAMP_API_SECRET` — CDP API secret (PEM-formatted ECDSA) — required.
- `COINBASE_ONRAMP_ENVIRONMENT` — `sandbox` | `production` — optional, defaults to sandbox (D-005).
- `COINBASE_ONRAMP_WEBHOOK_SECRET` — for signature verification — required when wiring receiver.

## Slots vs invariants

**Slots:** destination wallet address (Dynamic wallet), purchase amount + currency, asset (USDC/ETH/...), corridor (country/rail).

**Invariants:**

- Sandbox-by-default (D-005).
- Non-custodial: Coinbase delivers crypto directly to the user's Dynamic wallet; no escrow.
- Webhook signatures must verify before any state transitions.
- Apps never import this package — dashboard `/api/orchestrate/onramp` is the boundary (D-003).

## Integration map

**Imports:** none (uses global `fetch`).
**Imported by:** `apps/dashboard` (orchestration + webhook receiver). Demo apps interact via dashboard HTTP API.

## Examples

```ts
import { createCoinbaseOnrampClient, createOnrampOrder } from "@dynamic-demos/coinbase-onramp";

const client = createCoinbaseOnrampClient({
  env: "sandbox",
  apiKey: process.env.COINBASE_ONRAMP_API_KEY!,
  apiSecret: process.env.COINBASE_ONRAMP_API_SECRET!,
});

const order = await createOnrampOrder(client, {
  destinationWallet: "0xabc...",
  asset: "USDC",
  amountUsd: "50.00",
  corridor: { country: "US", currency: "USD", rail: "card" },
});
// redirect the end user to order.payment_link
```

## Do / Don't

- Do: keep API key + secret in dashboard env (D-003).
- Do: validate user-supplied corridor against the `regions` table before calling.
- Don't: import this package from a demo app.
- Don't: skip signature verification on webhook delivery.

## Open questions / known gaps

- Phase 1E re-binds `mapCoinbaseOnrampStatus` to `TransactionState` from `@dynamic-demos/transactions`.
- Phase 5A wires the dashboard webhook framework against the verifier + normaliser.
- Coinbase periodically rotates supported corridors; confirm `regions` against the live supported-countries page when adding a demo.
- No real-network tests in CI (D-023). Vitest stubs `fetch`.
