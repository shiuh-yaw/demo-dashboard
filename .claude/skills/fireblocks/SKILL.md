---
name: fireblocks
description: Use when the user needs to integrate Fireblocks — vault management, transaction submission, trading orders (DVP / Network), compliance screening, internal wallets, or any operation against the Fireblocks SDK / REST API. Triggers on "fireblocks", "vault account", "fireblocks vault", "fireblocks transaction", "DVP", "trading orders", "fireblocks compliance", "AML screening", "@fireblocks/ts-sdk". For Fireblocks NCW (Non-Custodial Wallets): NEVER use NCW — it is deprecated in this project; redirect to dynamic-node-sdk or dynamic-javascript-sdk skills.
---

# Fireblocks

## Hard rule — NCW is deprecated

**Fireblocks NCW (Non-Custodial Wallets, marketed as "Embedded Wallets") is deprecated in this project.** Never propose, scaffold, or recommend NCW. End-user wallets go through Dynamic — use the `dynamic-node-sdk` skill for server-managed user wallets, or `dynamic-javascript-sdk` for browser-side embedded wallets.

Fireblocks **Vault** (custodial, operator-controlled MPC) remains fully supported and is what `@dynamic-demos/fireblocks` wraps today.

## Where to look first

1. **Local wrapper:** `packages/fireblocks/` — read its `AGENTS.md` for the public surface. The package is consumed directly by apps (no dashboard proxy).
2. **Authoritative docs:** https://developers.fireblocks.com/ — SDK methods, REST endpoints, webhook formats. Always consult before scaffolding code that the local wrapper doesn't already expose.
3. **API reference:** https://developers.fireblocks.com/reference

## The client and its namespaces

```typescript
import { createFireblocksClient } from "@dynamic-demos/fireblocks";

const fb = await createFireblocksClient({
  apiKey: process.env.FIREBLOCKS_API_KEY!,
  apiSecret: process.env.FIREBLOCKS_API_SECRET!,
  baseUrl: "https://sandbox-api.fireblocks.io/v1",   // sandbox by default
});

// Lightly-opinionated typed modules
fb.vault.*              // vault accounts, addresses, tags
fb.transactions.*       // transaction CRUD
fb.internalWallets.*    // internal wallet CRUD
fb.orders.*             // Trading Orders (DVP, Network listings)
fb.compliance.*         // pre-tx screening
fb.providers.mtlco.*    // Mtlco DVP onramp wrapper
fb.providers.alfredpay.* // alfredPay DVP offramp wrapper

// Escape hatches — see ordering below
fb.sdk                  // raw @fireblocks/ts-sdk instance
fb.api.*                // raw REST with auth handled
```

## Three escape hatches, in order

When you need a Fireblocks operation the typed wrappers don't expose:

1. **Try `fb.sdk.<namespace>.<method>` first.** If `@fireblocks/ts-sdk` exposes a typed method (e.g. `fb.sdk.contracts.deployContract(...)`, `fb.sdk.tokens.createToken(...)`), use it. Typed, supported, no auth wiring needed.
2. **Drop to `fb.api.<verb>(path, body?)` if the SDK doesn't have it.** For endpoints Fireblocks released after the SDK version we use (which happens regularly), or admin endpoints the SDK doesn't surface, call raw REST. Auth handled.
3. **Only promote to a typed wrapper module** when (a) multiple demos need the same operation AND (b) the operation has a uniform, well-defined shape. Otherwise leave it in escape-hatch territory.

The `compliance.screenTransaction` module is the canonical example of "promoted to typed" — every cashout-flavored demo needs pre-tx screening, and the verdict mapping is uniform.

## Sandbox-by-default

Per D-005, all credentials default to sandbox. The sandbox base path is `https://sandbox-api.fireblocks.io/v1`. Production opt-in requires:
- Explicit `baseUrl: "https://api.fireblocks.io/v1"` (or omit the option and rely on env defaults).
- A `[prod-creds]` token in the PR title.
- Env vars marked `FIREBLOCKS_*_PRODUCTION`.

## Compliance — what's typed vs. via escape hatch

| Operation | Use |
|---|---|
| Pre-tx screening (any cashout, payout, magic-send leg) | `fb.compliance.screenTransaction(...)` — returns `{ verdict, riskScore, providers, raw }` |
| Travel Rule originator/beneficiary submission | `fb.api.post("/screening/travel-rule/...", body)` — shape varies by jurisdiction; consult docs |
| Blocklist queries / management | `fb.api.<verb>("/screening/...")` |
| Post-tx compliance alerts | Webhooks (see Webhooks below) + `fb.api` for replay |

Why thin? Travel Rule and blocklist shapes vary too much by jurisdiction and partner to abstract cleanly. The typed wrapper is reserved for operations with a uniformly-shaped contract.

## Webhooks

Verify incoming Fireblocks webhooks with `verifyIncomingFireblocksWebhook` (JWKS verifier, legacy RSA fallback). The canonical receiver implementation is at `apps/deposit/app/api/webhooks/fireblocks/route.ts` — read it before scaffolding a new receiver.

Webhook events are documented at https://developers.fireblocks.com/docs/webhooks-notifications.

## Trading Orders (DVP, Network)

`fb.orders` covers `list`, `get`, `create` against `/v1/trading/orders`. Used by demos routing fiat ↔ stablecoin through Fireblocks Network listings (Mtlco, alfredPay, etc.) rather than calling each partner's REST API directly.

JWT-signed REST (RS256, body SHA-256, 30s TTL); shares signing logic with `fb.api` via the `signFireblocksRequest` helper.

## Provider sub-modules

- `fb.providers.mtlco` — PREFUNDED USD→USDC onramp. `mapStatus` normalizes Fireblocks order states to Mtlco's lifecycle.
- `fb.providers.alfredpay` — DVP USDC→fiat offramp. Same pattern.

Per D-009: partners reachable both via Fireblocks Network listings AND their own direct REST API live in two homes — the Fireblocks-mediated wrapper here, and the direct-REST integration in its own package (e.g. `packages/alfredpay`).

## Adding new capability — decision tree

1. Is the operation called by multiple demos? **No → use `fb.sdk` or `fb.api` directly in the demo's code.**
2. Yes, multiple demos. Does the operation have a uniform shape (same inputs, same return contract)? **No → still escape hatch — wrapping forces a contract that won't fit all consumers.**
3. Yes, uniform shape. **Promote to a typed module** under `packages/fireblocks/src/<domain>.ts`, expose under `fb.<domain>`, update `IFireblocksClient` + `MockFireblocksClient` + `AGENTS.md`.

When in doubt: escape hatch first. Promotion later is cheap; rollback of a bad wrapper is more disruptive.

## What this skill is NOT

- A list of every Fireblocks SDK method. Consult `@fireblocks/ts-sdk` types and https://developers.fireblocks.com/reference for the canonical surface.
- A guide to Fireblocks NCW. NCW is deprecated. See `project_no_fireblocks_ncw` memory.
- A replacement for the Dynamic SDK skills. For end-user wallets, route to `dynamic-node-sdk` or `dynamic-javascript-sdk`.
