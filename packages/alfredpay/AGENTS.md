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

> Stub AGENTS.md authored in Phase 1B. Full content (capabilities, public
> surface, environment, slots/invariants, integration map, examples,
> do/don't, open questions) lands in Phase 3.

The frontmatter above is **stable** and authoritative — the demo registry
generator queries `regions` and `provider.*` from this file starting in
Phase 3, so do not move/rename those fields.

## Provider documentation

- **Main docs:** https://alfredpay.io/documentation
- **API reference:** https://alfredpay.readme.io
- **Agent / LLM docs:** none published.

## What this is

Direct REST integration for alfredPay (LATAM payment processor). The
Fireblocks-mediated DVP path for the same partner lives separately at
`packages/fireblocks/src/providers/alfredpay.ts` (Phase 1A). This package
is the **direct REST** path — see `DECISIONS.md` D-009.

## Open items

- Phase 3 fills in capabilities / public surface / examples / do-don't.
- Phase 1E replaces the placeholder canonical-state enum in `state-mapping.ts`
  with a re-export from `@dynamic-demos/transactions`.
- Phase 5A wires the dashboard's `/api/webhooks/alfredpay` route to this
  package's `webhooks.verifySignature` + `webhooks.normalize`.
- Phase 5B routes the dashboard's `/api/orchestrate/offramp` to
  `createOfframp` for `BR | MX | CO | AR | SV | US` corridors.
