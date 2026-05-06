---
name: "@dynamic-demos/alfredpay"
kind: package
flow_role: offramp
custody: non-custodial
status: experimental
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
provider:
  name: alfred (alfredPay)
  docs: https://alfredpay.io/documentation
  api_reference: https://alfredpay.readme.io
  agent_docs: none
  status_page: none
---

# @dynamic-demos/alfredpay

Direct REST integration for alfredPay (LATAM offramp processor). The Fireblocks-mediated DVP path for the same partner lives separately at `packages/fireblocks/src/providers/alfredpay.ts` (D-009): demos pick **direct REST here** when they want self-custody via Dynamic wallets, and **Fireblocks DVP there** when they want vault-mediated settlement.

## Provider documentation

If you are an AI agent integrating against alfredPay, **consult the provider docs first**:

- **Main docs:** [alfredpay.io/documentation](https://alfredpay.io/documentation)
- **API reference:** [alfredpay.readme.io](https://alfredpay.readme.io)
- **Agent / LLM docs:** none published.

## Supported regions

| Country | Currency | Rails | Notes |
|---------|----------|-------|-------|
| BR      | BRL      | PIX   | Instant settlement, KYC required. |
| MX      | MXN      | SPEI  | Business hours only. |
| CO      | COP      | PSE   | Bank business hours. |
| AR      | ARS      | CBU   | Argentina bank account routing. |
| SV      | USD      | BANK  | Bank wire to El Salvador. |
| US      | USD      | ACH   | Same-day / next-day. |

If region coverage changes, update both this table and the `regions` field in frontmatter.

## Capabilities

- Sandbox / production base URL resolution — `resolveAlfredpayBaseUrl(env)`.
- REST client — `createAlfredpayClient({ env, apiKey })`.
- Offramp creation + status — `createOfframp(client, params)`, `getOfframpStatus(client, id)`.
- Webhook signature verification — `webhooks.verifySignature`.
- Webhook event normalisation — `webhooks.normalize` → `CanonicalEvent`.
- Status mapping — `state-mapping.ts` translates upstream status to canonical `TransactionState` (Phase 1E final wiring).

## Public surface

All exports are stable and live at the package root.

- `createAlfredpayClient`, `createOfframp`, `getOfframpStatus` — REST flow. (stable)
- `resolveAlfredpayBaseUrl`, `ALFREDPAY_SANDBOX_BASE_URL`, `ALFREDPAY_PRODUCTION_BASE_URL` — env helpers. (stable)
- `AlfredpayApiError` — typed error class. (stable)
- Types: `AlfredpayEnvironment`, `AlfredpayClient`, `AlfredpayBeneficiary`, `AlfredpayCountry`, `AlfredpayCreateOfframpParams`, `AlfredpayOfframp`, `AlfredpayRail`, `AlfredpaySourceCurrency`, `AlfredpayStatus`. (stable)
- `webhooks.verifySignature`, `webhooks.normalize` — webhook helpers. (stable)

## Required environment

The package reads no `process.env` directly — credentials live at the **dashboard** (D-003).

- `ALFREDPAY_API_KEY` — alfred API key — required (dashboard runtime).
- `ALFREDPAY_ENVIRONMENT` — `sandbox` | `production` — optional, defaults to sandbox (D-005).
- `ALFREDPAY_WEBHOOK_SECRET` — for `webhooks.verifySignature` — required when wiring the receiver.

## Slots vs invariants

**Slots:** beneficiary corridor (country + rail), source currency (USD / USDC), recipient details supplied by the demo end-user.

**Invariants:**

- Sandbox-by-default (D-005).
- Non-custodial: alfredPay never holds the user's crypto — funds settle direct from the user's Dynamic wallet via signed transfer.
- Webhook signatures must verify before the dashboard transitions any transaction state.
- Apps never call alfredPay directly — they go through the dashboard's `/api/orchestrate/offramp` (D-001/D-003).

## Integration map

**Imports:** none (uses global `fetch`).
**Imported by:** `apps/dashboard` (orchestration + webhook receiver). Apps interact via the dashboard HTTP API.

## Examples

```ts
import { createAlfredpayClient, createOfframp } from "@dynamic-demos/alfredpay";

const client = createAlfredpayClient({
  env: "sandbox",
  apiKey: process.env.ALFREDPAY_API_KEY!,
});

const offramp = await createOfframp(client, {
  country: "BR",
  rail: "pix",
  amountUsd: "100.00",
  beneficiary: { taxId: "...", name: "...", pixKey: "..." },
});
```

## Do / Don't

- Do: route demo-app calls through `/api/orchestrate/offramp` so secrets stay in dashboard (D-003).
- Do: use the canonical state machine (`@dynamic-demos/transactions`) when persisting alfredPay transactions.
- Don't: import this package from a demo app. The Direct REST path is dashboard-side.
- Don't: store `ALFREDPAY_API_KEY` in any `apps/*` env file — production-creds CI gate enforces this.

## Open questions / known gaps

- Phase 1E re-points `state-mapping.ts` from the placeholder canonical-state union to the real `TransactionState` from `@dynamic-demos/transactions`.
- Phase 5A wires the dashboard's `/api/webhooks/alfredpay` route to `webhooks.verifySignature` + `webhooks.normalize`.
- Phase 5B routes `/api/orchestrate/offramp` to `createOfframp` for `BR | MX | CO | AR | SV | US` corridors.
- Real-network tests stay out of CI (D-023). Test coverage is fetch-stubbed Vitest only.
