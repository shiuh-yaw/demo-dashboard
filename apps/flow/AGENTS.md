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
- ✅ Checkout scenario (Pitch + provisional Code view) — full Flow SDK lifecycle: `createCheckoutTransaction` → `attachCheckoutTransactionSource` → `getCheckoutTransactionQuote` → `submitCheckoutTransaction` → poll
- ✅ Deposit scenario (same machinery, user-input amount framing)
- ✅ Withdraw placeholder (full vault/intent/webhook orchestration shipped in follow-up PR)
- ✅ Fireblocks + Dynamic brand chrome, light + dark mode, no-FOUC init script

Coming in follow-up PRs:

- 🔜 Phase 6: FlowBuilder + LivePreview + EventLog + CodePanel (shiki-rendered TS/cURL/Droplet tabs)
- 🔜 Phase 7: Chat-to-flow (`@anthropic-ai/sdk@0.71.2` with prompt caching → IntentCard)
- 🔜 Phase 9: Brand theme switcher (Postgres `Brand` rows)
- 🔜 Phase 10: Withdraw scenario (`WithdrawIntent` Prisma model + EIP-712 + FB webhook)

## Exchange connector support

Exchange connectors (currently Kraken) are supported as funding sources alongside external wallets. The implementation follows the adapter pattern from `apps/checkouts`:

- **`lib/exchanges/`** — adapter registry, types, Kraken adapter, OAuth redirect state persistence.
- **`lib/dynamic/flow-sdk.ts`** — SSR-safe wrappers for exchange/OAuth SDK functions (`authenticateWithSocial`, `getKrakenAccounts`, `createKrakenExchangeTransfer`, etc.).
- **`components/exchange-checkout-widget.tsx`** — wraps `<CheckoutWidget>` with exchange support. In wallet mode, renders the standard widget with exchange rows injected via `walletPickerExtrasAfter`. In exchange mode, renders a custom flow: asset list → whitelisting check → review → transfer execution.
- **`components/exchange-rows.tsx`**, **`exchange-asset-list.tsx`**, **`exchange-whitelisting-screen.tsx`** — leaf components for the exchange path.

Adding a new exchange: create `lib/exchanges/<name>.ts` implementing `ExchangeAdapter`, register in `lib/exchanges/index.ts`. No other changes needed — the `ExchangeCheckoutWidget` consumes adapters generically.

Exchange-specific flows are owned by this app, not delegated to the package (mirrors the `apps/checkouts` pattern).

Plan-of-record: `~/.claude/plans/users-etesenair-desktop-rd-product-brie-radiant-starfish.md`.

## Provider docs

Always consult the upstream docs before changing Flow wiring:

- **Overview:** https://www.dynamic.xyz/docs/overview/deposit-with-crypto
- **JS SDK reference:**
  - https://www.dynamic.xyz/docs/javascript/reference/client/create-checkout-transaction
  - https://www.dynamic.xyz/docs/javascript/reference/client/checkout-flow
  - https://www.dynamic.xyz/docs/javascript/reference/client/attach-checkout-transaction-source
  - https://www.dynamic.xyz/docs/javascript/reference/client/get-checkout-transaction-quote
  - https://www.dynamic.xyz/docs/javascript/reference/client/submit-checkout-transaction
  - https://www.dynamic.xyz/docs/javascript/reference/client/get-checkout-transaction
  - https://www.dynamic.xyz/docs/javascript/reference/client/cancel-checkout-transaction
- **REST API:**
  - https://www.dynamic.xyz/docs/api-reference/checkout/create-a-checkout
  - https://www.dynamic.xyz/docs/api-reference/checkout/get-a-checkout-by-id
  - https://www.dynamic.xyz/docs/api-reference/checkout/update-a-checkout
  - https://www.dynamic.xyz/docs/api-reference/checkout/delete-a-checkout
- **Recipes:** https://www.dynamic.xyz/docs/recipes/integrations/checkouts/checkout-api

## Public surface

| Route | Purpose | Auth |
|---|---|---|
| `/` | Landing — hero, scenario tiles, persona scroll story | Public |
| `/checkout?id=<cfg>` | Merchant checkout scenario (Pitch ↔ Code) | Public (auth-on-action) |
| `/deposit?id=<cfg>` | Platform deposit scenario | Public (auth-on-action) |
| `/withdraw?id=<cfg>` | Withdraw — placeholder until Phase 10 | Public |
| `/api/withdraws/[id]` | Withdraw intent state (Phase 10) | Auth-required |

## Env reference

See `.env.example`. All values target sandbox by default per D-005. Production opt-in requires explicit value + `[prod-creds]` PR title.

| Variable | Required for | Server-only? |
|---|---|---|
| `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` | Dynamic SDK boot (all scenarios) | No (NEXT_PUBLIC) |
| `NEXT_PUBLIC_DYNAMIC_CHECKOUT_ID` | Override the sandbox Checkout id on `/checkout` — optional, a default is baked in | No (NEXT_PUBLIC) |
| `DYNAMIC_API_TOKEN` | Mint per-withdraw Checkouts via `POST /api/checkouts` (required only for the withdraw flow) | Yes |

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
- **TEMPORARY destination address** (`DEMO_DESTINATION_ADDRESS` in `app/checkout/widget-demo.tsx`): the Checkout id in the sandbox doesn't have server-side `destinationConfig.destinations` baked in, so we pass a placeholder address per-transaction to satisfy the API's `^[A-Za-z0-9_]{18,100}$` regex. Bake destinations into the Checkout server-side and drop this prop before any non-internal demo.
- **Withdraw via Fireblocks vault** does NOT use EIP-7702 / NCW — it uses a plain EIP-712 typed-data intent signed by the user's embedded wallet (Dynamic SDK). NCW is deprecated in this project; see project memory `project_no_fireblocks_ncw`.
- **Reuse `@dynamic-demos/checkouts-widget`** for any wallet-source payment flow surface; `apps/shop/lib/checkout-sdk.ts` (in production via `apps/spark26`) remains the reference for the SDK wrapper shape itself.
- **`@dynamic-labs-sdk/evm@0.25.0` registry workaround**: the lockfile pins a `tarball: https://registry.npmjs.org/...` URL for this one package because the JFrog mirror's cached copy has a different integrity hash than npmjs.org's immutable upstream. Drop the override once the JFrog mirror is repaired (clear + re-mirror that package on JFrog).
