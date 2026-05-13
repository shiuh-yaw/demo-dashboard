---
name: dynamic-webhooks
description: Use when the user wants to receive, validate, or programmatically manage Dynamic webhooks — incoming events like wallet.activity (deposits / signatures), user.created, user.session.created, wallet.linked, etc. Triggers on "dynamic webhooks", "wallet.activity event", "validate dynamic webhook", "x-dynamic-signature-256", "subscribe to deposit events", "listen for sign-in events". Pairs with the `dynamic-api` skill when webhook endpoints are created/updated programmatically.
---

# Dynamic Webhooks

## What this is for

Dynamic emits webhooks for user, session, and wallet events in an environment. The dashboard receives them via an HTTPS endpoint; your code verifies the signature and processes the event. Use this skill when:

- Building a webhook receiver (`/api/webhooks/dynamic/...`).
- Filtering for a specific event class (e.g. an incoming deposit triggers magic-send execution).
- Programmatically creating / updating / disabling webhook subscriptions via the Dynamic REST API (pairs with the `dynamic-api` skill).

## Subscribing — two paths

1. **Dashboard UI (default).** Register an endpoint at https://app.dynamic.xyz/dashboard/developer/webhooks. Pick the event classes to receive. The dashboard issues a per-webhook signing secret on creation. Copy it immediately; Dynamic does not retain a plaintext copy.
2. **REST API (programmatic).** For provisioning webhooks at scale (e.g. one per environment, per CI run), use the Dynamic API per the `dynamic-api` skill. Endpoint paths and request shapes live at https://www.dynamic.xyz/docs/api-reference/overview — read at use-time, do not guess.

HTTPS is **required**. HTTP endpoints are rejected.

## Event inventory

Documented categories (consult https://www.dynamic.xyz/docs/overview/developer-dashboard/webhooks/events for the exhaustive list — Dynamic adds new events over time):

| Class | Event | Trigger |
|---|---|---|
| **User lifecycle** | `user.created` | First sign-in for a user |
|  | `user.updated` | Profile / metadata change |
|  | `user.deleted` | User record removed |
| **Sessions** | `user.session.created` | Successful authentication |
|  | `user.session.revoked` | Session ended (logout, admin revoke) |
| **Social** | `user.social.linked` | OAuth provider linked to user |
|  | `user.social.unlinked` | OAuth provider unlinked |
| **Wallet lifecycle** | `wallet.created` | Embedded (WaaS) wallet provisioned |
|  | `wallet.linked` | External wallet linked to user |
|  | `wallet.signature` | User signed a message |
| **On-chain activity** | `wallet.activity` | Confirmed transaction involving a user's wallet (deposits, transfers, contract calls) — EVM and SVM |

`wallet.activity` is the event for "funds arrived at the embedded wallet" — filter on direction (incoming) and the recipient address to detect deposits.

## Event envelope

```json
{
  "eventId": "string",
  "messageId": "string",
  "webhookId": "string",
  "userId": "string",
  "eventName": "wallet.activity",
  "environmentId": "string",
  "environmentName": "sandbox" | "live",
  "timestamp": "ISO-8601",
  "data": {
    // event-specific payload — for wallet.activity: a `walletTransaction` object
  }
}
```

`messageId` is the **idempotency key**. Same logical event redelivered → same `messageId`. Dedupe on this before any side effect (record it in Redis or Postgres `WebhookEvent.providerEventId` with a unique constraint on `(provider="dynamic", providerEventId=messageId)`).

## Signature verification

Header: `x-dynamic-signature-256`
Algorithm: HMAC-SHA256
Format: `sha256=<hex-digest>`
Secret: per-webhook secret from the dashboard's webhook detail page. Store as env var (e.g. `DYNAMIC_WEBHOOK_SECRET`).

**Verify against the raw request body**, not the JSON-parsed value — parsing changes whitespace and breaks the HMAC. In Next.js:

```typescript
// app/api/webhooks/dynamic/route.ts
import * as crypto from "node:crypto";

export async function POST(request: Request) {
  const rawBody = await request.text();          // raw bytes — DO NOT use request.json()
  const signature = request.headers.get("x-dynamic-signature-256");
  if (!signature) return new Response("missing signature", { status: 401 });

  const expected = crypto
    .createHmac("sha256", process.env.DYNAMIC_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest("hex");

  const trusted = Buffer.from(`sha256=${expected}`, "ascii");
  const untrusted = Buffer.from(signature, "ascii");
  if (trusted.length !== untrusted.length) return new Response("bad signature", { status: 401 });
  if (!crypto.timingSafeEqual(trusted, untrusted)) return new Response("bad signature", { status: 401 });

  const event = JSON.parse(rawBody);
  // … handle event …
}
```

Use **constant-time comparison** (`crypto.timingSafeEqual`) to prevent timing attacks. The length check before `timingSafeEqual` is required — that function throws on length mismatch.

Reject any unverified request with 401 before any side effect. Do NOT log the body or signature on failure (avoid leaking partial information).

## Delivery guarantees

| Concern | Behavior |
|---|---|
| Acknowledgement | Respond with any 2XX status code. Non-200 responses trigger retry. |
| Timeout | **15 seconds** per request. Slower responses are treated as failures. Use a queue / async pattern if processing exceeds this. |
| Retries (live) | Up to 5: at **15s, 1m, 10m, 1h, 1d** after the previous attempt. |
| Retries (sandbox) | Reduced retry counts vs live. |
| Delivery guarantee | At-least-once. NOT exactly-once. **Always dedupe on `messageId`.** |
| Ordering | **No guarantee.** Events may arrive out of order. Application-level sequencing required if temporal order matters. |
| Auto-disable (live) | Webhook auto-disables after **6 consecutive failures per message**, or **1500 total failures**, within a 30-day window. Manual re-enable from the dashboard. |
| Auto-disable (sandbox) | 3 attempts per message, 250 total. |
| Retention | Event records: **90 days production**, **30 days sandbox**. |

## Receiver design pattern

1. Acknowledge fast. Verify signature → return 200 within seconds → process async (queue, background job, or in-process resolution like the magic-send Redis lookup).
2. Persist the raw payload + verification result on every receive (the project's `WebhookEvent` Postgres model handles this). Invalid signatures are an attack signal — keep the rows, flag `signatureValid=false`.
3. Dedupe on `(provider="dynamic", providerEventId=messageId)`. Same `messageId` arriving twice → idempotent no-op.
4. Filter to the event types you care about; ignore everything else. Don't crash on unknown event names.

## What this skill is NOT

- A list of every event's `data` payload shape. Consult https://www.dynamic.xyz/docs/overview/developer-dashboard/webhooks/events for current schemas.
- A replacement for the Dynamic API skill. To create / update / disable webhooks programmatically, use this skill **with** `dynamic-api` — this skill names the event surface and verification rules; the API skill names the auth pattern for managing the webhook records.
- A guide for SDK-side event hooks. The JS SDK's `onEvent()` is a separate, client-side concern documented in `dynamic-javascript-sdk`.
