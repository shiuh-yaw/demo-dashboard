---
name: "@dynamic-demos/polymarket"
kind: package
flow_role: utility
custody: n/a
status: stable
provider:
  name: Polymarket
  docs: https://docs.polymarket.com/
  api_reference: https://docs.polymarket.com/quickstart/introduction/main
  agent_docs: none
  status_page: none
---

# @dynamic-demos/polymarket

Read-only Polymarket Gamma + CLOB API helpers — events, markets, prediction-event details, and price history — used by `apps/trade`'s prediction-market surfaces. Wraps `https://gamma-api.polymarket.com` (events / markets metadata) and the CLOB price-history endpoint. No `process.env` reads in the package.

## Provider documentation

If you are an AI agent integrating against Polymarket, **consult the provider docs first**:

- **Main docs:** [docs.polymarket.com](https://docs.polymarket.com/)
- **Quickstart / API reference:** [docs.polymarket.com/quickstart](https://docs.polymarket.com/quickstart/introduction/main)
- **Gamma API:** [gamma-api.polymarket.com](https://gamma-api.polymarket.com) (no formal Swagger; the helpers in this package codify what the demos use).

Polymarket APIs are **public read-only** — no API key required. Trading flows (placing orders) require an authenticated CLOB session and a USDC balance on Polygon, neither of which this package exposes today (read-only, by design).

## Capabilities

- Generic typed fetcher — `polymarketFetch(path, options)`.
- Event listings — `getPolymarketEvents(params)`, `getPolymarketEventBySlug(slug)`.
- Market listings — `getPolymarketMarkets(params)`.
- Curated tag slugs — `POLYMARKET_TAG_SLUGS` (politics, crypto, sports, etc.).
- Time-remaining helper — `calculateTimeRemaining(endDate)`.
- CLOB price history — `getPricesHistory(params)`, `computePriceChange(history)`.
- Zod schemas — `polymarketMarketSchema`, `eventsResponseSchema`, etc., for validating provider payloads at the boundary.

## Public surface

All exports are stable and live at the package root (`@dynamic-demos/polymarket`).

- `polymarketFetch<T>(path, options)` — typed fetcher (Zod-validated where applicable). (stable)
- `getPolymarketEvents(params)`, `getPolymarketEventBySlug(slug)` — Gamma `/events` listings. (stable)
- `getPolymarketMarkets(params)` — Gamma `/markets`. (stable)
- `POLYMARKET_TAG_SLUGS` — the tag set demos pin against. (stable)
- `getPricesHistory(params)`, `computePriceChange(points)` — CLOB price-series helpers. (stable)
- `calculateTimeRemaining(date)` — UI helper for countdown labels. (stable)
- Schemas: `polymarketMarketSchema`, `polymarketMarketTransformedSchema`, `marketsResponseSchema`, `eventsResponseSchema`, `polymarketEventSchema`, `imageOptimizationSchema`. (stable)
- Types: `PolymarketMarket`, `PolymarketMarketTransformed`, `PolymarketEventTransformed`, `ImageOptimization`, `PricePoint`, `PricesHistoryResponse`, `PricesHistoryInterval`, `GetPricesHistoryParams`, `GetPolymarketEventsParams`. (stable)

## Dashboard API surface

No dashboard API endpoints expose this package — apps import `@dynamic-demos/polymarket` directly. Reason: Polymarket Gamma + CLOB price endpoints are fully public and unauthenticated; there is no credential to protect and no per-demo configuration. Apps fetch on the server (Zod validation is sync) and hand JSON to the client. If a future demo needs authenticated CLOB trading, that's a separate package with its own custody story — not a dashboard surface bolted onto this read-only one.

## Required environment

None. Polymarket Gamma + CLOB price endpoints are public.

## Slots vs invariants

**Slots:**

- Tag filter (any slug from `POLYMARKET_TAG_SLUGS`).
- Pagination params (`limit`, `offset`, `order`).
- CLOB price-history `interval` (1h, 6h, 1d, 1w).

**Invariants:**

- Read-only. No order placement, no auth, no signing.
- Provider payloads are validated through Zod schemas at the boundary; consumers see typed `Transformed` shapes, never raw provider objects.
- The package never reads `process.env`.
- Errors surface via `polymarketFetch` throwing. Schema-validation errors include the Zod issue path for debugging.

## Integration map

**Imports:** `zod`.
**Imported by:** `apps/trade` (predictions pages, prediction event cards, charts, hooks).

## Examples

```ts
import {
  getPolymarketEvents,
  getPolymarketEventBySlug,
  computePriceChange,
  getPricesHistory,
} from "@dynamic-demos/polymarket";

const events = await getPolymarketEvents({ limit: 24, tag_slug: "politics" });
const event = await getPolymarketEventBySlug("us-election-2028");

const history = await getPricesHistory({ market: event.markets[0].clobTokenIds[0], interval: "1d" });
const change = computePriceChange(history.history);
```

## Do / Don't

- Do: cache list responses with Next.js `revalidate` (the helpers forward the tag).
- Do: prefer `*Transformed` types in components — they match the snake → camelCase shape used in JSX.
- Don't: try to place orders here. Trading flows belong in a future package wrapping the CLOB authenticated API; today this is read-only.
- Don't: call from a client component during SSR — schema validation is synchronous and may reject on partial provider rollouts. Fetch on the server, hand JSON to the client.

## Open questions / known gaps

- No tests in CI. Add Zod-fixture Vitest coverage for the listing endpoints + price-history math (`computePriceChange`) before relying on a fifth caller.
- No retry/backoff. Polymarket Gamma is generally fast but does occasionally return 502 during deploys; consumers should fall back gracefully.
- Authenticated CLOB (placing orders) is intentionally out of scope. If a demo wants to bet, that's a separate package with its own custody story.
