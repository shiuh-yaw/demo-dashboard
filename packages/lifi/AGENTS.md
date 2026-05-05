---
name: "@dynamic-demos/lifi"
kind: package
flow_role: bridge
custody: non-custodial
status: stable
provider:
  name: LI.FI
  docs: https://docs.li.fi/
  api_reference: https://apidocs.li.fi/
  agent_docs: none
---

# @dynamic-demos/lifi

Shared LI.FI bridge / swap integration. Wraps the public REST API at
`https://li.quest/v1` for server-side quote fetching and status polling,
plus a thin `configureLifi` helper that browser code uses to set up the
official `@lifi/sdk` for `executeRoute`.

> **Phase 3 placeholder.** Full AGENTS.md (capabilities, public surface,
> env vars, integration map, do/don't) is regenerated in Phase 3 of the
> demo-meta-system project. The frontmatter above is enough for the
> demo-registry generator to find the package; the body below summarises
> what changed in Phase 1B so reviewers don't lose context.

## Supported chains

LI.FI aggregates 25+ chains across EVM and Solana. Coverage changes as
LI.FI onboards new networks; the canonical list is at
[`https://li.quest/v1/chains`](https://apidocs.li.fi/reference/get_v1-chains).
At the time of writing the demos in this repo route over:

- **EVM:** Ethereum, Polygon, Arbitrum, Optimism, Base, BNB Chain,
  Avalanche, Linea, Scroll, zkSync Era, Polygon zkEVM, Mantle, Mode,
  Blast, Gnosis, Fantom, Celo, Aurora, Boba, Metis, Moonbeam, Moonriver.
- **Non-EVM:** Solana.

`packages/lifi` is chain-agnostic — it sends whatever `fromChainId` /
`toChainId` the caller passes through to the REST API. New chains light
up automatically once LI.FI lists them.

## What Phase 1B added

- `src/env.ts` — `LifiEnvironment` discriminator (`'sandbox' | 'production'`)
  and `resolveLifiApiUrl`. LI.FI has no separate sandbox host today, so
  both environments resolve to `https://li.quest/v1`. The seam exists so
  callers stay symmetrical with the other Phase 1B providers.
- `src/client.ts` — REST client (`createLifiClient`, `getQuote`,
  `getStatus`, `LifiError`). Extracted from
  `apps/dashboard/src/lib/services/lifi.ts`. The package never reads
  `process.env`; consumers wire `LIFI_API_KEY` in at call time per D-005.
- `src/sdk-config.ts` — `configureLifi(providers, options)` browser-side
  SDK config helper. Extracted from
  `apps/checkouts/hooks/use-lifi/utils.ts`. Sets `disableVersionCheck`
  and forwards the integrator string from the dashboard so the SDK and
  REST API stay in sync.
- `src/state-mapping.ts` — `mapLifiStatus` / `mapLifiStatusResult` map
  LI.FI's coarse `PENDING | DONE | FAILED | NOT_FOUND` enum onto a
  string-union placeholder. **TODO(phase-1e):** swap the placeholder for
  the canonical `TransactionState` import from
  `@dynamic-demos/transactions` once Phase 1E lands.
- `src/webhooks.ts` — placeholder. LI.FI does not deliver webhooks; the
  module surfaces `verifySignature` and `normalize` as no-ops so the
  package shape matches the other Phase 1B providers and so a future
  webhook product can land without restructuring imports.
- Vitest config + tests covering the public surface, REST shape, error
  surfacing, status fall-back, state mapping, and webhook placeholders.
  Tests stub `globalThis.fetch`; no real network calls.

## Sandbox-by-default (D-005)

Every public function takes an explicit `env: 'sandbox' | 'production'`
via `createLifiClient({ env, ... })`. There is no implicit default —
callers default at the call site so the choice is visible in app code.

## Hard rules (carried from D-005, D-006, D-009)

- Never log raw API keys.
- Don't import `process.env` from inside this package; consumers pass
  credentials in.
- Server-side LI.FI access goes through `client.ts` (REST). Browser-side
  route execution goes through `sdk-config.ts` + `@lifi/sdk` directly.
  The SDK is **not** used for quote / status fetching.
- `apps/spark26/` is zero-touch.

## Open questions / known gaps

- `mapLifiStatus` is a stub until Phase 1E (`packages/transactions`)
  merges. Replace the placeholder string-union with the canonical enum
  then.
- Webhook stubs are intentionally inert. If LI.FI ships a webhook
  product, replace them with real signature verification + normaliser
  in the same PR that adds the dashboard webhook handler.
- No real-network E2E tests in CI (D-023). Tests stub `globalThis.fetch`.
