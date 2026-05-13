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
  status_page: none
---

# @dynamic-demos/lifi

Shared LI.FI bridge / swap integration. Wraps the public REST API at `https://li.quest/v1` for server-side quote fetching and status polling, plus a thin `configureLifi` helper that browser code uses to set up the official `@lifi/sdk` for `executeRoute`. LI.FI is non-custodial — the user's wallet signs and submits the bridge transaction; the package never holds funds.

## Provider documentation

If you are an AI agent integrating against LI.FI, **consult the provider docs first**:

- **Main docs:** [docs.li.fi](https://docs.li.fi/)
- **API reference:** [apidocs.li.fi](https://apidocs.li.fi/)
- **Live chain list:** [`/v1/chains`](https://apidocs.li.fi/reference/get_v1-chains) — the source of truth for currently supported chains.

## Supported chains

LI.FI aggregates 25+ chains across EVM and Solana. Coverage changes as LI.FI onboards new networks; the canonical list is at [`https://li.quest/v1/chains`](https://apidocs.li.fi/reference/get_v1-chains). At the time of writing the demos route over:

- **EVM:** Ethereum, Polygon, Arbitrum, Optimism, Base, BNB Chain, Avalanche, Linea, Scroll, zkSync Era, Polygon zkEVM, Mantle, Mode, Blast, Gnosis, Fantom, Celo, Aurora, Boba, Metis, Moonbeam, Moonriver.
- **Non-EVM:** Solana.

The package is chain-agnostic — it forwards whatever `fromChainId` / `toChainId` the caller passes. New chains light up automatically once LI.FI lists them.

## Capabilities

- REST client — `createLifiClient`, `getQuote`, `getStatus`, `LifiError`. Used server-side from dashboard route handlers.
- Browser SDK config — `configureLifi(providers, options)`. Sets `disableVersionCheck` and forwards the integrator string so REST quotes and SDK execution stay aligned.
- Environment seam — `LifiEnvironment` (`'sandbox' | 'production'`) and `resolveLifiApiUrl`. LI.FI has no separate sandbox host today; both resolve to `https://li.quest/v1`. The seam exists so callers stay symmetrical with other Phase 1B providers.
- State mapping — `mapLifiStatus`, `mapLifiStatusResult` translate LI.FI's `PENDING | DONE | FAILED | NOT_FOUND` enum onto the canonical placeholder (Phase 1E rebinds to `TransactionState`).
- Webhook stubs — `webhooks.verifySignature`, `webhooks.normalize`. LI.FI does not deliver webhooks today; the no-ops keep the package shape symmetric with the other providers and let a future webhook product land without restructuring imports.

## Public surface

All exports are stable and live at the package root.

- `createLifiClient`, `getQuote`, `getStatus`, `LifiError`. (stable)
- `LifiEnvironment`, `resolveLifiApiUrl`. (stable)
- `configureLifi` — browser-side `@lifi/sdk` config helper. (stable)
- `mapLifiStatus`, `mapLifiStatusResult`. (stable, rebinds in Phase 1E)
- `webhooks.verifySignature`, `webhooks.normalize` — no-op placeholders. (stable)

## Dashboard API surface

No dedicated `/api/lifi/*` endpoints expose this package. LI.FI is composed inside higher-level dashboard surfaces:

- `POST /api/checkouts/[id]/transactions/[txId]/quote` — internally calls `getQuote` against LI.FI to price a checkout bridge/swap leg.
- Internal worker route — polls LI.FI `getStatus` to advance bridge transactions.

For browser-side route execution, demos import `configureLifi` from this package directly (the SDK signs and submits via the user's wallet — no dashboard proxy adds value, see "Invariants").

When a future demo needs a generic LI.FI quote/status surface (e.g. cross-demo bridge widget), add `/api/lifi/{quote,status}` route handlers and document them here.

## Required environment

The package reads no `process.env` — callers pass credentials at call time per D-005.

- `LIFI_API_KEY` — LI.FI API key — required at the consumer (dashboard runtime). LI.FI rate-limits unauthenticated traffic aggressively.
- `LIFI_INTEGRATOR` — integrator string — optional; recommended for partner-tier rate limits.

## Slots vs invariants

**Slots:** `fromChainId` / `toChainId`, token addresses, integrator string, slippage, order preferences (cheapest, fastest, recommended).

**Invariants:**

- Server-side LI.FI access goes through `client.ts` (REST). Browser-side route execution goes through `sdk-config.ts` + `@lifi/sdk` directly. The SDK is **not** used for quote / status fetching.
- Sandbox-by-default: every public function takes an explicit `env: 'sandbox' | 'production'`. No implicit default — callers default at the call site so the choice is visible.
- Non-custodial: the bridge transaction is signed and submitted by the user's wallet; LI.FI never holds funds.
- Server-side quote/status access is dashboard-only (D-001/D-003); demos call the higher-level dashboard endpoints listed in "Dashboard API surface" above. Browser-side `configureLifi` is the one exception (SDK self-signs; no secret involved).
- The package never reads `process.env`. Adding env reads breaks the "anywhere" guarantee.

## Integration map

**Imports:** none (uses global `fetch`).
**Imported by:** `apps/dashboard` (orchestration), `apps/checkouts` (`configureLifi` for browser-side `executeRoute` only — no quote/status; those go through dashboard).

## Examples

```ts
// Server-side: quote + status
import { createLifiClient, getQuote, getStatus } from "@dynamic-demos/lifi";

const client = createLifiClient({ env: "sandbox", apiKey: process.env.LIFI_API_KEY });

const quote = await getQuote(client, {
  fromChain: 1, // Ethereum
  toChain: 8453, // Base
  fromToken: "0xA0b8...", // USDC mainnet
  toToken: "0x8335...", // USDC base
  fromAmount: "1000000", // 1 USDC, 6 decimals
  fromAddress: "0xabc...",
});

const status = await getStatus(client, { txHash: "0xdef..." });
```

```ts
// Browser-side: SDK setup once at app boot
import { configureLifi } from "@dynamic-demos/lifi";
configureLifi([/* wallet providers */], { integrator: "demo-checkouts" });
```

## Do / Don't

- Do: route server-side quote + status through the dashboard endpoints in "Dashboard API surface" above. The dashboard owns `LIFI_API_KEY` (D-003).
- Do: keep `configureLifi(...)` to one call at app boot. The SDK self-registers — re-calling fights itself.
- Don't: import this package's `client.ts` from a browser bundle.
- Don't: assume LI.FI sandbox vs production differ — they're the same host today. The seam is for future-proofing, not behavior.

## Open questions / known gaps

- `mapLifiStatus` is a placeholder until Phase 1E rebinds it to the canonical `TransactionState` from `@dynamic-demos/transactions`.
- Webhook stubs are intentionally inert. Replace with real signature verification + normaliser if LI.FI ships a webhook product.
- No real-network E2E tests in CI (D-023). Tests stub `globalThis.fetch`.
- LI.FI's chain list mutates over time — consumers caching the result of `/v1/chains` should set a short TTL.
