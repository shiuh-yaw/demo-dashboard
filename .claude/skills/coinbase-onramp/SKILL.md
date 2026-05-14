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
  apiKey: process.env.COINBASE_API_KEY!,        // CDP API key id
  apiSecret: process.env.COINBASE_API_SECRET!,  // CDP API secret (PEM ECDSA)
});

// Create a hosted onramp order. Returns a paymentUrl the end-user is redirected to.
const order = await createOnrampOrder(client, {
  agreementAcceptedAt: new Date().toISOString(),
  destinationAddress: "0xabc...",
  destinationNetwork: "base",
  purchaseCurrency: "USDC",
  paymentCurrency: "USD",
  paymentAmount: "50.00",
  purchaseAmount: "50.00",
  isQuote: false,
  email: "user@example.com",
  partnerUserRef: "user-123",
  phoneNumber: "+12345678901",
  phoneNumberVerifiedAt: new Date().toISOString(),
});
// redirect end-user → order.paymentUrl

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

- `COINBASE_API_KEY` — CDP API key id — required.
- `COINBASE_API_SECRET` — CDP API secret (PEM-formatted ECDSA) — required.
- `COINBASE_API_ENVIRONMENT` — `sandbox` | `production` — optional, defaults to sandbox (D-005).
- `COINBASE_ONRAMP_WEBHOOK_SECRET` — for signature verification — required when wiring receiver.

## Escape hatch — when the typed wrapper doesn't cover what you need

The `CoinbaseOnrampClient` returned by `createCoinbaseOnrampClient(...)` exposes two escape hatches for CDP endpoints the typed wrappers don't cover:

```typescript
const client = createCoinbaseOnrampClient({ apiKey, apiSecret });

// Raw CDP REST with auth handled (JWT signed for this exact method+host+path)
const data = await client.request<MyResponseType>({
  requestMethod: "POST",
  requestHost: client.endpoint.host,
  requestPath: "/v1/onramp/orders/<id>",
  requestBody: { /* ... */ },
});

// Just the signing helper, if you need a CDP-signed token for something else
const token = await client.generateToken("GET", "/v1/onramp/buy/options");
```

Both are typed and tested. The JWT TTL defaults to 120s and is scoped to a single method+host+path tuple — Coinbase's signing requirement, not arbitrary.

**Do NOT reimplement the JWT signing.** CDP JWT requires ECDSA over PEM secret material + per-method+host+path scoping. Use `client.request` or `client.generateToken` instead.

## Promote to typed only when…

Same three-tier rule as Fireblocks: prefer the typed `createOnrampOrder` > drop to `client.request` for one-off CDP endpoints > promote to a typed wrapper module only when (a) multiple demos need the same operation AND (b) the operation has a uniform shape. Never roll JWT signing by hand.

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
