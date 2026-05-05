---
name: "@dynamic-demos/fireblocks"
kind: package
flow_role: utility
custody: custodial
status: stable
provider:
  name: Fireblocks
  docs: https://developers.fireblocks.com/
  api_reference: https://developers.fireblocks.com/reference
  agent_docs: none
---

# @dynamic-demos/fireblocks

Shared Fireblocks integration: vault management (via the official TS SDK), incoming-webhook verification (JWKS + legacy RSA), and the Trading Orders API (DVP / Network listings).

> **Phase 3 placeholder.** Full AGENTS.md (capabilities, public surface, env vars, integration map, do/don't) is regenerated in Phase 3 of the demo-meta-system project. The frontmatter above is enough for the demo-registry generator to find the package; the body below summarises only what changed in Phase 1A so reviewers don't lose context.

## What Phase 1A added

- `src/orders.ts` — shared `/v1/trading/orders` client (`listOrders`, `createOrder`, `getOrder`) plus `FireblocksOrder`, `FireblocksOrdersClient`, `FireblocksOrdersError`. Auth: RS256 JWT signed with `jose` per request, body hashed with SHA-256.
- `src/providers/mtlco.ts` — thin `createMtlcoOnrampOrder` wrapper (PREFUNDED, USD → USDC). Wraps Fireblocks Orders; MTLco has no separate REST API.
- `src/providers/alfredpay.ts` — `createAlfredpayOfframpOrder` wrapper (DVP, USDC → fiat). The **direct** alfredPay REST integration lives in `packages/alfredpay` (Phase 1B) — that's the right pick when a demo wants self-custody via Dynamic wallets.
- Each provider exports a placeholder `mapStatus(upstream)` returning a string-union state. **TODO(phase-1e):** swap the return type for the canonical `TransactionState` enum from `@dynamic-demos/transactions` once Phase 1E lands.
- Vitest test config + `src/orders.test.ts` covering request shape, response parsing, and typed error surfacing.

## Sandbox-by-default (D-005)

Every helper in `orders.ts` and `providers/*` takes an explicit `env: 'sandbox' | 'production'`. There is no implicit default — callers default at the call site so the choice is visible in app code.

## Hard rules (carried from D-005, D-006, D-009)

- Never log raw API secrets or signed JWTs.
- Don't import `process.env` from inside this package; consumers pass credentials in.
- The Fireblocks-mediated alfredPay path lives **here**; the direct REST path lives in `packages/alfredpay`. Demos pick one based on custody model.
- `apps/spark26/` is zero-touch.

## Open questions / known gaps

- `mapStatus` is a stub until Phase 1E (`packages/transactions`) merges. Replace the placeholder string-union with the canonical enum then.
- No real-network E2E tests in CI (D-023). Tests stub `globalThis.fetch`.
