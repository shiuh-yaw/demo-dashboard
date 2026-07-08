---
name: "@dynamic-demos/checkouts-widget"
kind: package
flow_role: checkout
custody: non-custodial
status: stable
---

# @dynamic-demos/checkouts-widget

Wallet-source payment widget extracted from `apps/checkouts/`. Consumed directly by host apps as a React component — no iframe, no `postMessage`, no `?embed=1` chrome stripping. `<PaymentWidget />` carries the create → attach → quote → submit → poll → terminal Checkout Flow lifecycle internally and emits lifecycle callbacks so hosts can wire dashboard mirroring / analytics without coupling the package to either. The package never holds keys — it relies on a host-mounted `DynamicProvider` and a host-resolved `WalletAccount`.

## Capabilities

- Self-contained `amount → review → processing → done` state machine driven by `useCheckoutFlow`.
- SSR-safe wrappers over the Dynamic Flow SDK (`@dynamic-labs-sdk/client`) under `./checkout-flow`.
- Lifecycle callbacks (`onAmountSelected`, `onTransactionCreated`, `onQuoteLocked`, `onExecutionUpdate`, `onSettlementCompleted`, `onCancelled`, `onError`) so hosts can mirror to a dashboard or emit analytics.
- `localStorage` persistence of in-flight `transactionId` keyed by `storageNamespace` — survives reloads inside a single checkout session.
- `hideDestination` prop suppresses the "Destination" row on the review + loading screens for merchant flows where the settlement vault address is not buyer-relevant.
- `alwaysShowRoute` prop forces the source → destination (both-sides) token layout on the review + progress screens even when the picked token is identical to the destination token. For direct-transfer flows (source === destination, e.g. `/kyc-deposit` USDC-on-Base → merchant) that still want to show what's sent and where it lands. Default `false`. Threads `CheckoutWidget`/`PaymentWidget` → `ReviewPaymentScreen`/`TransactionProgressScreen` → `TokenConversionCard`.
- Pre-flow screens — `WalletPickerScreen` (installed wallets + WalletConnect catalog with QR + search) and `AssetSelectorScreen` (multichain balances → token picker) — let hosts plug the widget into their own connect/picker UX without re-implementing balance fetching or wallet enumeration.
- Re-exports leaf screens (`DepositAmountScreen`, `ReviewPaymentScreen`, `TransactionProgressScreen`, `TokenConversionCard`, `ScreenHeader`, `InfoBox`, `ErrorBanner`) for hosts that want partial composition.
- `balance-utils` helpers (`transformToTokenAssets`, `formatBalance`, exchange-token discriminators, Kraken adapter) — the canonical source of multichain balance shaping inside the workspace.
- Brand contract via CSS variables on a `.checkouts-widget-root` container; no dependency on `@dynamic-demos/theme`.

## Public surface

Top-level components:

