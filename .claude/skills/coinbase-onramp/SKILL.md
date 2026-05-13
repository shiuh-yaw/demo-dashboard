---
name: coinbase-onramp
description: Use when the user needs to integrate Coinbase Onramp — hosted onramp flow (fiat → crypto, USD/GBP/CAD/AUD/EUR via card/ACH/Apple Pay/SEPA), CDP-signed REST, payment-link redirect, signed webhook events. Triggers on "coinbase onramp", "CDP onramp", "buy crypto", "hosted onramp", "apple pay onramp", "@dynamic-demos/coinbase-onramp". Non-custodial: settlement lands directly in the user's Dynamic wallet.
---

# Coinbase Onramp

## Where to look first

1. **Local wrapper:** `packages/coinbase-onramp/` — read its `AGENTS.md` for the public surface. Dashboard-side only (D-003); demo apps never import it.
2. **Authoritative docs:** https://docs.cdp.coinbase.com/
3. **API reference (Onramp):** https://docs.cdp.coinbase.com/onramp/docs
4. **Supported countries (mutates over time):** https://docs.cdp.coinbase.com/onramp/docs/supported-countries

## The client and its public surface

```typescript
import { createCoinbaseOnrampClient, createOnrampOrder } from "@dynamic-demos/coinbase-onramp";

const client = createCoinbaseOnrampClient({
  env: "sandbox", // or "production"
  apiKey: process.env.COINBASE_ONRAMP_API_KEY!,        // CDP API key id
  apiSecret: process.env.COINBASE_ONRAMP_API_SECRET!,  // CDP API secret (PEM ECDSA)
});

// Create a hosted onramp order. Returns a payment_link the end-user is redirected to.
const order = await createOnrampOrder(client, {
  destinationWallet: "0xabc...",
  asset: "USDC",
  amountUsd: "50.00",
  corridor: { country: "US", currency: "USD", rail: "card" },
});
// redirect end-user → order.payment_link

// Webhooks (HMAC-SHA256)
import {
  COINBASE_ONRAMP_SIGNATURE_HEADER,
  verifyCoinbaseOnrampWebhookSignature,
  normalizeCoinbaseOnrampEvent,
} from "@dynamic-demos/coinbase-onramp";
```

Authentication uses the official `@coinbase/cdp-sdk` JWT helper (`generateJwt`). Tokens are short-lived (default 120s) and scoped to a single **method + host + path** tuple — this is Coinbase's signing requirement, not arbitrary.

Supported corridors (frontmatter / `regions` is the source of truth): US/CARD/ACH/APPLE_PAY, GB/CARD, CA/CARD, AU/CARD, EU/CARD/SEPA.

## Env vars

The package reads no `process.env` directly — credentials live at the dashboard (D-003):

- `COINBASE_ONRAMP_API_KEY` — CDP API key id — required.
- `COINBASE_ONRAMP_API_SECRET` — CDP API secret (PEM-formatted ECDSA) — required.
- `COINBASE_ONRAMP_ENVIRONMENT` — `sandbox` | `production` — optional, defaults to sandbox (D-005).
- `COINBASE_ONRAMP_WEBHOOK_SECRET` — for signature verification — required when wiring receiver.

## Escape hatch — when the typed wrapper doesn't cover what you need

There is **no escape hatch exposed today**. The package surface is the single top-level function `createOnrampOrder` plus webhook helpers — there is no equivalent of `client.request(...)`.

If you need a CDP endpoint that isn't `createOnrampOrder`:

- **Do NOT reimplement the JWT signing** in another file. The CDP JWT requires ECDSA over PEM secret material + per-method + per-host + per-path scoping. Getting this wrong is a silent auth failure.
- Open an issue / request adding a typed wrapper, OR factor out the signing helper from `client.ts` and expose `client.request(...)` as a follow-up PR. Until then, this package's surface is closed by design.

## Promote to typed only when…

Same three-tier rule as Fireblocks: prefer the typed `createOnrampOrder` > add a typed wrapper for new endpoints > never roll signing by hand. Only promote a raw call when (a) multiple demos need it AND (b) the operation has a uniform shape.

## Out of scope / things this wrapper does NOT do

- Offramp (crypto → fiat). Coinbase has offramp products; not in this package.
- Direct invocation from `apps/*`. Apps go through `/api/orchestrate/onramp` (D-001 / D-003).
- Programmatic order completion. The onramp flow is hosted — Coinbase shows the payment UI; the demo only redirects to `payment_link`.

## Common gotchas

- **Never reimplement CDP JWT signing.** ECDSA + PEM + per-method+host+path scoping is fragile; use `@coinbase/cdp-sdk/auth#generateJwt` as the wrapper does, or extend `client.ts`.
- JWTs default to 120s TTL — they're created per request, not cached. Don't try to share a token across calls.
- Webhook signatures must verify before any state transitions.
- `mapCoinbaseOnrampStatus` is a placeholder until Phase 1E rebinds it to `TransactionState` from `@dynamic-demos/transactions`.
- Coinbase rotates supported corridors. Confirm `regions` in the package's `AGENTS.md` against the live supported-countries page before launching a new corridor demo.
- Apple Pay rail requires CDP allowlist — don't assume it works in sandbox by default.
