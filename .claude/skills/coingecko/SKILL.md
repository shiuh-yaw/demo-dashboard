---
name: coingecko
description: Use when the user needs to integrate CoinGecko — market data, token metadata, sparkline / market-cap / volume stats, top market coins. Triggers on "coingecko", "coin gecko", "token price list", "token metadata", "market coins", "@dynamic-demos/coingecko". Demo tier only (Pro tier is not supported by this wrapper).
---

# CoinGecko

## Where to look first

1. **Local wrapper:** `packages/coingecko/` — read its `AGENTS.md` for the public surface. Consumed directly by apps (e.g. `apps/trade`).
2. **Authoritative docs:** https://docs.coingecko.com/reference/introduction
3. **API reference:** https://docs.coingecko.com/reference

## The client and its public surface

The wrapper is functional, not a client object — every call takes an optional `apiKey` per-call. The package never reads `process.env`.

```typescript
import {
  coingeckoFetch,
  coingeckoFetchOptional,
  getMarketCoins,
  getTokenMetadata,
  getTokenStats,
} from "@dynamic-demos/coingecko";

// Top-level helpers
const list = await getMarketCoins({
  vs_currency: "usd",
  per_page: 20,
  apiKey: process.env.COIN_GECKO_API_KEY,
});

const meta = await getTokenMetadata("ethereum", {
  apiKey: process.env.COIN_GECKO_API_KEY,
  revalidate: 60, // forwarded to Next.js fetch cache
});

const stats = await getTokenStats("bitcoin", {
  apiKey: process.env.COIN_GECKO_API_KEY,
});
```

Base URL is hard-coded to `https://api.coingecko.com/api/v3` (Demo tier). The Demo API key is sent via the `x-cg-demo-api-key` header.

## Env vars

The package reads no `process.env`. Consumers pass per call:

- `COIN_GECKO_API_KEY` — CoinGecko Demo API key — optional (calls work without one but get rate-limited harder).

## Escape hatch — when the typed wrapper doesn't cover what you need

**`coingeckoFetch<T>(path, options)` and `coingeckoFetchOptional<T>(path, options)` ARE the escape hatch.** They are exported at the package root and are the canonical way to hit any CoinGecko Demo endpoint the wrapper doesn't expose:

```typescript
// Any Demo-tier endpoint, with auth + base URL handled
const trending = await coingeckoFetch<TrendingResponse>(
  "/search/trending",
  { apiKey: process.env.COIN_GECKO_API_KEY },
);

// Optional variant: returns null on non-2xx (use for endpoints where 404 is expected)
const maybe = await coingeckoFetchOptional<TokenMeta>(
  `/coins/${slug}`,
  { apiKey: process.env.COIN_GECKO_API_KEY, revalidate: 300 },
);
```

Prefer `coingeckoFetch` to hand-rolling another `fetch("https://api.coingecko.com/...")` call site.

## Promote to typed only when…

Same three-tier rule as Fireblocks: prefer the typed `getMarketCoins` / `getTokenMetadata` / `getTokenStats` > `coingeckoFetch` escape hatch > raw `fetch`. Only promote a raw call to a typed module under `packages/coingecko/src/` when (a) multiple demos need it AND (b) the operation has a uniform shape.

## Out of scope / things this wrapper does NOT do

- **Pro tier is NOT supported.** Pro uses a different host and header. If a demo upgrades to Pro, extend `CoinGeckoOptions` with a `tier: "demo" | "pro"` discriminator and route the base URL accordingly — don't paper over it at the call site.
- No retry / backoff. CoinGecko rate-limits aggressively on the free tier — consumers should debounce + revalidate-cache rather than retry tight loops.
- Read-only. The package writes nothing.

## Common gotchas

- Don't call from a client component — CoinGecko's CORS is restrictive and the key still leaks.
- Coin slugs (`coinId`) occasionally get renamed by CoinGecko. Surface "not found" gracefully via `coingeckoFetchOptional` rather than letting the throw bubble.
- `coingeckoFetchOptional` returns `null` on any non-2xx (not just 404) — the swallowing is broad. If the caller needs to distinguish 404 from 500, use `coingeckoFetch` and catch.
- The `revalidate` option is forwarded as the Next.js fetch cache tag — prefer it over wrapping calls in your own cache.