- `CheckoutWidget` / `CheckoutWidgetProps` — batteries-included widget that owns the full `connect → pick → pay → done` flow. Wraps `WalletPickerScreen` + `AssetSelectorScreen` + `PaymentWidget` with `<WidgetCard>` chrome, the wallet de-dup listener, the `<PoweredByFooter />` mark, and Terms + Privacy legal links (overridable via `legalLinks`, hideable via `hideLegalLinks`). Accepts an optional `tokenFilter` predicate to filter the asset list after balances load (e.g. restrict to testnet chains). `skipAutoConnect` (default `false`) prevents the widget from auto-picking the SDK's primary wallet on mount — useful when the host wants to force explicit wallet selection each session. `onDisconnect` fires when the user clicks the disconnect (log-out icon) button next to the address pill; `onWalletConnected(address, chain)` fires when the user explicitly selects (or is auto-connected to) a wallet via the picker — `chain` is the wallet's chain family (`"EVM"`, `"SOL"`, `"TRON"`, etc.) from the Dynamic SDK's `WalletAccount.chain` property, used by hosts to set `destinationChain` and settlement config. Auto-connect (when `skipAutoConnect` is `false` and a wallet is already connected in the SDK) also fires `onWalletConnected` exactly once per distinct address, de-duplicated against repeated `walletAccountsChanged` ticks and against an immediately-preceding explicit pick. The asset selector auto-fetches balances from all enabled networks (EVM + SOL) without chain tabs — tokens are displayed in a single merged list. `postConnectScreen` (optional render prop) inserts a custom gate between wallet connection and asset selection — receives the connected `WalletAccount` and a `proceed` callback; used by `/kyc-deposit` to inject SumSub KYC verification before allowing token selection. (stable)
- `PaymentWidget` / `PaymentWidgetProps` — drop-in `amount → review → processing` widget. Use directly when the host owns its own wallet + token selection (e.g. apps/checkouts' exchange-OAuth + social-login screens). Supports `hideDestination` to suppress the merchant-vault row on review + loading. (stable)

Hooks + types:

- `useCheckoutFlow` — lifecycle hook used internally; exported for hosts composing leaf screens. (stable)
- `UseCheckoutFlowReturn`, `UseCheckoutFlowOptions`, `BeginCheckoutParams` (`destinationAddresses` is optional — omit it to fall back to the Checkout's server-side `destinationConfig.destinations`), `BeginCheckoutResult`, `SubmitParams` — companion types. (stable)
- `useWalletConnectCatalog` / `CatalogEntry` / `UseWalletConnectCatalogOptions` / `UseWalletConnectCatalogReturn` — lazy fetcher for the WalletConnect catalog, gated on `enabled` and Strict-Mode-safe. (stable)
- `Token`, `ExecutionStatus`, `ExecutionUpdate`, `ReviewQuote`, `BrandConfig` — public type aliases. (stable)

Pre-flow screens (host-mounted before `<PaymentWidget />`):

- `WalletPickerScreen` / `WalletPickerScreenProps` — installed + discovered (WalletConnect) wallet picker with QR surface, search, mobile deeplink fallback. Snapshots the prior wallet address so the parent only sees the new connection. `verifyOnConnect` (default `true`) toggles between `connectAndVerifyWithWalletProvider` (with SIWE challenge) and `connectWithWalletProvider` (no signature) for both installed and WalletConnect paths. Multi-chain wallets (e.g. Phantom EVM + SOL) trigger a chain selection sub-view via `selectedWalletForChain` / `onChainSelectChange` props — the user picks which chain to connect before the handshake begins (mirrors `apps/checkouts` pattern). Single-chain wallets connect directly. When `connectAndVerify` reports the account is already verified (re-picked provider / returned without logout), the picker adopts the existing primary account and advances instead of surfacing the SDK's "already verified" error. (stable)
- `AssetSelectorScreen` / `AssetSelectorScreenProps` — fetches multichain balances for a `WalletAccount` across all enabled networks (primary chain + secondary chains in parallel; secondary failures are silently ignored). Shows a scrollable token picker with iconify fallback, empty + error states. No chain tabs — all tokens from all chains render in a single merged list. Supports `additionalWalletAccounts` for merging balances from multiple connected wallets. (stable)
- `groupProviders` / `WalletGroup` — collapses Phantom EVM + Phantom SOL etc. into one row by brand. (stable)
- `TokenAsset`, `TokenBalance`, `MultichainBalanceResponse`, `TokenFilterOptions` — balance + asset types. (stable)

Leaf screens (for partial composition):

- `DepositAmountScreen`, `ReviewPaymentScreen`, `TransactionProgressScreen`, `TokenConversionCard`, `ScreenHeader`, `InfoBox`, `ErrorBanner` — escape hatch for hosts that don't want the whole `<PaymentWidget />`. (stable)
- `TokenInfo`, `TransactionStep`, `StepStatus`, `ErrorInfo` — screen prop types. (stable)

Helpers:

- `formatRawTokenAmount`, `formatUsd`, `formatApproxUsd`, `parseUsd`, `formatTokenAmount`, `formatBalance`, `truncateAddress`, `formatErrorMessage`, `isUserRejection` — formatting + error helpers. (stable)
- `isSolanaChainId`, `DYNAMIC_SOLANA_NETWORK_ID` — chain helpers. (stable)
- `findTokenBalance`, `getTotalBalanceValue`, `getNetworkBalances`, `normalizeBalanceResponse`, `transformToTokenAssets`, `transformKrakenToTokenAssets`, `isExchangeToken`, `logBalanceDebug` — balance shaping + Kraken adapter, canonical inside the workspace. (stable)
- `generateTransactionSteps`, `updateTransactionSteps` — step builders re-exported from `TransactionProgressScreen`. (internal — used by `apps/checkouts/` Kraken path; will be removed once `apps/checkouts/` fully delegates or the Kraken path becomes its own package.)

Subpath exports:

- `@dynamic-demos/checkouts-widget/checkout-flow` — SSR-safe SDK wrappers. (stable)
- `@dynamic-demos/checkouts-widget/checkout-flow/status-map` — `CheckoutTransaction → ExecutionUpdate` mapper. (stable)
- `@dynamic-demos/checkouts-widget/checkout-flow/storage` — `localStorage` persistence of in-flight `transactionId`. (stable)

## Required environment

None. The package reads zero env vars; every input flows through props. Host apps own all env-id resolution and Dynamic client init.

## Host responsibilities

- Mount `DynamicProvider` (host owns Dynamic client init + `addEvmExtension()` + `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID`).
- Resolve and pass the connected `WalletAccount` as a prop.
- Pass `checkoutId`, `destinationAddress`, `destinationChain`, `fromToken`, `destinationToken`, and the swap/bridge flags (`needsConversion`, `isCrossChain`).
- Optionally wire lifecycle callbacks to whatever dashboard mirror / analytics the host wants. The package emits; it never calls a dashboard.

## Brand contract

The package consumes CSS variables prefixed `--brand-*` (e.g. `--brand-fg`, `--brand-muted`, `--brand-card-gradient-start`, `--brand-card-gradient-end`, `--brand-radius`). On mount it sets them inline from the `brand` prop on the `.checkouts-widget-root` container. When `brand` is omitted the widget inherits the host's ambient `--brand-*` values. No coupling to `@dynamic-demos/theme` — hosts may use the workspace theme package, define vars in their own CSS, or both.

## Integration map

**Imports:** `@dynamic-demos/utils`, `@dynamic-demos/ui`, `@dynamic-labs/iconic`, `@dynamic-labs-sdk/client` (peer), `@dynamic-labs-sdk/evm` (peer), `react` / `react-dom` (peer), `lucide-react`, `qrcode.react`, `zod`.
**Imported by:** `apps/checkouts/`, `apps/flow/`. Both apps use `PaymentWidget` plus the pre-flow `WalletPickerScreen` + `AssetSelectorScreen` screens; `apps/checkouts` additionally consumes the leaf screens for its exchange-specific flows.

## Examples

```tsx
import { PaymentWidget } from "@dynamic-demos/checkouts-widget";

<PaymentWidget
  checkoutId="ck_..."
  walletAccount={selectedWalletAccount}
  currency="USD"
  destinationAddress="0xabc..."
  destinationChain="ETH"
  fromToken={sourceToken}
  destinationToken={destinationToken}
  needsConversion
  isCrossChain={false}
  storageNamespace="checkouts:sandbox"
  brand={brandConfig}
  onTransactionCreated={(tx) => mirrorToDashboard(tx)}
  onExecutionUpdate={(update) => track(update)}
  onSettlementCompleted={(tx) => onDone(tx)}
  onCancelled={() => mirrorCancel()}
  onError={(err) => report(err)}
/>;
```

## Do / Don't

- Do pass the connected `WalletAccount` from the host's Dynamic context — the widget never resolves one on its own.
- Do use a distinct `storageNamespace` per Dynamic environment (sandbox vs production) so in-flight `transactionId`s don't bleed across environments.
- Do wire `onCancelled` / `onError` / `onExecutionUpdate` to your dashboard mirror when you need server-side transaction state.
- Do compose leaf screens (`DepositAmountScreen`, etc.) only as an escape hatch — prefer `<PaymentWidget />` for the full flow.
- Don't import anything from `next`, `@t3-oss/env-nextjs`, or app-level paths (`@/lib/*`) inside the package. The package must stay framework-agnostic.
- Don't bypass `<PaymentWidget />` for hosts that want the standard amount → review → processing flow — composing leaf screens directly is an escape hatch, not the happy path.
- Don't read env vars inside the package. Every input is a prop.
- Don't add a `<DynamicProvider>` inside the package — the host owns Dynamic client init.
- Don't treat the WalletConnect `uri` as a completed connection — it only renders the QR. The SDK's `connect*WithWalletConnect*` functions return `{ uri, approval }`; you MUST await `approval()`, which resolves once the buyer scans + approves and is the only thing that creates the Dynamic wallet account and emits `walletAccountsChanged`. `WalletPickerScreen` owns this; dropping `approval()` regresses to "scan QR → nothing happens".

## Cross-chain EVM→SOL approval handling

Cross-chain EVM→Solana bridges (e.g. Base USDC → Solana USDC via LiFi/Across) require an on-chain ERC-20 approval on the source EVM chain before the bridge transaction can execute. The Dynamic SDK's `evmExecuteSwapTransaction` emits `onStepChange("approval")` then `onStepChange("transaction")` for these flows — same as single-chain swaps.

The `needsApproval` flag in `PaymentWidget.handleReviewConfirm` controls whether the UI generates an "Approve token" step. It must be `true` whenever the source chain is EVM and a conversion is needed, regardless of whether the flow is cross-chain. The correct test is `needsConversion && !isSolanaChainId(fromToken.chainId)`. Using `!isCrossChain` instead incorrectly skips the approval step for cross-chain EVM→SOL flows, causing a `totalSteps` mismatch that stalls the processing UI after the spending-cap approval.

## Open questions / known gaps

- A `WidgetMode` type is inline-duplicated in `review-payment-screen.tsx` and `transaction-progress-screen.tsx`. Consolidate to `src/lib/types.ts` in a follow-up.
- `icons.tsx` is duplicated between `apps/checkouts/components/` and the package. Consolidate when a third consumer needs the icons.
- `generateTransactionSteps` / `updateTransactionSteps` are exported for the Kraken integration in `apps/checkouts/`. Remove the re-exports once `apps/checkouts/` fully delegates, or once the Kraken path is extracted to its own package.
- `fromChainName` is currently set to `destinationChain` because the package has no chainId → Dynamic `Chain`-enum lookup. Only relevant for cross-chain flows; track a future `fromChain` prop once the SDK exposes a public mapping helper.
- No real-network smoke E2E in CI — coverage is unit + jsdom smoke only.
