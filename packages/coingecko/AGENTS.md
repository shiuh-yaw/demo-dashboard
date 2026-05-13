---
name: "@dynamic-demos/coingecko"
kind: package
flow_role: utility
custody: n/a
status: stable
provider:
  name: CoinGecko
  docs: https://docs.coingecko.com/reference/introduction
  api_reference: https://docs.coingecko.com/reference
  agent_docs: none
  status_page: https://status.coingecko.com
---

# @dynamic-demos/coingecko

Read-only CoinGecko API helpers — market data, token metadata, and price stats — used by demo apps that surface a token list or asset details. The package wraps `https://api.coingecko.com/api/v3`. No `process.env` reads inside the package; callers pass an optional demo `apiKey` per call.

## Provider documentation

If you are an AI agent integrating against CoinGecko, **consult the provider docs first**:

- **Main docs:** [docs.coingecko.com](https://docs.coingecko.com/reference/introduction)
- **API reference:** [docs.coingecko.com/reference](https://docs.coingecko.com/reference)
- **Status:** [status.coingecko.com](https://status.coingecko.com)

CoinGecko has two tiers: **Demo** (free, header `x-cg-demo-api-key`) and **Pro** (paid, separate host). This package targets the **Demo** tier; if a demo upgrades to Pro, swap the base URL and header at the call site (or extend the client to take a tier discriminator).

## Capabilities

- Generic typed fetcher — `coingeckoFetch(path, options)` and `coingeckoFetchOptional(path, options)` (the latter swallows expected 4xx and returns `null`).
- Top market coins — `getMarketCoins(params)` (supports vs-currency, ids, page, per_page).
- Token metadata (name, image, links, description) — `getTokenMetadata(coinId, options)`.
- Token stats (sparkline, ath/atl, market cap, volume) — `getTokenStats(coinId, options)`.

## Public surface

All exports are stable and live at the package root (`@dynamic-demos/coingecko`).

- `coingeckoFetch<T>(path, options)` — typed fetch helper that throws on non-2xx. (stable)
- `coingeckoFetchOptional<T>(path, options)` — same but returns `null` on 404. (stable)
- `getMarketCoins(params)` — `GET /coins/markets`. (stable)
- `getTokenMetadata(coinId, options)` — `GET /coins/{id}`. (stable)
- `getTokenStats(coinId, options)` — `GET /coins/{id}/market_chart` shape. (stable)
- Types: `CoinGeckoOptions`, `MarketCoin`, `GetMarketCoinsParams`, `TokenMetadata`, `TokenStats`. (stable)

## Dashboard API surface

No dashboard API endpoints expose this package — apps import `@dynamic-demos/coingecko` directly. Reason: CoinGecko's Demo tier is public read-only (the key is rate-limit identity, not auth), and consumers cache through Next.js `revalidate`. Dashboard proxying would add a hop without changing the security model. Server-only — never call from a browser bundle (the rate-limit key still leaks).

## Required environment

The package reads no `process.env`. Consumers pass credentials per call:

- `COIN_GECKO_API_KEY` — CoinGecko Demo API key — optional at the consumer (calls work without one but get rate-limited harder).

## Slots vs invariants

**Slots:**

- Optional `apiKey` per call.
- Caller-controlled query params (vs_currency, page size, ids, etc.).
- Optional `next/cache` `revalidate` tag forwarded via the options object.

**Invariants:**

- Single base URL: `https://api.coingecko.com/api/v3`. Switching to Pro requires a deliberate change.
- Errors throw with the HTTP status preserved; `*Optional` variants return `null` on 404 only — other failures still throw.
- Read-only. The package writes nothing.

## Integration map

**Imports:** none (uses global `fetch`).
**Imported by:** `apps/trade` (predictions, market list, token metadata, token stats).

## Examples

```ts
import { getMarketCoins, getTokenMetadata } from "@dynamic-demos/coingecko";

const list = await getMarketCoins({
  vs_currency: "usd",
  per_page: 20,
  apiKey: process.env.COIN_GECKO_API_KEY,
});

const meta = await getTokenMetadata("ethereum", {
  apiKey: process.env.COIN_GECKO_API_KEY,
  revalidate: 60,
});
```

## Do / Don't

- Do: cache responses with Next.js `revalidate` (the helpers forward the tag).
- Do: keep keys in server-only env. The Demo header still identifies your account.
- Don't: call from a client component. CoinGecko's CORS rules are restrictive and the key still leaks.
- Don't: assume a coinId is stable — CoinGecko occasionally renames slugs. Surface "not found" gracefully via `coingeckoFetchOptional`.

## Open questions / known gaps

- No tests in CI. Add fetch-stubbed Vitest coverage for the four entry points before adding a fifth.
- No Pro-tier support. If a demo demands Pro (higher rate limits, different host), extend `CoinGeckoOptions` with a `tier: "demo" | "pro"` discriminator and route the base URL accordingly.
- No retry/backoff. CoinGecko rate-limits aggressively on the free tier — consumers should debounce and revalidate-cache rather than retry tight loops.
