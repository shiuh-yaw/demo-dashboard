---
name: coinbase-onramp
kind: package
flow_role: onramp
custody: non-custodial
status: stub
provider:
  name: Coinbase Onramp
  docs: https://docs.cdp.coinbase.com/
  api_reference: https://docs.cdp.coinbase.com/onramp/docs
  agent_docs: none
---

# @dynamic-demos/coinbase-onramp

Coinbase Onramp REST client and webhook helpers. Extracted from
`apps/dashboard/src/lib/coinbase/` in Phase 1B-coinbase-onramp.

> **Stub AGENTS.md.** Phase 3 fills in the full body sections (capabilities,
> public surface, environment, slots/invariants, integration map, examples,
> do/don't, open questions) per the AGENTS.md template. Frontmatter above is
> authoritative — the demo-registry queries it directly.

## Public surface (preview)

- `createCoinbaseOnrampClient({ env, apiKey, apiSecret })`
- `createOnrampOrder(client, params)`
- `verifyCoinbaseOnrampWebhookSignature(input)`
- `normalizeCoinbaseOnrampEvent(event)`
- `mapCoinbaseOnrampStatus(providerStatus)` (canonical state mapping is a
  stub until `packages/transactions` (Phase 1E) lands)

## Open items

- Phase 3 fills in this AGENTS.md's body sections.
- Phase 1E swaps the placeholder canonical-state union for the real
  `TransactionState` from `@dynamic-demos/transactions`.
- Phase 5A wires `verifyCoinbaseOnrampWebhookSignature` +
  `normalizeCoinbaseOnrampEvent` into the dashboard's webhook framework.
- Confirm Coinbase Onramp region coverage (currently global with US
  primary) and populate the `regions` frontmatter field in Phase 3.
