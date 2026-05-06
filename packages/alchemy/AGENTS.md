---
name: "@dynamic-demos/alchemy"
kind: package
flow_role: utility
custody: n/a
status: stable
provider:
  name: Alchemy
  docs: https://www.alchemy.com/docs
  api_reference: https://docs.alchemy.com/reference
  agent_docs: none
  status_page: https://status.alchemy.com
---

# @dynamic-demos/alchemy

Read-only Alchemy API helpers used by demo apps to fetch token prices and on-chain transfer history. No keys live in the package — callers pass an `apiKey` (and `network` where relevant) at every call site so credentials stay in the consuming app or dashboard route handler.

## Provider documentation

If you are an AI agent integrating against Alchemy, **consult the provider docs first**:

- **Main docs:** [alchemy.com/docs](https://www.alchemy.com/docs)
- **API reference:** [docs.alchemy.com/reference](https://docs.alchemy.com/reference)
- **Prices API:** [Prices API docs](https://www.alchemy.com/docs/data/prices-api)
- **getAssetTransfers reference:** [getAssetTransfers](https://docs.alchemy.com/reference/alchemy-getassettransfers)
- **Status:** [status.alchemy.com](https://status.alchemy.com)

## Capabilities

- Spot prices by symbol — `getTokenPricesBySymbol`.
- Historical token prices — `getHistoricalTokenPrices`.
- Asset transfer history (ERC-20 / ERC-721 / external transfers) — `getAssetTransfers`.
- Network constant — `ALCHEMY_NETWORKS` (the supported network slugs Alchemy expects in the URL).

## Public surface

All exports are stable and live at the package root (`@dynamic-demos/alchemy`).

- `getTokenPricesBySymbol(params)` — REST `GET /prices/v1/{apiKey}/tokens/by-symbol`. (stable)
- `getHistoricalTokenPrices(params)` — REST `POST /prices/v1/{apiKey}/tokens/historical`. (stable)
- `getAssetTransfers(params, options)` — JSON-RPC `alchemy_getAssetTransfers`. (stable)
- `ALCHEMY_NETWORKS` — supported network slugs (`eth-mainnet`, `base-mainnet`, etc.). (stable)
- Type exports: `AlchemyOptions`, `AssetTransferCategory`, `GetAssetTransfersParams`, `GetAssetTransfersResponse`, `AssetTransfer`, `RawContract`, `TransferMetadata`, `GetTokenPricesBySymbolParams`, `GetHistoricalTokenPricesParams`. (stable)

## Required environment

The package itself reads no `process.env`. Consumers pass credentials per call:

- `ALCHEMY_API_KEY` — Alchemy API key — required at the consumer (e.g. `apps/proceeds`, `apps/trade`).

There is no separate sandbox host; Alchemy returns sandbox-ish data only via dedicated test networks (e.g. `eth-sepolia`). Sandbox-by-default (D-005) is enforced at the consumer by selecting test networks.

## Slots vs invariants

**Slots:**

- `network` per call (which Alchemy chain to query).
- `apiKey` per call (per-app vs dashboard-owned key).
- Pagination + filter knobs on `getAssetTransfers`.

**Invariants:**

- The package never reads `process.env`. Adding env reads breaks the "anywhere" guarantee.
- Errors surface as thrown `Error` (HTTP shape preserved in the message) — callers catch and translate.
- Asset transfer responses are returned as-is from Alchemy; no canonical-state mapping (this is read-only data, not transactions in the D-010 sense).

## Integration map

**Imports:** none (uses global `fetch`).
**Imported by:** `apps/proceeds`, `apps/remittance`, `apps/trade`.

## Examples

```ts
import { getTokenPricesBySymbol, getAssetTransfers, ALCHEMY_NETWORKS } from "@dynamic-demos/alchemy";

const prices = await getTokenPricesBySymbol({
  apiKey: process.env.ALCHEMY_API_KEY!,
  symbols: ["ETH", "USDC"],
});

const transfers = await getAssetTransfers(
  { fromAddress: "0xabc...", category: ["external", "erc20"] },
  { apiKey: process.env.ALCHEMY_API_KEY!, network: "base-mainnet" }
);
```

## Do / Don't

- Do: pass `apiKey` from a server-only env in route handlers / server components. Never expose to the browser.
- Do: use `ALCHEMY_NETWORKS` for the network slug rather than hand-typing strings.
- Don't: import this package from a client component. It calls a credentialed REST endpoint.
- Don't: cache responses in `localStorage`. Alchemy data is owner-scoped; cache server-side instead.

## Open questions / known gaps

- No retry/backoff today. Add bounded retry (with jittered exponential backoff) when a consumer hits 429 in production.
- No tests in CI. Add fetch-stubbed Vitest coverage for happy paths + the `>=400` error surface before depending on this from a new app.
- Asset transfers do not flow through `@dynamic-demos/transactions` (read-only data, not lifecycle records). If a future demo wants to *open* transactions from on-chain history, do that mapping at the consumer, not here.
