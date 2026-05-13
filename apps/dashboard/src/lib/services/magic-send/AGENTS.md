---
name: magic-send (dashboard service)
kind: package
flow_role: utility
custody: custodial
status: experimental
---

# Magic-send

Magic-send is a server-side primitive that moves USDC (or any ERC-20) from a custodial dashboard-owned vault into the user's Dynamic embedded wallet, then dispatches an arbitrary gas-sponsored userop from the embedded wallet to an on-chain destination.

The primitive is destination-agnostic — consumers compose the destination `MagicSendCall[]` themselves. No per-protocol packages (Aave, Morpho, etc.) live here (per `project_magic_send_primitive`).

## Capabilities

- Validate + persist a user-signed magic-send intent.
- Fund the user's embedded wallet from the vault (sandbox: EOA-signed ERC-20 transfer via viem).
- Match an inbound Dynamic `wallet.activity` webhook to a pending intent.
- Dispatch the destination userop via an injectable executor (ZeroDev SDK in production).
- Derive credit balances from the user's magic-send `Transaction` history.

## Public surface

- `MagicSendIntentService` — stateful service exposing `createIntent`, `getIntent`, `listIntentsForUser`, `executeIntent`. (stable)
- `getCreditsForUser` — read-side credit derivation. (stable)
- `ViemVaultAdapter` + `vaultAdapterFromEnv` — sandbox vault adapter. (stable for sandbox; production is a follow-up)
- `verifyDynamicWebhookSignature` — HMAC-SHA256 verifier for Dynamic webhooks. (stable)
- `processDynamicWalletActivityWebhook` — post-persist routing for `wallet.activity` events. (stable)
- `MagicSendIntent`, `MagicSendCall`, `MagicSendStatus`, `PendingIntent`, `CreditBalance` types. (stable)

API routes consuming this surface live at:

- `POST /api/magic-send/intents`
- `GET  /api/magic-send/intents`
- `GET  /api/magic-send/intents/[id]`
- `POST /api/magic-send/intents/[id]/execute` (internal-only)
- `GET  /api/magic-send/credits/[userId]`
- `POST /api/webhooks/dynamic`

## Required environment

- `MAGIC_SEND_VAULT_PRIVATE_KEY` — sandbox EOA holding test USDC — required for live usage (optional in test).
- `MAGIC_SEND_VAULT_CHAIN_ID` — vault chain id — defaults to 84532 (Base Sepolia).
- `MAGIC_SEND_VAULT_RPC_URL` — RPC URL for the vault chain — defaults to `https://sepolia.base.org`.
- `DYNAMIC_WEBHOOK_SECRET` — Dynamic webhook signing secret — required for the receiver.
- `INTERNAL_API_SECRET` — gating secret for `/api/magic-send/intents/[id]/execute` — required for live usage.

## Storage split

- **Postgres `Transaction`** (existing model, no new tables): `kind = "magic-send"`. `payload` carries `{ demoInstanceId, vaultId, recipient, token, amount, chainId, calls, idempotencyKey, userId }`. `refs` carries `{ transferTxHash, useropBundleHash, dynamicWebhookEventId, failureReason }`.
- **Postgres `WebhookEvent`**: every Dynamic delivery persists here with `provider="dynamic"`, `eventType="wallet.activity"`. Dedup on `(provider, providerEventId)` where `providerEventId = messageId`.
- **Redis pending key**: `magic-send:intent:pending:<recipient-lowercase>` → `PendingIntent` JSON. TTL 300s.
- **Redis idempotency key**: `magic-send:idempotency:<key>` → `"1"`. TTL 3600s.

## State machine

Magic-send rows live on the canonical `@dynamic-demos/transactions` state machine. Phase 7 adds three intermediate states between `initialized` and `confirmed`:

```
initialized → submitted-transfer → transfer-confirmed
            → submitted-userop  → confirmed
```

Failures land on `failed`; cancellations on `cancelled`. The state machine is the authority — never bypass `assertValidTransition`.

## Slots vs invariants

**Slots** (per consumer / demo):

- Vault id (a single dashboard may operate multiple vaults).
- Destination `calls[]` — fully consumer-defined.
- Token contract + chain id (any EVM chain with an RPC + USDC-like ERC-20).

**Invariants**:

- All addresses persisted lowercased — Redis lookups are exact-match.
- Token + amount checked against the pending entry in the webhook handler (anti-spoof).
- State transitions go through `@dynamic-demos/transactions` helpers; never widen the legal set.
- Sandbox by default (D-005). Vault private keys NEVER point at production EOAs.
- Internal execute route is gated behind `INTERNAL_API_SECRET`; external callers always 401.

## Integration map

**Imports:** `@dynamic-demos/transactions`, `@dynamic-demos/db` (via the service layer), `viem`, `@paralleldrive/cuid2`, `node:crypto`.
**Imported by:** `apps/dashboard` API routes (`/api/magic-send/*`, `/api/webhooks/dynamic`). No demo app uses this yet — that's a follow-up PR.

## Examples

```ts
import { getMagicSendIntentService } from "@/app/api/magic-send/_shared";

const svc = getMagicSendIntentService();
const intent = await svc.createIntent({
  userId: jwt.sub,
  demoInstanceId: "demo-123",
  vaultId: "vault-1",
  recipient: userEmbeddedWalletAddress,
  token: "0xUSDC...",
  amount: "1000000", // 1 USDC, 6dp
  chainId: 84532,
  calls: [{ to: "0xDestination...", value: "0", data: "0xa9059cbb..." }],
  idempotencyKey: crypto.randomUUID(),
});
```

## Do / Don't

- Do: validate every incoming intent at the route boundary with the Zod schema in `intents/route.ts`.
- Don't: write directly to the `Transaction` table — go through `MagicSendIntentService` so state transitions are enforced.
- Do: pass a fresh `idempotencyKey` per submission; the service short-circuits duplicates within 1h.
- Don't: bypass `verifyDynamicWebhookSignature` — the route handler must fail closed when the secret is unset.
- Do: extend the state machine in `@dynamic-demos/transactions` (with tests) before adding new sub-states.
- Don't: add per-destination protocol packages here — magic-send is destination-agnostic.

## Open questions / known gaps

- **`sendUserOperation` server-side**: `@dynamic-labs-sdk/zerodev`'s `sendUserOperation` requires a browser-instantiated `EvmWalletAccount` or a `KernelClient` derived from one. Both are client-side constructs and cannot be minted server-side. Phase 7 ships the orchestration with a no-op `UserOpExecutor` that synthesises a deterministic bundle hash so the state machine and client polling thread end-to-end. The actual dispatch path (client-side relay, session-key flow, or a future server-callable surface) lands in a follow-up PR. See `apps/dashboard/src/app/api/magic-send/_shared.ts` for the executor injection point.
- **Production vault**: only the sandbox EOA adapter ships. Fireblocks-backed vault lands alongside the production-credentials guardrail in a follow-up.
- **Credit top-up**: only the read-side derivation ships. Top-up (positive credit ledger entries) is a follow-up.
- **No demo app uses magic-send yet** — this is infrastructure; the first consumer demo lands in a separate PR.
