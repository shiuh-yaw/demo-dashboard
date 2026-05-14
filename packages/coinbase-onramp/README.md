# @dynamic-demos/coinbase-onramp

Coinbase Onramp REST client and webhook helpers. Sandbox-by-default
(`env: 'sandbox' | 'production'` per DECISIONS.md D-005).

See `AGENTS.md` for the package metadata, public surface preview, and
open Phase 3/Phase 5A follow-ups.

## Quick start

```ts
import {
  createCoinbaseOnrampClient,
  createOnrampOrder,
} from "@dynamic-demos/coinbase-onramp";

// The package reads no `process.env`. Credentials must be passed
// explicitly — the dashboard-side `getCoinbaseOnrampClient()` helper
// is the only sanctioned env-reader.
const client = createCoinbaseOnrampClient({
  env: "sandbox",
  apiKey: process.env.COINBASE_API_KEY!,
  apiSecret: process.env.COINBASE_API_SECRET!,
});

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
// redirect the end user to order.paymentUrl
```

## Webhooks

```ts
import {
  COINBASE_ONRAMP_SIGNATURE_HEADER,
  normalizeCoinbaseOnrampEvent,
  verifyCoinbaseOnrampWebhookSignature,
} from "@dynamic-demos/coinbase-onramp";

const ok = verifyCoinbaseOnrampWebhookSignature({
  rawBody, // Buffer or string — verify BEFORE JSON parsing
  signatureHeader: req.headers.get(COINBASE_ONRAMP_SIGNATURE_HEADER),
  secret: process.env.COINBASE_WEBHOOK_SECRET!,
});
if (!ok) return new Response("invalid signature", { status: 401 });

const normalized = normalizeCoinbaseOnrampEvent(JSON.parse(rawBody));
```
