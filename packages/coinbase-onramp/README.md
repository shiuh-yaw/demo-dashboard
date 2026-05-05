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

const client = createCoinbaseOnrampClient({
  env: "sandbox",
  // Falls back to COINBASE_API_KEY / COINBASE_API_SECRET when omitted.
});

const order = await createOnrampOrder(client, params);
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
