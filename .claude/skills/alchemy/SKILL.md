---
name: alchemy
description: Use when the user needs to integrate Alchemy — spot token prices, historical token prices, on-chain asset transfer history (ERC-20 / ERC-721 / external). Triggers on "alchemy", "token price", "asset transfers", "getAssetTransfers", "alchemy_getAssetTransfers", "@dynamic-demos/alchemy". Read-only data only — not a wallet or signing surface.
---

# Alchemy

## Where to look first

1. **Local wrapper:** `packages/alchemy/` — read its `AGENTS.md` for the public surface. The package is consumed directly by apps; no dashboard proxy.
2. **Authoritative docs:** https://www.alchemy.com/docs
3. **API reference:** https://docs.alchemy.com/reference
4. **Prices API:** https://www.alchemy.com/docs/data/prices-api
5. **getAssetTransfers reference:** https://docs.alchemy.com/reference/alchemy-getassettransfers

## The client and its public surface

The wrapper is functional, not a client object — every call takes `{ apiKey, network }` per-call. The package never reads `process.env`; the caller passes credentials at every site.

```typescript
import {
  getTokenPricesBySymbol,
  getHistoricalTokenPrices,
  getAssetTransfers,
  ALCHEMY_NETWORKS,
} from "@dynamic-demos/alchemy";

// Spot prices — REST GET /prices/v1/{apiKey}/tokens/by-symbol
const prices = await getTokenPricesBySymbol({
  apiKey: process.env.ALCHEMY_API_KEY!,
  symbols: ["ETH", "USDC"],
});

// Historical prices — REST POST /prices/v1/{apiKey}/tokens/historical
const history = await getHistoricalTokenPrices({
  apiKey: process.env.ALCHEMY_API_KEY!,
  // ...
});

// Asset transfers — JSON-RPC alchemy_getAssetTransfers
const transfers = await getAssetTransfers(
  { fromAddress: "0xabc...", category: ["external", "erc20"] },
  { apiKey: process.env.ALCHEMY_API_KEY!, network: "base-mainnet" },
);
```

Use the `ALCHEMY_NETWORKS` constant for network slugs (`eth-mainnet`, `base-mainnet`, etc.) rather than hand-typing strings.

## Env vars

The package reads no `process.env`. Consumers pass per call:

- `ALCHEMY_API_KEY` — Alchemy API key — required at consumer (e.g. `apps/proceeds`, `apps/remittance`, `apps/trade`).

Sandbox-by-default (D-005) is enforced at the consumer by selecting Alchemy test networks (e.g. `eth-sepolia`) — Alchemy has no separate sandbox host.

## Escape hatch — when the typed wrapper doesn't cover what you need

There is **no escape hatch on disk today**. Alchemy exposes dozens of JSON-RPC methods (NFT API, Webhooks, Notify, Transact, Subscription, full archive node) that this wrapper does NOT expose. If you need one:

- **Short-term:** call the upstream JSON-RPC / REST directly with `fetch` against `https://${network}.g.alchemy.com/v2/${apiKey}/...`. The auth pattern is "API key in the URL path" — there is no signing.
- **Medium-term:** if multiple demos need the same method with a uniform shape, promote it to the wrapper (mirror `getAssetTransfers` — typed params, typed response, network slug from `ALCHEMY_NETWORKS`).

## Promote to typed only when…

Same three-tier rule as Fireblocks: prefer the typed wrapper > raw `fetch` to Alchemy > custom code per consumer. Only promote a raw call to a typed wrapper module when (a) multiple demos need the same operation AND (b) the operation has a uniform shape.

## Out of scope / things this wrapper does NOT do

- NFT API, Webhooks / Notify, Subscription (eth_subscribe), debug_*, trace_*. Call these via raw `fetch` if needed.
- No retry / backoff. Hitting 429s in production is a consumer responsibility (debounce + jittered exponential backoff).
- Asset transfers do NOT flow through `@dynamic-demos/transactions`. This is read-only on-chain data, not lifecycle records.

## Common gotchas

- Never import this package from a client component — it carries a server-only `ALCHEMY_API_KEY`.
- Never cache responses in `localStorage` — Alchemy data is owner-scoped, cache server-side instead.
- Errors throw as native `Error` with the HTTP status preserved in the message — callers translate.
- `ALCHEMY_NETWORKS` is the source of truth for valid network slugs. Hand-typed strings (`"ethereum"`, `"base"`) will fail silently.
