---
name: lifi
description: Use when the user needs to integrate LI.FI — cross-chain bridge quote, swap quote, route execution, status polling across 25+ EVM chains plus Solana. Triggers on "lifi", "li.fi", "cross-chain swap", "bridge quote", "executeRoute", "@lifi/sdk", "@dynamic-demos/lifi". Non-custodial: the user's wallet signs and submits the bridge transaction.
---

# LI.FI

## Where to look first

1. **Local wrapper:** `packages/lifi/` — read its `AGENTS.md` for the public surface. Dashboard owns server-side credentials (D-003); browser-side uses the `configureLifi` helper to set up `@lifi/sdk`.
2. **Authoritative docs:** https://docs.li.fi/
3. **API reference:** https://apidocs.li.fi/
4. **Live chain list (source of truth):** https://li.quest/v1/chains

## The client and its public surface — two halves

LI.FI integration is intentionally split:

```typescript
// === Server-side: quote + status via REST ===
import { createLifiClient, getQuote, getStatus, LifiError } from "@dynamic-demos/lifi";

const client = createLifiClient({
  env: "sandbox", // or "production" — both currently resolve to https://li.quest/v1
  apiKey: process.env.LIFI_API_KEY,
});

const quote = await getQuote(client, {
  fromChain: 1,        // Ethereum
  toChain: 8453,       // Base
  fromToken: "0xA0b8...",  // USDC mainnet
  toToken: "0x8335...",    // USDC base
  fromAmount: "1000000",   // 1 USDC, 6 decimals
  fromAddress: "0xabc...",
});

const status = await getStatus(client, { txHash: "0xdef..." });

// === Browser-side: route execution via @lifi/sdk ===
import { configureLifi } from "@dynamic-demos/lifi";

// One-time setup at app boot
configureLifi([/* wallet providers */], { integrator: "demo-checkouts" });

// Then call @lifi/sdk's executeRoute directly with the quote
```

**Important separation:**
- Server-side LI.FI access goes through `client.ts` (REST). Quote + status only.
- Browser-side route execution goes through `sdk-config.ts` + `@lifi/sdk` directly.
- The SDK is **not** used for quote / status fetching.

## Env vars

The package reads no `process.env` — callers pass credentials at call time:

- `LIFI_API_KEY` — LI.FI API key — required at the consumer (dashboard runtime). LI.FI rate-limits unauthenticated traffic aggressively.
- `LIFI_INTEGRATOR` — integrator string — optional but recommended for partner-tier rate limits.

## Escape hatch — when the typed wrapper doesn't cover what you need

There is **no escape hatch on disk today**. The REST surface is intentionally narrow — `getQuote` + `getStatus`. LI.FI has many more endpoints (`/v1/chains`, `/v1/tools`, `/v1/connections`, `/v1/tokens`, etc.).

If you need them:

- **Server-side:** call upstream directly with `fetch` against `https://li.quest/v1/...`. Auth is `x-lifi-api-key: ${apiKey}`.
- **Browser-side:** prefer the official `@lifi/sdk` once `configureLifi` has been called — it covers most discovery endpoints typed.
- **Promote** to the wrapper when (a) multiple demos hit the same endpoint AND (b) the shape is uniform — extend `client.ts` similarly to `getQuote`.

## Promote to typed only when…

Same three-tier rule as Fireblocks: prefer the typed `getQuote` / `getStatus` > raw `fetch` to `li.quest/v1` (server) or `@lifi/sdk` (browser) > rolling another wrapper. Only promote a raw call when (a) multiple demos need it AND (b) the operation has a uniform shape.

## Webhooks

LI.FI **does not deliver webhooks today.** The package exports `webhooks.verifySignature` / `webhooks.normalize` as **inert no-ops** by design — they keep the import shape symmetric with the other Phase 1B providers (alfredpay, blindpay, coinbase-onramp, iron) so a future webhook product can land without restructuring consumer imports.

Don't try to wire these into the dashboard webhook framework expecting deliveries.

## Out of scope / things this wrapper does NOT do

- Direct invocation from `apps/*` for **server-side** quote/status. Apps go through `/api/orchestrate/swap` (D-001 / D-003).
- Browser-side `configureLifi` is the only sanctioned import from `apps/*`. Don't import `client.ts` from a browser bundle.
- Sandbox host. LI.FI has no separate sandbox host; both `env` values resolve to `https://li.quest/v1`. The `env` seam exists to stay symmetric with other providers — not because behavior differs.

## Common gotchas

- **Sandbox vs production resolve to the same host today.** The `env` parameter is a forward-compat seam, not a behavior switch.
- `configureLifi(...)` should be called **once at app boot**. The SDK self-registers — re-calling fights itself.
- LI.FI's chain list mutates over time. Consumers caching the result of `/v1/chains` should set a short TTL.
- `mapLifiStatus` / `mapLifiStatusResult` are placeholders until Phase 1E rebinds them to `TransactionState` from `@dynamic-demos/transactions`.
- The bridge transaction is signed by the **user's wallet** — LI.FI never holds funds. Don't confuse with custodial bridges.
