---
name: alfredpay
description: Use when the user needs to integrate alfredPay — LATAM stablecoin → fiat offramp (USDC/USDT to BRL/MXN/COP/ARS/USD), PIX/SPEI/PSE/CBU/ACH bank rails, offramp status webhooks. Triggers on "alfredpay", "alfred pay", "LATAM offramp", "PIX offramp", "SPEI offramp", "@dynamic-demos/alfredpay". Direct REST integration (self-custody flow); see the Fireblocks-mediated DVP variant under `fb.providers.alfredpay` for vault custody.
---

# alfredPay

## Where to look first

1. **Local wrapper:** `packages/alfredpay/` — read its `AGENTS.md` for the public surface. Dashboard-side only (D-003); demo apps never import it.
2. **Authoritative docs:** https://alfredpay.io/documentation
3. **API reference:** https://alfredpay.readme.io
4. **Sibling wrapper:** `packages/fireblocks/src/providers/alfredpay.ts` — the Fireblocks-mediated DVP path for the same partner (D-009 dual-home).

## The client and its public surface

```typescript
import { createAlfredpayClient, createOfframp, getOfframpStatus } from "@dynamic-demos/alfredpay";

const client = createAlfredpayClient({
  env: "sandbox", // or "production"
  apiKey: process.env.ALFREDPAY_API_KEY!,
});

// Offramp lifecycle
const offramp = await createOfframp(client, {
  country: "BR",
  rail: "pix",
  amount: "100.00",
  currency: "USDC",
  beneficiary: { name: "...", taxId: "...", pixKey: "..." },
});
const status = await getOfframpStatus(client, offramp.id);

// Webhooks (Phase 5A wires this in the dashboard receiver)
import { webhooks } from "@dynamic-demos/alfredpay";
webhooks.verifySignature(...);
webhooks.normalize(rawEvent); // → CanonicalEvent
```

Supported corridors (frontmatter / `regions` is the source of truth):
BR/PIX, MX/SPEI, CO/PSE, AR/CBU, SV/BANK, US/ACH.

## Env vars

The package reads no `process.env` directly — credentials live at the dashboard (D-003):

- `ALFREDPAY_API_KEY` — alfred API key — required (dashboard runtime).
- `ALFREDPAY_ENVIRONMENT` — `sandbox` | `production` — optional, defaults to sandbox (D-005).
- `ALFREDPAY_WEBHOOK_SECRET` — for `webhooks.verifySignature` — required when wiring the receiver.

## Escape hatch — when the typed wrapper doesn't cover what you need

The `AlfredpayClient` exposes a generic `request<T>(method, path, init)` method that handles auth + JSON marshalling. Use it for endpoints the typed wrapper doesn't expose yet:

```typescript
// Hit any alfredPay REST endpoint with auth handled
const raw = await client.request<MyShape>("GET", "/v1/whatever", {
  headers: { /* optional */ },
  body: { /* optional, gets JSON.stringified */ },
});
```

This is the canonical fallback. Don't reimplement Bearer-token auth + base-URL resolution elsewhere — go through `client.request`.

## D-009 dual-home note

alfredPay is reachable two ways:

- **Direct REST (this package):** self-custody — user signs USDC transfer from their Dynamic wallet, alfredPay sees the deposit and disburses fiat.
- **Fireblocks DVP (`packages/fireblocks/src/providers/alfredpay.ts`):** vault custody — Fireblocks Trading Orders moves the USDC under operator MPC.

Demos pick one based on custody model. Don't try to merge them.

## Promote to typed only when…

Same three-tier rule as Fireblocks: prefer the typed `createOfframp` / `getOfframpStatus` > `client.request` escape hatch > raw `fetch`. Only promote a raw call to a new typed module under `packages/alfredpay/src/` when (a) multiple demos need it AND (b) the operation has a uniform shape.

## Out of scope / things this wrapper does NOT do

- Onramp (fiat → USDC). alfredPay supports it, but this package is offramp-only today.
- KYB / business onboarding flows. Those live in dashboard workflow, not this package.
- Direct invocation from `apps/*`. Apps go through `/api/orchestrate/offramp` (D-001 / D-003); never `import "@dynamic-demos/alfredpay"` from an app.

## Common gotchas

- Don't store `ALFREDPAY_API_KEY` in any `apps/*` env file — production-creds CI gate fails the PR.
- Webhook signatures must verify before any transaction state transitions; replay attacks otherwise.
- The wire shape is `snake_case`; the wrapper maps to `camelCase` via `mapWireOfframp`. Don't bypass — adding new fields requires both the wire type and the camelCase return type.
- `mapAlfredpayStatusToCanonical` is a placeholder until Phase 1E rebinds it to `TransactionState` from `@dynamic-demos/transactions`.
