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
  status_page: https://status.fireblocks.io
---

# @dynamic-demos/fireblocks

Shared Fireblocks integration. Wraps the official `@fireblocks/ts-sdk` for vault management, plus a hand-rolled JWT-signed client for the Trading Orders API (DVP / Network listings) and verifiers for incoming webhooks (JWKS + legacy RSA). Per D-009, partners reachable both via Fireblocks Network listings *and* their own REST API live in two homes — the Fireblocks-mediated wrapper here under `providers/`, the direct REST integration in its own package (e.g. `packages/alfredpay`).

## Provider documentation

If you are an AI agent integrating against Fireblocks, **consult the provider docs first**:

- **Main docs:** [developers.fireblocks.com](https://developers.fireblocks.com/)
- **API reference:** [developers.fireblocks.com/reference](https://developers.fireblocks.com/reference)
- **Webhooks:** [Webhooks & notifications](https://developers.fireblocks.com/docs/webhooks-notifications) (JWKS-based since 2024; legacy RSA verifier retained for older tenants)
- **Status:** [status.fireblocks.io](https://status.fireblocks.io)

## Hard rule — NCW out of scope

Fireblocks NCW (Non-Custodial Wallets, marketed as "Embedded Wallets") is deprecated in this project. This package will never include an NCW module. End-user wallets are Dynamic's territory — see the `dynamic-node-sdk` and `dynamic-javascript-sdk` skills. See the `project_no_fireblocks_ncw` memory for the rule.

## Capabilities

- Vault management — accounts, assets, deposit addresses, tag attachment, supported assets (`vault.ts`, `supported-assets.ts`).
- Transactions — typed shapes, validation schemas (`validation.ts`), and the SDK-backed `FireblocksClient` / `MockFireblocksClient`.
- Trading Orders — `list`, `create`, `get` against `/v1/trading/orders` (RS256 JWT, body SHA-256) — used for DVP and Network listings.
- Pre-tx compliance — `fb.compliance.screenTransaction(...)` collapses Fireblocks's multi-provider screening into a single `{ verdict, riskScore, providers, raw }` shape.
- Raw escape hatches — `fb.sdk` (raw `@fireblocks/ts-sdk`) and `fb.api` (raw JWT-signed REST) for endpoints not yet wrapped.
- Provider sub-modules — `Mtlco` (PREFUNDED USD→USDC onramp) and `Alfredpay` (DVP USDC→fiat). Each exports its own `mapStatus` and is namespaced.
- Incoming webhooks — `verifyIncomingFireblocksWebhook` (JWKS, with optional legacy RSA fallback) plus typed notification schemas.

## Public surface

`createFireblocksClient(config)` returns an `IFireblocksClient` with these namespaces:

- `fb.vault` — vault accounts, deposit addresses, tags (`createAccount`, `getAccount`, `listAccounts`, `hideAccount`, `setCustomerRefId`, `attachOrDetachTags`, `createWallet`, `getDepositAddresses`, `createDepositAddress`, `getAssetBalance`).
- `fb.transactions` — transaction CRUD (`create`, `get`, `getByExternalId`, `list`).
- `fb.internalWallets` — internal wallet CRUD (`list`, `get`, `create`, `createAsset`).
- `fb.orders` — Trading Orders API (`list`, `get`, `create`).
- `fb.compliance` — pre-transaction screening (`screenTransaction`).
- `fb.providers.mtlco` / `.alfredpay` — Fireblocks-mediated partner wrappers.
- `fb.sdk` — raw `@fireblocks/ts-sdk` `Fireblocks` instance (escape hatch #1).
- `fb.api` — raw JWT-signed REST client (escape hatch #2).

`MockFireblocksClient` mirrors the same surface for tests.

Additional flat exports (stable):

- Vault helpers — `tryGetVaultAccount`, `getOrCreateVaultByName`, `getOrCreateDepositAddressForVault`, `getOrCreateDepositAddress`, `resolveVaultIdByName`, `attachTagsToVaultAccounts`.
- Types — `FireblocksConfig`, `IFireblocksClient`, `VaultNamespace`, `TransactionsNamespace`, `InternalWalletsNamespace`, `VaultAccount`, `VaultAsset`, `VaultWallet`, `DepositAddress`, `TransactionResponse`, `TransactionStatus`, `CreateTransactionRequest`, `ListTransactionsParams`, plus the AML/Travel-Rule and tag-attachment shapes.
- Validation — `transferPeerPathSchema`, `createTransactionRequestSchema` + `Validated*` types.
- Request signing — `signFireblocksRequest` (shared by `fb.orders` and `fb.api`).
- Raw REST escape hatch — `createApiClient`, `FireblocksApiClient`, `FireblocksApiError`, `CreateApiClientConfig`.
- Compliance — `createComplianceModule`, `FireblocksComplianceError`, `ComplianceModule`, `ComplianceVerdict`, `ScreenTransactionParams`, `ScreenTransactionResult`.
- Trading Orders (functional, for callers who want explicit credentials) — `listOrders`, `getOrder`, `createOrder`, `FireblocksOrdersError`, `FireblocksOrder`, `OrderSide`, `OrderSettlementType`, `OrderBeneficiary`, `CreateOrderParams`, `CreateOrderResult`, `ProviderAccountRef`, `ProviderEnvironment`.
- Webhooks — `verifyIncomingFireblocksWebhook`, `resolveFireblocksWebhookJwksUrl`, `defaultFireblocksWebhookJwksUrl`, JWKS + legacy verifiers, `fireblocksWebhookNotificationSchema`, `fireblocksTransactionWebhookDataSchema`, `normalizeFireblocksEventType`.
- Provider namespaces — `Mtlco.*`, `Alfredpay.*` (each with its own `mapStatus`).

See `.claude/skills/fireblocks/SKILL.md` for the canonical extension guide — when to promote a typed module vs. use an escape hatch.

## Required environment

The vault config helper falls back to `process.env`; the Orders client and provider wrappers do not (callers pass credentials per call).

- `FIREBLOCKS_API_KEY` — vault API key — required by `createFireblocksClient` (or pass via options).
- `FIREBLOCKS_API_SECRET` — vault API secret (PEM RSA) — required.
- `FIREBLOCKS_API_BASE_URL` — defaults to `BasePath.Sandbox` — optional (D-005).
- Provider sub-modules each pull their own ids from env at the call site (e.g. `FIREBLOCKS_MTLCO_PROVIDER_ID`, `FIREBLOCKS_ALFRED_PROVIDER_ID`, `FIREBLOCKS_ALFRED_ACCOUNT_ID`).
- `FIREBLOCKS_WEBHOOK_PUBLIC_KEY` — only for legacy RSA verifier; JWKS is the default path.

## Slots vs invariants

**Slots:** vault account name, asset id, transfer peer paths, order beneficiary details, tag set, sandbox vs production base URL.

**Invariants:**

- Sandbox-by-default (D-005). Production requires the explicit `FIREBLOCKS_API_BASE_URL` override + `[prod-creds]` PR title.
- The Trading Orders client takes `env: 'sandbox' | 'production'` per call — no implicit defaults.
- Webhook signatures must verify before any event drives state transitions. Default is JWKS; legacy RSA is opt-in for older tenants.
- The Fireblocks-mediated alfredPay path lives under `providers/alfredpay`. The direct REST path lives in `packages/alfredpay`. Demos pick one based on custody model (D-009).
- Provider sub-modules are namespaced (`Mtlco`, `Alfredpay`) because each re-exports `mapStatus` — flat exports collide.
- Apps hold their own Fireblocks creds (D-003) — this package is consumed by both apps and dashboard.

## Integration map

**Imports:** `@fireblocks/ts-sdk`, `jose`, `zod`.
**Imported by:** `apps/dashboard`, `apps/proceeds`, `apps/visa-direct`, plus any future demo with a vault flow. The Trading Orders surface is dashboard-side.

## Examples

```ts
// Vault: read-only check
import { createFireblocksClient, tryGetVaultAccount } from "@dynamic-demos/fireblocks";

const fb = createFireblocksClient({ /* falls back to env */ });
const vault = await tryGetVaultAccount(fb, "demo-vault-id");
```

```ts
// Trading Orders: PREFUNDED MTLco onramp
import { Mtlco } from "@dynamic-demos/fireblocks";

const order = await Mtlco.createMtlcoOnrampOrder({
  env: "sandbox",
  apiKey: process.env.FIREBLOCKS_API_KEY!,
  apiSecret: process.env.FIREBLOCKS_API_SECRET!,
  amountUsd: "100.00",
  destinationVaultId: "...",
});
```

## Do / Don't

- Do: pass credentials in via options for the Orders client; rely on env-fallback only in the vault helper.
- Do: verify webhook signatures via `verifyIncomingFireblocksWebhook` (JWKS first; legacy RSA only for tenants that haven't migrated).
- Do: pick the right partner path — Fireblocks DVP for vault custody, direct REST (separate package) for self-custody.
- Don't: log signed JWTs, raw secrets, or PEM keys.
- Don't: import `process.env` from anywhere in `orders.ts` or `providers/`. Vault config helper is the only sanctioned env-reader.
- Don't: bypass the `mapStatus` mappers when persisting to canonical state.

## Open questions / known gaps

- `mapStatus` returns are placeholder string-unions until Phase 1E rebinds them to `TransactionState` from `@dynamic-demos/transactions`.
- `MockFireblocksClient` covers the most common vault calls but not the full surface — extend on demand for new tests.
- No real-network E2E tests in CI (D-023). All tests stub `fetch` / SDK methods.
- The legacy RSA webhook verifier exists for tenants who haven't migrated to JWKS; remove once all tenants are on JWKS.
