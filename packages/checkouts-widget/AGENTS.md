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
- SSR-safe wrappers over the Dynamic Checkout Flow SDK (`@dynamic-labs-sdk/client`) under `./checkout-flow`.
- Lifecycle callbacks (`onAmountSelected`, `onTransactionCreated`, `onQuoteLocked`, `onExecutionUpdate`, `onSettlementCompleted`, `onCancelled`, `onError`) so hosts can mirror to a dashboard or emit analytics.
- `localStorage` persistence of in-flight `transactionId` keyed by `storageNamespace` — survives reloads inside a single checkout session.
- Re-exports leaf screens (`DepositAmountScreen`, `ReviewPaymentScreen`, `TransactionProgressScreen`, `TokenConversionCard`, `ScreenHeader`, `InfoBox`, `ErrorBanner`) for hosts that want partial composition.
- Brand contract via CSS variables on a `.checkouts-widget-root` container; no dependency on `@dynamic-demos/theme`.

## Public surface

Top-level component:

- `PaymentWidget` / `PaymentWidgetProps` — drop-in `amount → review → processing` widget. (stable)

Hooks + types:

- `useCheckoutFlow` — lifecycle hook used internally; exported for hosts composing leaf screens. (stable)
- `UseCheckoutFlowReturn`, `UseCheckoutFlowOptions`, `BeginCheckoutParams`, `BeginCheckoutResult`, `SubmitParams` — companion types. (stable)
- `Token`, `ExecutionStatus`, `ExecutionUpdate`, `ReviewQuote`, `BrandConfig` — public type aliases. (stable)

Leaf screens (for partial composition):

- `DepositAmountScreen`, `ReviewPaymentScreen`, `TransactionProgressScreen`, `TokenConversionCard`, `ScreenHeader`, `InfoBox`, `ErrorBanner` — escape hatch for hosts that don't want the whole `<PaymentWidget />`. (stable)
- `TokenInfo`, `TransactionStep`, `StepStatus`, `ErrorInfo` — screen prop types. (stable)

Helpers:

- `formatRawTokenAmount`, `formatUsd`, `formatApproxUsd`, `parseUsd`, `formatTokenAmount`, `formatBalance`, `truncateAddress`, `formatErrorMessage`, `isUserRejection` — formatting + error helpers. (stable)
- `isSolanaChainId`, `DYNAMIC_SOLANA_NETWORK_ID` — chain helpers. (stable)
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

**Imports:** `@dynamic-demos/utils`, `@dynamic-demos/ui`, `@dynamic-labs/iconic`, `@dynamic-labs-sdk/client` (peer), `@dynamic-labs-sdk/evm` (peer), `react` / `react-dom` (peer), `lucide-react`, `zod`.
**Imported by:** `apps/checkouts/` (today). The next consumer is the new in-monorepo host app being built in a sibling worktree.

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

## Open questions / known gaps

- A `WidgetMode` type is inline-duplicated in `review-payment-screen.tsx` and `transaction-progress-screen.tsx`. Consolidate to `src/lib/types.ts` in a follow-up.
- `icons.tsx` is duplicated between `apps/checkouts/components/` and the package. Consolidate when a third consumer needs the icons.
- `generateTransactionSteps` / `updateTransactionSteps` are exported for the Kraken integration in `apps/checkouts/`. Remove the re-exports once `apps/checkouts/` fully delegates, or once the Kraken path is extracted to its own package.
- `fromChainName` is currently set to `destinationChain` because the package has no chainId → Dynamic `Chain`-enum lookup. Only relevant for cross-chain flows; track a future `fromChain` prop once the SDK exposes a public mapping helper.
- No real-network smoke E2E in CI — coverage is unit + jsdom smoke only.
