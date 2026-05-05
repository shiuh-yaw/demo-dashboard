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

> **Phase 1B stub.** Phase 3 will replace this body with the full AGENTS.md
> per `docs/templates/AGENTS.template.md`. The frontmatter above is
> authoritative — the demo registry queries it.

BlindPay payouts/payins/rates client + Svix webhook verifier. Extracted from
`apps/dashboard/src/lib/services/blindpay.ts` in Phase 1B per D-009.

## Provider documentation

- Main docs: <https://www.blindpay.com/docs/getting-started/overview>
- API reference: <https://www.blindpay.com/docs/api-reference>
- Webhooks: <https://www.blindpay.com/docs/essentials/webhooks>

## Public surface (preview)

- `createBlindpayClient({ env, instanceId, apiKey })` — REST client factory.
- `webhooks.verifySignature` — Svix HMAC-SHA256 verification.
- `webhooks.normalize` — translate event payload to a `CanonicalEvent`.
- `mapBlindpayStatus` — provider status to canonical state (placeholder; Phase 1E swaps in the real `TransactionState` enum).

## Open items

- Full body content (capabilities, slots/invariants, integration map,
  do/don't, examples) lands in Phase 3.
- Webhook framework (signature -> persist -> fan-out) lands in Phase 5A;
  this package ships verifier + normalizer only today.
- `state-mapping.ts` will switch from the placeholder to
  `@dynamic-demos/transactions` when Phase 1E merges.
