---
name: polymarket
description: Use when the user needs to integrate Polymarket — prediction-market events, markets, market metadata, CLOB price history (read-only). Triggers on "polymarket", "prediction market", "polymarket events", "clob price history", "@dynamic-demos/polymarket". Public read-only data — no API key, no auth. Authenticated CLOB order placement is intentionally out of scope.
---

# Polymarket

## Where to look first

1. **Local wrapper:** `packages/polymarket/` — read its `AGENTS.md` for the public surface. Consumed directly by apps (`apps/trade`).
2. **Authoritative docs:** https://docs.polymarket.com/
3. **API reference / Quickstart:** https://docs.polymarket.com/quickstart/introduction/main
4. **Gamma API host (no formal Swagger):** https://gamma-api.polymarket.com

## The client and its public surface

The wrapper hits **two hosts**: Gamma (events / markets metadata) and CLOB (price history). Both are public read-only — no API key required.

```typescript
import {
  // Gamma host: gamma-api.polymarket.com
  polymarketFetch,
  getPolymarketEvents,
  getPolymarketEventBySlug,
  getPolymarketMarkets,
  POLYMARKET_TAG_SLUGS,
  calculateTimeRemaining,

  // CLOB host: clob.polymarket.com
  getPricesHistory,
  computePriceChange,
} from "@dynamic-demos/polymarket";

// Gamma — events + markets
const events = await getPolymarketEvents({ limit: 24, tag_slug: "politics" });
const event = await getPolymarketEventBySlug("us-election-2028");
const markets = await getPolymarketMarkets({ /* params */ });

// CLOB — price history
const history = await getPricesHistory({
  market: event.markets[0].clobTokenIds[0],
  interval: "1d", // "1h" | "6h" | "1d" | "1w"
});
const change = computePriceChange(history.history);

// UI helper
const remaining = calculateTimeRemaining(endDate);
```

Provider payloads are validated through Zod schemas at the boundary (`polymarketMarketSchema`, `eventsResponseSchema`, etc.) — consumers see typed `Transformed` shapes (camelCase), never raw provider objects.

## Env vars

**None.** Polymarket Gamma + CLOB price endpoints are public.

## Escape hatch — when the typed wrapper doesn't cover what you need

**`polymarketFetch<T>(path)` IS the escape hatch — but only for the Gamma host (`gamma-api.polymarket.com`).** Use it to hit any Gamma endpoint the typed helpers don't expose:

```typescript
// Any Gamma endpoint, base URL handled
const trending = await polymarketFetch<TrendingResponse>("/trending");
```

**There is no escape hatch for the CLOB host (`clob.polymarket.com`)** — `getPricesHistory` is the only typed CLOB call, and the base URL is hard-coded inside `clob.ts`. If you need a CLOB endpoint that isn't price history:

- Call upstream directly with `fetch` against `https://clob.polymarket.com/...`.
- Or extend the wrapper — add a typed CLOB helper in `packages/polymarket/src/clob.ts` and submit a PR.

## Promote to typed only when…

Same three-tier rule as Fireblocks: prefer typed helpers > `polymarketFetch` (Gamma only) > raw `fetch` to CLOB > custom code per consumer. Only promote a raw call when (a) multiple demos need it AND (b) the operation has a uniform shape.

## Out of scope / things this wrapper does NOT do

- **Authenticated CLOB order placement is intentionally out of scope.** Trading flows require signing, USDC on Polygon, and CLOB session auth — that's a separate package with its own custody story.
- Order books / order management / position tracking. Not exposed today.
- Webhooks. Polymarket doesn't deliver them; nothing to wrap.

## Common gotchas

- **Don't try to place orders here.** This is read-only by design. If a demo wants to bet on Polymarket, plan a new package with the CLOB authenticated API + Polygon wallet integration.
- Don't call from a client component during SSR — schema validation is synchronous and may reject on partial provider rollouts. Fetch on the server, hand JSON to the client.
- Coin slugs / event slugs occasionally get renamed by Polymarket. Surface "not found" gracefully.
- Gamma occasionally returns 502 during deploys; consumers should fall back gracefully (no retry/backoff in the wrapper).
- Prefer `*Transformed` types in components — they match the snake → camelCase shape used in JSX. Raw schemas are at the boundary only.
