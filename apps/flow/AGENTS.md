---
name: "@dynamic-demos/flow"
kind: app
flow_role: checkout
custody: mixed
status: experimental
regions:
  - country: ANY
    currencies: [USDC, USDT, ETH, SOL, BTC, TRX]
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
- ✅ Shared Dynamic site chrome (2026-07): the root layout wraps every page in packages/ui `SiteHeader` + `SiteFooter`. Flow keeps its own product identity - the Flow wordmark rides the SiteHeader `logo` slot and links to `/` (`logoHref`), while the "Demos / Flow" crumb + hover grid link to the catalog (`homeHref`). Scenario heroes use the shared `ScenarioHero`/`RouteChip`/`ChipArrow` (generalized FROM this app; the local copies and `TopBar` are deleted - `components/scenario-chrome.tsx` keeps only the flow-specific `ScenarioSwitcher`, `ComingSoon`, `prettyChain`, `FlowMark`). Shiki styling comes from `@import "@dynamic-demos/ui/code-panel.css"` in globals. The sticky widget column offset is `lg:top-[104px]` to clear the h-20 sticky header. Tab metadata via `buildDemoMetadata` (packages/theme). The right-rail code panel is the shared `CodePanel` behind a thin adapter (`components/code-panel.tsx`): flow supplies all four tabs (SDK/API steps, Webhooks pane, Helpers pane), the mainnet-only `stepsNotice`, and the `#exchange` hash alias; the pane bodies + card types stay flow-local (`code-panel-{helpers-pane,webhooks-pane,notices}.tsx`, `code-panel-types.ts`) and import `CodeFrame`/`DocsLink`/`renderProse` from @dynamic-demos/ui. The dormant "Scaffold with AI" chip + prompt content were removed (2026-07), not migrated.
- ✅ Prospect themes (D-008, 2026-07): the previously-dormant middleware (`?theme=` → `flow_config_id` cookie → `x-flow-config-id`) is now consumed by the root layout - a `React.cache`-wrapped fetch shared with `generateMetadata` injects `--brand-*` overrides via `<ThemeStyleTag overridesOnly>` (branded requests only; unbranded emits nothing) and titles the tab as the prospect's app. Flow has NO DemoConfig kind: it fetches `demoType: "trade"` purely as a payload-shape selector and relies on the dashboard's prospect fallback, so `?theme=` takes a prospect id or any config id (resolved via its prospect). The env var for the dashboard origin is `DASHBOARD_API_URL` (threaded explicitly - fetchDemoConfig's env chain doesn't know that name; `DASHBOARD_URL` also works). A shared `ResetThemeButton` (link variant) rides the SiteFooter's `extraLinks` slot on branded requests. Branded requests follow the wallet/earn/trade header rule with a flow twist: the Dynamic SiteHeader hides and the shared `ScenarioBrandRow variant="bar"` takes its place (STICKY, SiteHeader geometry - h-20, top-0 - so the scenario pages' 104px widget offset holds under both states; brand-token themed, prospect logo via `ScenarioBrandImage align="bar"` linking home via `logoHref="/"` + Book a call); unbranded keeps the Flow-wordmark SiteHeader. Heroes, chips, and cards restyle via brand tokens; the SiteFooter stays under every theme.
- ✅ Deposit-address funding source (2026-07) - reached from the category screen's "Deposit address" row (see the source-category bullet below; row hidden unless `NEXT_PUBLIC_FLOW_DEPOSIT_DESTINATION` is set), which opens a chain/asset select: pick BTC / ETH / USDC-Base / USDC-Solana (native entries omit `tokenAddress` - the quote defaults to the chain's native asset; no TRON - Relay rejects TRON -> EVM deposit-address routes), the app creates a Flow settling USDC on Base (testnet mode: Arb Sepolia USDC) and attaches a `deposit_address` source, `getFlowQuote` returns `flow.depositAddress` (rendered as QR via the package's `QrSurface` + copyable address + exact `fromAmount`), and a 3s poll on `getFlow` advances to the confirmation on `source_confirmed` and keeps polling until settlement is terminal (`settlementState: completed`). No signing step; addresses expire after 48h (API-side `expired` state). Catalog + classifier in `lib/deposit-address.ts` (Dynamic chain-id namespace: `"1"` BTC, `"101"` SOL - NOT EVM ids); screens in `components/deposit-address-{asset-list,awaiting}.tsx`; state machine in `exchange-checkout-widget.tsx`.
- ✅ Source-category picker (2026-07) - `/deposit` + `/checkout` open on three rows (Wallet / Exchange / Deposit address) via `sourceCategories` on `ExchangeCheckoutWidget`, rendered through the package's `walletPickerOverride` slot so the amount-first flow stays inside `CheckoutWidget`. Every drill-in screen (wallet list, exchange list, deposit-address asset list) opens with the shared `DrillInHeader` (`components/drill-in-header.tsx`, chevron back button left of the title - widget navigation stays inside the card); Exchange opens the supported-exchanges list (`ExchangeRows`) before OAuth; Deposit address opens the chain/asset select (row hidden when `NEXT_PUBLIC_FLOW_DEPOSIT_DESTINATION` is unset). Rows in `components/source-category-rows.tsx`; the awaiting screen shows copyable full-precision amount + address rows (`rawAmountToDecimal` - display caps at 6 decimals but copy must carry every digit).
- ✅ `network` / `to_address` URL params (2026-07) - opt-in destination override on `/checkout`, `/deposit`, `/kyc-deposit`; with neither present every scenario behaves as its default. `network` is a `lib/tokens.ts` chain key (`base`, `ethereum`, `solana`, `arb-sepolia`, `polygon`, ...); `to_address` is validated against the resolved chain family (EVM / SOL). Resolution is pure + unit-tested in `lib/destination-override.ts` (`resolveDestinationOverride` for checkout/deposit, `resolveAddressOverride` for kyc). Checkout + Deposit: both params override the destination across every funding path (wallet, exchange, deposit-address) and win over the testnet toggle; `to_address` alone also enables the deposit-address row (same role as `NEXT_PUBLIC_FLOW_DEPOSIT_DESTINATION`). KYC Deposit: `network` is ignored (settlement stays USDC on Base Sepolia); `to_address` (valid EVM) redirects where the settled USDC lands. Invalid / partial / unknown params fall back to the scenario default (dev-only `console.warn`). Pages resolve the override server-side and thread it to the widget + code panel/hero. Caveat: the override only redirects the destination - the source token picker stays testnet-filtered when the testnet toggle is on, so a mainnet `network` while testnet is toggled is an unroutable operator-error combination (leave the toggle off when passing a mainnet override).

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
| `/api/kyc-deposit/balances` | USDC-on-Base-Sepolia balance for the connected wallet via Alchemy (Dynamic's balances API doesn't cover Base Sepolia); backs the widget's `fetchTokens` override on this demo only | Auth-required |
| `/api/withdraws/[id]` | Withdraw intent state (Phase 10) | Auth-required |

## Env reference

See `.env.example`. All values target sandbox by default per D-005. Production opt-in requires explicit value + `[prod-creds]` PR title.

| Variable | Required for | Server-only? |
|---|---|---|
| `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` | Dynamic SDK boot (all scenarios) | No (NEXT_PUBLIC) |
| `NEXT_PUBLIC_DYNAMIC_CHECKOUT_ID` | Override the sandbox Checkout id on `/checkout` — optional, a default is baked in | No (NEXT_PUBLIC) |
| `DYNAMIC_API_KEY` | One Dynamic env API token used server-side (same var name as every other demo app). Needs **flow.write** (Flow creation via `POST /api/checkouts`) **and** user read+write (`/kyc-deposit` persists `is_kyc_completed` via `@dynamic-demos/dynamic`). | Yes |
| `DASHBOARD_API_URL` | `/kyc-deposit` scenario — proxies SumSub calls to dashboard (D-003) | Yes |
| `ALCHEMY_API_KEY` | `/api/kyc-deposit/balances` - Base Sepolia USDC balance reads (Alchemy is D-003-exempt like proceeds/remittance/trade; see `packages/alchemy/AGENTS.md`) | Yes |
| `NEXT_PUBLIC_FLOW_DEPOSIT_DESTINATION` | Deposit-address funding source on `/deposit` + `/checkout` - EVM settlement destination for flows created with no connected wallet. Row hidden when unset, unless the `to_address` URL param supplies a destination (which overrides this value and enables the row per-link). | No (NEXT_PUBLIC; public address, not a secret) |
| `NEXT_PUBLIC_TRACK_URL` | GTM ingest base URL for `@dynamic-demos/analytics` - optional. Unset -> `<GtmTracker>`/`useTrack()` are total no-ops; the app builds and runs unchanged. | No (NEXT_PUBLIC) |

## Analytics

`<GtmTracker demoSlug="flow">` wraps the tree in `app/layout.tsx` (no-ops with `NEXT_PUBLIC_TRACK_URL` unset). Pageviews and heartbeats are automatic (package-owned). `authenticated` - the shared fleet-wide milestone (`useIdentify`, `@dynamic-demos/analytics`) - is mounted via `<IdentityBridge />` (`components/analytics/identity-bridge.tsx`, in the layout, inside `<Providers>`), fed by `hooks/use-authenticated-user.ts` (gated on `hooks/use-client-initialized.ts`). Flow's scenarios connect wallets at different verification levels - `checkout`/`deposit` are connect-only (`verifyOnConnect={false}`), `kyc-deposit`/`withdraw` verify the wallet - so `client.user` (and therefore the milestone) only populates for the verified flows; connect-only scenarios correctly never fire it. No other per-app milestone taxonomy is wired up yet.

## Architecture invariants

- **D-003 (apps hold their own Dynamic + Fireblocks creds):** The Dynamic environment id and any Fireblocks secrets live in this app's env; never in the dashboard.
- **D-005 (sandbox by default):** Every credential in `.env.example` is sandbox-shaped (Dynamic sandbox env, Fireblocks sandbox HMAC).
- **D-008 (cookie + SSR theming):** `?theme=<configId>` → `flow_config_id` cookie + `x-flow-config-id` header → server `fetchDemoConfig` → inline `<ThemeStyleTag>`. No FOUC.
- **No icons (Fireblocks brand rule):** numbered labels in Bandwidth Blue, triangle SVG bullets via flexbox. No `lucide-react` in chrome.
- **Light + dark mode required:** `.dark` class on `<html>`, set by an inline init script before paint. Tokens in `globals.css` flip per mode; consumer-facing surfaces must work in both.
- **Branded-demo noindex:** `middleware.ts` sets `X-Robots-Tag: noindex, nofollow` on branded demo URLs (`?share=` and/or `?theme=` present, via `applyBrandedNoIndex` from `@dynamic-demos/dynamic/noindex`); the bare `/` URL stays indexable.
- **Generic OG/Twitter unfurl:** `app/opengraph-image.tsx` returns the shared `renderDemoOgImage` (`@dynamic-demos/dynamic/og-image`) - a fixed "Flow" preview with no prospect/theme data, identical for branded and bare URLs (unlike the noindex rule above, this also protects the link *preview* itself, not just search indexing).

## Gotchas

- The **Flow SDK is headless** — there's no built-in wallet picker UI. `/checkout` mounts `<WalletPickerScreen>` and `<AssetSelectorScreen>` from `@dynamic-demos/checkouts-widget` (which internally render WalletConnect QR via `qrcode.react`, search, and the multichain balance picker). Do not re-implement these in the app — extend the package instead.
- **Dynamic SDK init runs eagerly** via `<DynamicBootstrap />` mounted in the page (not inside the widget gate), because the SDK's `sdkWaitForClientInitialized(client)` only resolves when called with an explicit client reference. The singleton in `lib/dynamic/client.ts` captures the client at creation and threads it through; calling it without the arg never resolves and the widget hangs at "Booting Flow SDK…".
- **`hideDestination`** is opted-in on `/checkout` because it's a merchant flow — buyers shouldn't see the settlement vault address. Deposit and withdraw flows leave it off (default) so the buyer's own destination wallet is visible.
- **Dynamic API-aligned route contract** — `POST /api/checkouts` accepts `settlementConfig` and `destinationConfig` in the exact shape the Dynamic Flow API expects (`chainName` + `chainId` + `tokenAddress` + `tokenDecimals` for settlements; `chainName` + `type` + `identifier` for destinations). Callers build these objects using `settlementFromToken()` and `destination()` helpers from `lib/checkouts-api.ts`. The route is a thin passthrough — adding new chain families requires no route changes, only a new settlement token in `lib/tokens.ts` and a `chainFamilyForId()` mapping in the same file. TRON is supported: `chainFamilyForId(728126428)` returns `"TRON"`, and `USDT_TRON` / `USDC_TRON` / `TRX_TRON` are available in the token catalog.
- **Dynamic destination address + chain** (both `app/checkout/widget-demo.tsx` and `app/deposit/widget-demo.tsx`): the destination is the connected wallet's own address — resolved at runtime via the `onWalletConnected` callback from `CheckoutWidget`. The wallet's `chain` string is passed through as-is to `destinationConfig.destinations[0].chainName` (not hardcoded to `"EVM"` or `"SOL"`). The settlement token is derived from the wallet chain to keep settlement and destination consistent. Do NOT hardcode `destinationChain: "EVM"` — a Solana wallet address sent with chain `"EVM"` causes the Flow API to reject the request with "Invalid destination address … for chain EVM". See `destination-chain-resolution.test.ts` for the regression guard. In the exchange (OAuth) flow no crypto wallet is connected, so `exchangeDestinationAddress` is passed as `undefined` and the `ExchangeCheckoutWidget` guards against empty destinations before executing the transfer. In production, the exchange path destination would be the user's provisioned embedded wallet.
- **Wallet selection is explicit** — both `/deposit` and `/checkout` pass `skipAutoConnect` to `CheckoutWidget` so the widget always starts at the wallet picker, even if a wallet (e.g. an embedded wallet from the withdraw flow) is already connected in the Dynamic SDK. A disconnect button (X icon) next to the address pill lets the user clear the selected wallet and return to the picker; the host `onDisconnect` callback calls `logout()` to clear SDK-level wallet state.
- **Multi-chain wallet selection** — `WalletPickerScreen` requires `selectedWalletForChain` + `onChainSelectChange` props for multi-chain wallets (e.g. Phantom EVM + SOL) to work. Without these props, clicking a multi-chain wallet is a silent no-op. All hosts that mount `WalletPickerScreen` directly (including `/withdraw`'s `PlatformShell`) must manage chain-selection state and pass both props, plus render a chain-select header with a back button when `selectedWalletForChain` is set.
- **Withdraw embedded wallet is Solana** — `ensureSolEmbeddedWallet()` provisions a SOL WaaS wallet; balances are fetched with `networkId: 101` (`DYNAMIC_SOLANA_NETWORK_ID`). The platform anchor is `USDC_ON_SOLANA` from `settlement-options.ts`. Do NOT switch to EVM/Base without updating all withdraw components (deposit-subflow, withdraw-subflow, dashboard, use-embedded-wallet-balances, flow-config defaults) — see `withdraw-wallet-anchor.test.ts` for the regression guard.
- **Withdraw via Fireblocks vault** does NOT use EIP-7702 / NCW — it uses a plain EIP-712 typed-data intent signed by the user's embedded wallet (Dynamic SDK). NCW is deprecated in this project; see project memory `project_no_fireblocks_ncw`.
- **TRON chain support** — The Dynamic client loads `addTronExtension(client)` alongside EVM and Solana. TRON settlement options (`USDT_TRON`, `TRX_TRON`) are available in the withdraw flow. Checkout and deposit resolve TRON wallets to `USDT_TRON` as the settlement token. The `chainFamilyForId(728126428)` mapping returns `"TRON"` so destination/settlement configs pass through correctly.
- **Reuse `@dynamic-demos/checkouts-widget`** for any wallet-source payment flow surface; `apps/shop/lib/checkout-sdk.ts` (in production via `apps/spark26`) remains the reference for the SDK wrapper shape itself.
- **`@dynamic-labs-sdk/evm@0.25.0` registry workaround**: the lockfile pins a `tarball: https://registry.npmjs.org/...` URL for this one package because the JFrog mirror's cached copy has a different integrity hash than npmjs.org's immutable upstream. Drop the override once the JFrog mirror is repaired (clear + re-mirror that package on JFrog).
- **Deposit-address source has no submit step** - do not route it through `useCheckoutFlow` or `submitFlowTransaction`. The flow sits in `quoted` until Dynamic detects the inbound transfer (`source_confirmed`). The poll has no client timeout by design; cancel via `cancelCheckoutTransaction` on cancel from the awaiting screen. `fromChainId` values come from Dynamic's chain-id namespace (`"1"` = BTC), not the EVM namespace in `lib/tokens.ts`. Native assets (BTC, ETH) omit `tokenAddress` and rely on getFlowQuote's native-token default. TRON (id `"728126428"`) attaches fine but Relay rejects TRON -> EVM deposit-address routes at quote time - re-add the catalog entry only after Dynamic supports that route.
- **`/kyc-deposit` must NOT enable `sourceCategories`** - it mounts the same `ExchangeCheckoutWidget` but is a wallet-connect KYC story; the default-off path preserves its plain wallet list exactly.
