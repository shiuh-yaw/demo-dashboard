---
name: "@dynamic-demos/flow"
kind: app
flow_role: checkout
custody: mixed
status: experimental
regions:
  - country: ANY
    currencies: [USDC, USDT, ETH, SOL, BTC]
    rails: [onchain]
provider:
  name: Dynamic (Flow)
  docs: https://www.dynamic.xyz/docs/overview/deposit-with-crypto
  api_reference: https://www.dynamic.xyz/docs/api-reference/checkout/create-a-checkout
  agent_docs: none
---

# `apps/flow` — Flow GTM Enablement Demo

Public, interactive showcase for Dynamic's **Flow** product (a.k.a. Checkouts / Deposit-with-Crypto / Fireblocks Dynamic Deposits). Accepts any crypto from any source — external wallet, exchange, embedded wallet, Fireblocks vault — and settles in any stablecoin at any destination (vault / embedded wallet / external address). Built for the GTM field team to demo Flow against three prebuilt scenarios with brand chrome that switches per customer.

The headline pitch: the same SDK call works whether you swap source from "external wallet" to "Fireblocks vault" or destination from "embedded wallet" to "external address". Flip a config field, watch the demo keep working.

## Status

Experimental V1. Implemented today:

- ✅ Public landing (hero + chat input + scenario chips + CSS-driven event ticker + scroll-pinned persona sections)
- ✅ Checkout scenario (Pitch + provisional Code view) — full Flow SDK lifecycle: server create → `attachFlowSource` → `getFlowQuote` → `submitFlowTransaction` → poll
- ✅ Deposit scenario (same machinery, user-input amount framing)
- ✅ Withdraw scenario — SOL embedded wallet (USDC@Solana anchor), settlement picker (chain → token), destination form, deferred Flow creation at review time
- ✅ KYC Deposit scenario — uses the SAME `<ExchangeCheckoutWidget>` as checkout/deposit with `postConnectScreen` prop to inject SumSub KYC (rendered in a modal) between wallet connect and asset selection. KYC-verified users deposit USDC on Base Sepolia as a **self-send** to their own connected wallet (so repeat demos don't drain test USDC); the merchant Iron off-ramp to the merchant's bank is simulated on the backend (invisible to the end user). KYC completion is persisted to Dynamic user metadata (`is_kyc_completed`) so returning users skip re-verification. SumSub is dashboard-mediated (D-003) via `/api/kyc-deposit/*`. Not listed on landing page (direct-access `/kyc-deposit` route only).
- ✅ Fireblocks + Dynamic brand chrome, light + dark mode, no-FOUC init script

Coming in follow-up PRs:

- 🔜 Phase 6: FlowBuilder + LivePreview + EventLog + CodePanel (shiki-rendered TS/cURL/Droplet tabs)
- 🔜 Phase 7: Chat-to-flow (`@anthropic-ai/sdk@0.71.2` with prompt caching → IntentCard)
- 🔜 Phase 9: Brand theme switcher (Postgres `Brand` rows)
- 🔜 Phase 10: WithdrawIntent Prisma model + webhook for vault-mediated withdrawals

## Exchange connector support

Exchange connectors (currently Kraken) are supported as funding sources alongside external wallets. The implementation follows the adapter pattern from `apps/checkouts`:

- **`lib/exchanges/`** — adapter registry, types, Kraken adapter, OAuth redirect state persistence.
- **`lib/dynamic/flow-sdk.ts`** — SSR-safe wrappers for exchange/OAuth SDK functions (`authenticateWithSocial`, `getKrakenAccounts`, `createKrakenExchangeTransfer`, etc.).
- **`components/exchange-checkout-widget.tsx`** — wraps `<CheckoutWidget>` with exchange support. In wallet mode, renders the standard widget with exchange rows injected via `walletPickerExtrasAfter`. In exchange mode, renders a custom flow: asset list → whitelisting check → review → transfer execution.
- **`components/exchange-rows.tsx`**, **`exchange-asset-list.tsx`**, **`exchange-whitelisting-screen.tsx`** — leaf components for the exchange path.

Adding a new exchange: create `lib/exchanges/<name>.ts` implementing `ExchangeAdapter`, register in `lib/exchanges/index.ts`. No other changes needed — the `ExchangeCheckoutWidget` consumes adapters generically.

Exchange-specific flows are owned by this app, not delegated to the package (mirrors the `apps/checkouts` pattern).

Plan-of-record: `~/.claude/plans/users-etesenair-desktop-rd-product-brie-radiant-starfish.md`.

## Testnet mode

Both `/checkout` and `/deposit` support a testnet toggle:

- **URL param:** `?testnet=true` switches to testnet-only asset display. Shareable/bookmarkable.
- **Toggle pill:** visible above the widget card, next to the back button. Clicking it updates the URL param.
- **Filtering:** when testnet mode is on, `tokenFilter` on `CheckoutWidget` restricts the wallet asset list to testnet chain IDs only (Base Sepolia 84532, Arbitrum Sepolia 421614, OP Sepolia 11155420, Ethereum Sepolia 11155111). Exchange tokens (chainId 0) are unaffected.
- **Settlement:** testnet mode settles on Arbitrum Sepolia (chainId 421614) with USDC (`0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`). Flows are created at review time via `createFlow` → `POST /api/checkouts` with `settlementConfig` targeting `USDC_ARB_SEPOLIA` (chainId `"421614"`, chainName `"EVM"`) + `destinationConfig` (not pre-minted on mount).
- **Implementation:** `components/testnet-toggle.tsx` (hook + UI), `lib/testnet.ts` (chain ID set), `lib/bind-create-flow.ts` (binds static config into the widget's `createFlow` callback), `lib/checkouts-api.ts` (`settlementFromToken`, `destination` helpers build the API-aligned config objects).

LI.FI cross-chain routes on testnets use the Intents solver exclusively (not traditional bridges/DEXs). Best pair: Base Sepolia ↔ Arbitrum Sepolia, up to 20 USDC.

## Provider docs

Always consult the upstream docs before changing Flow wiring:

- **Overview:** https://www.dynamic.xyz/docs/overview/fireblocks-flow
- **JS SDK reference:**
  - https://www.dynamic.xyz/docs/javascript/reference/flow-getting-started
  - https://www.dynamic.xyz/docs/javascript/reference/client/attach-flow-source
  - https://www.dynamic.xyz/docs/javascript/reference/client/get-flow-quote
  - https://www.dynamic.xyz/docs/javascript/reference/client/submit-flow-transaction
  - https://www.dynamic.xyz/docs/javascript/reference/client/get-flow
  - https://www.dynamic.xyz/docs/javascript/reference/client/cancel-flow
- **REST API:**
  - https://www.dynamic.xyz/docs/overview/fireblocks-flow-api
- **Recipes:** https://www.dynamic.xyz/docs/recipes/integrations/checkouts/checkout-api

## Public surface

| Route | Purpose | Auth |
|---|---|---|
| `/` | Landing — hero, scenario tiles, persona scroll story | Public |
| `/checkout?id=<cfg>` | Merchant checkout scenario (Pitch ↔ Code) | Public (auth-on-action) |
| `/deposit?id=<cfg>` | Platform deposit scenario | Public (auth-on-action) |
| `/withdraw?id=<cfg>` | Withdraw — SOL embedded wallet → any chain/token | Public (auth-on-action) |
| `/kyc-deposit` | KYC-gated deposit — connectAndSign → SumSub KYC → deposit USDC → settlement visualization | Public (auth-on-action) |
| `/api/kyc-deposit/init` | Create SumSub applicant + SDK access token (proxies dashboard) | Server-only |
| `/api/kyc-deposit/status` | Check KYC verification status (proxies dashboard) | Server-only |
| `/api/kyc-deposit/deposit-address` | Return the deposit destination — the caller's own connected wallet (self-send) | Server-only |
| `/api/kyc-deposit/kyc-status` | Whether the authed user already completed KYC (reads Dynamic `is_kyc_completed` metadata) — lets returning users skip SumSub | Auth-required |
| `/api/kyc-deposit/complete` | Persist KYC completion to Dynamic user metadata (`is_kyc_completed`) after a GREEN SumSub review | Auth-required |
| `/api/withdraws/[id]` | Withdraw intent state (Phase 10) | Auth-required |

## Env reference

See `.env.example`. All values target sandbox by default per D-005. Production opt-in requires explicit value + `[prod-creds]` PR title.

| Variable | Required for | Server-only? |
|---|---|---|
| `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` | Dynamic SDK boot (all scenarios) | No (NEXT_PUBLIC) |
| `NEXT_PUBLIC_DYNAMIC_CHECKOUT_ID` | Override the sandbox Checkout id on `/checkout` — optional, a default is baked in | No (NEXT_PUBLIC) |
| `DYNAMIC_API_KEY` | One Dynamic env API token used server-side (same var name as every other demo app). Needs **flow.write** (Flow creation via `POST /api/checkouts`) **and** user read+write (`/kyc-deposit` persists `is_kyc_completed` via `@dynamic-demos/dynamic`). | Yes |
| `DASHBOARD_API_URL` | `/kyc-deposit` scenario — proxies SumSub calls to dashboard (D-003) | Yes |

## Architecture invariants

- **D-003 (apps hold their own Dynamic + Fireblocks creds):** The Dynamic environment id and any Fireblocks secrets live in this app's env; never in the dashboard.
- **D-005 (sandbox by default):** Every credential in `.env.example` is sandbox-shaped (Dynamic sandbox env, Fireblocks sandbox HMAC).
- **D-008 (cookie + SSR theming):** `?theme=<configId>` → `flow_config_id` cookie + `x-flow-config-id` header → server `fetchDemoConfig` → inline `<ThemeStyleTag>`. No FOUC.
- **No icons (Fireblocks brand rule):** numbered labels in Bandwidth Blue, triangle SVG bullets via flexbox. No `lucide-react` in chrome.
- **Light + dark mode required:** `.dark` class on `<html>`, set by an inline init script before paint. Tokens in `globals.css` flip per mode; consumer-facing surfaces must work in both.

## Gotchas

- The **Flow SDK is headless** — there's no built-in wallet picker UI. `/checkout` mounts `<WalletPickerScreen>` and `<AssetSelectorScreen>` from `@dynamic-demos/checkouts-widget` (which internally render WalletConnect QR via `qrcode.react`, search, and the multichain balance picker). Do not re-implement these in the app — extend the package instead.
- **Dynamic SDK init runs eagerly** via `<DynamicBootstrap />` mounted in the page (not inside the widget gate), because the SDK's `sdkWaitForClientInitialized(client)` only resolves when called with an explicit client reference. The singleton in `lib/dynamic/client.ts` captures the client at creation and threads it through; calling it without the arg never resolves and the widget hangs at "Booting Flow SDK…".
- **`hideDestination`** is opted-in on `/checkout` because it's a merchant flow — buyers shouldn't see the settlement vault address. Deposit and withdraw flows leave it off (default) so the buyer's own destination wallet is visible.
- **Dynamic API-aligned route contract** — `POST /api/checkouts` accepts `settlementConfig` and `destinationConfig` in the exact shape the Dynamic Flow API expects (`chainName` + `chainId` + `tokenAddress` + `tokenDecimals` for settlements; `chainName` + `type` + `identifier` for destinations). Callers build these objects using `settlementFromToken()` and `destination()` helpers from `lib/checkouts-api.ts`. The route is a thin passthrough — adding new chain families (TRON, etc.) requires no route changes, only a new settlement token in `lib/tokens.ts` and a `chainFamilyForId()` mapping in the same file.
- **Dynamic destination address + chain** (both `app/checkout/widget-demo.tsx` and `app/deposit/widget-demo.tsx`): the destination is the connected wallet's own address — resolved at runtime via the `onWalletConnected` callback from `CheckoutWidget`. The wallet's `chain` string is passed through as-is to `destinationConfig.destinations[0].chainName` (not hardcoded to `"EVM"` or `"SOL"`). The settlement token is derived from the wallet chain to keep settlement and destination consistent. Do NOT hardcode `destinationChain: "EVM"` — a Solana wallet address sent with chain `"EVM"` causes the Flow API to reject the request with "Invalid destination address … for chain EVM". See `destination-chain-resolution.test.ts` for the regression guard. In the exchange (OAuth) flow no crypto wallet is connected, so `exchangeDestinationAddress` is passed as `undefined` and the `ExchangeCheckoutWidget` guards against empty destinations before executing the transfer. In production, the exchange path destination would be the user's provisioned embedded wallet.
- **Wallet selection is explicit** — both `/deposit` and `/checkout` pass `skipAutoConnect` to `CheckoutWidget` so the widget always starts at the wallet picker, even if a wallet (e.g. an embedded wallet from the withdraw flow) is already connected in the Dynamic SDK. A disconnect button (X icon) next to the address pill lets the user clear the selected wallet and return to the picker; the host `onDisconnect` callback calls `logout()` to clear SDK-level wallet state.
- **Multi-chain wallet selection** — `WalletPickerScreen` requires `selectedWalletForChain` + `onChainSelectChange` props for multi-chain wallets (e.g. Phantom EVM + SOL) to work. Without these props, clicking a multi-chain wallet is a silent no-op. All hosts that mount `WalletPickerScreen` directly (including `/withdraw`'s `PlatformShell`) must manage chain-selection state and pass both props, plus render a chain-select header with a back button when `selectedWalletForChain` is set.
- **Withdraw embedded wallet is Solana** — `ensureSolEmbeddedWallet()` provisions a SOL WaaS wallet; balances are fetched with `networkId: 101` (`DYNAMIC_SOLANA_NETWORK_ID`). The platform anchor is `USDC_ON_SOLANA` from `settlement-options.ts`. Do NOT switch to EVM/Base without updating all withdraw components (deposit-subflow, withdraw-subflow, dashboard, use-embedded-wallet-balances, flow-config defaults) — see `withdraw-wallet-anchor.test.ts` for the regression guard.
- **Withdraw via Fireblocks vault** does NOT use EIP-7702 / NCW — it uses a plain EIP-712 typed-data intent signed by the user's embedded wallet (Dynamic SDK). NCW is deprecated in this project; see project memory `project_no_fireblocks_ncw`.
- **Reuse `@dynamic-demos/checkouts-widget`** for any wallet-source payment flow surface; `apps/shop/lib/checkout-sdk.ts` (in production via `apps/spark26`) remains the reference for the SDK wrapper shape itself.
- **`@dynamic-labs-sdk/evm@0.25.0` registry workaround**: the lockfile pins a `tarball: https://registry.npmjs.org/...` URL for this one package because the JFrog mirror's cached copy has a different integrity hash than npmjs.org's immutable upstream. Drop the override once the JFrog mirror is repaired (clear + re-mirror that package on JFrog).
