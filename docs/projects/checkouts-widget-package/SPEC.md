# `packages/checkouts-widget` Package Extraction — Design

**Date:** 2026-05-20
**Status:** Proposed
**Worktree:** `checkouts-checkout-flow` (lands alongside the Checkout Flow migration)

## Goal

Extract the wallet-source payment widget from `apps/checkouts/` into a workspace package (`packages/checkouts-widget/`) so a new in-monorepo host app (developed in a separate worktree) can import it directly as a React component — no iframe, no `postMessage`, no `?embed=1` chrome stripping. `apps/checkouts/` becomes a thin consumer of the same package.

## Non-goals

- Extracting the Kraken exchange OAuth flow. That path stays in `apps/checkouts/` for now — the new host app uses only the wallet flow. A future PR can extract Kraken if needed.
- Building the new host app. That work happens in a separate worktree against this package's published surface.
- iframe `postMessage` / auto-sizing / `?embed=1`. Approach C makes those unnecessary for in-monorepo embedding. External-customer iframe embedding is a future concern.
- Moving the dashboard transaction mirror (`/api/checkouts/<id>/transactions`) into the package. The package emits lifecycle callbacks; consuming apps choose whether to mirror.

## Architecture

```
packages/checkouts-widget/
├── package.json                                 # @dynamic-demos/checkouts-widget
├── tsconfig.json                                # extends packages/tsconfig/react-library.json
├── src/
│   ├── index.ts                                 # public surface
│   ├── PaymentWidget.tsx                        # top-level component (props in, callbacks out)
│   ├── hooks/
│   │   └── use-checkout-flow.ts                 # moved from apps/checkouts/hooks/
│   ├── checkout-flow/                           # moved from apps/checkouts/lib/checkout-flow/
│   │   ├── index.ts                             # SSR-safe SDK wrappers
│   │   ├── status-map.ts                        # CheckoutTransaction → ExecutionUpdate
│   │   └── storage.ts                           # localStorage persistence
│   ├── components/
│   │   ├── screens/                             # amount-screen, review-screen, processing-screen
│   │   ├── payment-modal/                       # deposit-amount-screen, token-conversion-card, screen-header, info-box, error-banner, review-payment-screen, transaction-progress-screen
│   │   └── icons.tsx
│   ├── lib/
│   │   ├── format.ts                            # formatRawTokenAmount, formatUsd, isUserRejection, formatErrorMessage
│   │   ├── widget-config.ts                     # chain-id helpers + WidgetConfig type
│   │   └── types.ts                             # ExecutionUpdate, ReviewQuote, BrandConfig, etc.
│   └── styles.css                               # widget-specific Tailwind classes (theme variables consumed, not defined)
└── __tests__/                                   # moved from apps/checkouts/__tests__/
```

### What stays in `apps/checkouts/`

| Concern | Why it stays |
|---|---|
| `app/` (Next.js routes, layout) | Next.js-specific |
| `lib/env.ts` (`@t3-oss/env-nextjs`) | App-specific env validation |
| `lib/dynamicClient.ts` | The host mounts the Dynamic provider — `apps/checkouts/` is one such host |
| `lib/api/` (dashboard mirror calls) | Demo-specific dashboard integration |
| `lib/exchanges/`, Kraken screens, `use-exchange-oauth` | Out of v1 scope |
| `hooks/use-auth.ts`, `hooks/use-transaction.ts` | Auth & dashboard-mirror state — host concerns |
| `components/connect-wallet-screen.tsx`, `embedded-wallet-widget.tsx`, `widget-nav.tsx`, `payment-page-layout.tsx`, `widget-layout.tsx` | Page chrome — host concerns |
| `components/payment-modal/asset-selector-screen.tsx`, `connected-wallets-screen.tsx`, `wallet-selector-screen.tsx`, `wc-*.tsx`, `kraken-whitelisting-screen.tsx` | Wallet-selection and Kraken screens are host-rendered; the widget receives the chosen wallet account as a prop |

### Package public surface

```tsx
import {
  PaymentWidget,
  type PaymentWidgetProps,
  type BrandConfig,
  type ExecutionUpdate,
  type ReviewQuote,
} from "@dynamic-demos/checkouts-widget";

<PaymentWidget
  // Required
  checkoutId="ck_..."                              // Dynamic Checkout id
  walletAccount={selectedWalletAccount}            // host-resolved WalletAccount
  currency="USD"
  destinationAddress="0x..."
  destinationChain="ETH"                           // CheckoutChain enum
  fromToken={tokenAsset}                           // host picks the asset before mounting the widget
  destinationToken={destToken}                     // destination token metadata — used by review screen + amount formatting
  needsConversion={true}                           // source token differs from destination token — drives the swap step
  isCrossChain={false}                             // source chain differs from destination chain — drives the bridge step

  // Optional
  amount="100.00"                                  // human amount in `currency` units; when null/empty/undefined, the widget renders its own amount-picker screen first
  presetAmounts={[5, 50, 100, 500]}                // optional quick-pick chips on the amount-picker screen (defaults to [5, 50, 100, 500])
  brand={brandConfig}                              // colors, logo, radius — applied via CSS variables on the widget root
  memo={{ externalId: "..." }}                     // forwarded to createCheckoutTransaction

  // Lifecycle callbacks (all optional)
  onAmountSelected={(amount) => ...}               // fires when the user submits the amount picker (only fires when `amount` was not provided as a prop)
  onTransactionCreated={(tx) => ...}               // after createCheckoutTransaction succeeds
  onQuoteLocked={(quote) => ...}                   // after getCheckoutTransactionQuote succeeds
  onExecutionUpdate={(update) => ...}              // every state transition during submit/poll
  onSettlementCompleted={(tx) => ...}              // terminal success
  onCancelled={() => ...}                          // user cancelled mid-flow
  onError={(err) => ...}                           // non-rejection failures
/>
```

### Boundary decisions (recap from chat)

1. **Dynamic client ownership** — host mounts `DynamicProvider`. Widget calls SDK functions directly (`getWalletAccounts`, `connectAndVerifyWithWalletProvider`) which use the ambient singleton. Two consequences:
   - Widget has no `<DynamicProvider>` of its own.
   - Host is responsible for `createDynamicClient` + `addEvmExtension()` + `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID`.
   - `apps/checkouts/lib/dynamicClient.ts` stays in `apps/checkouts/` (it's the demo's host init).
2. **Configuration as props** — package reads zero env vars; `checkoutId`, `brand`, `destinationAddress`, etc. are all props. `apps/checkouts/` keeps its current `fetchDemoConfig` call in `(widget)/page.tsx` and threads the result down.
3. **Lifecycle callbacks** — `apps/checkouts/` wires the existing `cancelTransaction`/`failTransaction`/`useTransaction` mirror calls into the callback props. No dashboard coupling inside the package. The new host can ignore the callbacks or wire its own analytics.

### Screen boundary

The widget mounts after the host has resolved a wallet account and source token. Amount is optional — the widget owns the amount-picker screen and renders it as the first step when `amount` is null/empty/undefined.

- **Host renders (before mounting `<PaymentWidget />`):** connect-wallet, wallet selector, connected-wallets list, asset/balance selector, exchange-OAuth (Kraken etc.). When the user picks an asset, the host mounts `<PaymentWidget />` with `walletAccount` + `fromToken` (and optionally `amount` if it has one).
- **Package renders:** amount picker (if `amount` not supplied) → review screen (`review-payment-screen`, `token-conversion-card`) → processing screen (`transaction-progress-screen`) → terminal state. The widget owns the amount-entry, create→quote→submit→poll lifecycle internally via `useCheckoutFlow`.
- **`apps/checkouts/components/payment-widget/index.tsx`** keeps its full navigation logic but, when the user reaches the amount/submit stage, renders `<PaymentWidget />` from the package instead of the inline amount/review/processing screens it used to render. The existing app currently routes through `deposit-amount-screen` itself — in the new world, it stops rendering that screen and lets the package render it when `amount` is null.

**Amount-picker contract:** when `amount` is omitted, the widget mounts the deposit-amount-screen first. On submit, it transitions to the review screen and fires `onAmountSelected(amount)` for hosts that want to track / persist the chosen amount. When `amount` IS supplied, the picker is skipped and the widget mounts directly into review.

### Brand contract

The package consumes CSS variables prefixed `--brand-*` (already the convention in the existing code). It sets them from the `brand` prop on its root element via inline `style={{ '--brand-fg': brand.fg, ... }}`. Host can override by setting them higher up; passing `brand={undefined}` falls back to the host's ambient values. No coupling to `@dynamic-demos/theme`.

### Dependency graph

Package depends on:
- `@dynamic-labs-sdk/client`, `@dynamic-labs-sdk/evm` (peer)
- `@dynamic-labs/iconic`
- `@dynamic-demos/ui` (for `WidgetCard`) — workspace
- `@dynamic-demos/utils` (for `cn`) — workspace
- `react` (peer)
- `zod`

Package does NOT depend on:
- `next`, `@t3-oss/env-nextjs`
- `@dynamic-demos/theme` (CSS vars consumed, not defined)
- `@dynamic-demos/transactions` (dashboard mirror)
- `@lifi/sdk` (already dropped in the Checkout Flow migration)

### Tests

- Move existing tests into `packages/checkouts-widget/__tests__/`:
  - `checkout-flow/wrappers.test.ts` → `__tests__/checkout-flow/wrappers.test.ts`
  - `checkout-flow/status-map.test.ts` → `__tests__/checkout-flow/status-map.test.ts`
  - `use-checkout-flow.test.ts` → `__tests__/use-checkout-flow.test.ts`
- Add a smoke test: `__tests__/PaymentWidget.smoke.test.tsx` — renders with required props, asserts the initial review screen markup mounts (mocking `@dynamic-labs-sdk/client`).
- Package gets its own `vitest.config.ts` mirroring `apps/checkouts/vitest.config.ts` (jsdom env, `@/` alias → `./src`).
- `apps/checkouts/__tests__/` keeps only tests that exercise app-level code (currently none of the moved tests fit that bucket).

## Migration ordering (high level — full TDD breakdown happens in writing-plans)

1. Create `packages/checkouts-widget/` skeleton (package.json, tsconfig, vitest.config, empty `src/index.ts`). Pass typecheck.
2. Move `checkout-flow/` (lib + tests) into the package. Update `apps/checkouts/` imports to `@dynamic-demos/checkouts-widget/checkout-flow`. Run tests.
3. Move `use-checkout-flow` (hook + test) into the package. Update imports.
4. Move shared lib (`format.ts`, `widget-config.ts`, widget-relevant slice of `types.ts`) into the package.
5. Move `payment-modal/` widget-rendering screens (`deposit-amount-screen`, `review-payment-screen`, `transaction-progress-screen`, `token-conversion-card`, `screen-header`, `info-box`, `error-banner`) and `screens/`.
6. Build `PaymentWidget.tsx` — shell that wires `useCheckoutFlow` + the amount/review/processing screens, exposing the prop contract above. Internal state machine: `amount?` ? `amount-picker` : `review` → `processing` → `terminal`. The existing `apps/checkouts/components/payment-widget/index.tsx` keeps its router/state logic but stops rendering its own deposit-amount-screen and instead mounts `<PaymentWidget amount={undefined} />` to delegate amount entry + the rest of the wallet flow to the package.
7. Re-run full suite: `pnpm turbo typecheck lint test`. Smoke test in browser.

## Acceptance criteria

- `packages/checkouts-widget/` exists; `pnpm --filter @dynamic-demos/checkouts-widget test` passes.
- `apps/checkouts/` builds, typechecks, and lints with no behavior change (manual smoke at `localhost:4001` confirms parity).
- `apps/checkouts/components/payment-widget/index.tsx` no longer owns the amount/review/processing render path — it imports `<PaymentWidget />` from the package and mounts it once the user has selected a wallet + asset.
- No file in `packages/checkouts-widget/src/` imports from `next`, `@t3-oss/env-nextjs`, `@/lib/env`, `@/lib/api`, or `@/lib/exchanges`.
- All callbacks (`onTransactionCreated`, etc.) fire at least once during a manual wallet checkout in the smoke test.

## Risks

- **Hidden coupling.** Some screens may transitively pull in `@/lib/env` or `@/lib/api` through helpers. Mitigation: typecheck after each step in the plan; the plan-checker subagent flags any forbidden import.
- **Brand vars unset.** If the host forgets to set `--brand-*` vars, the widget renders without colors. Mitigation: spec a fallback object in the package (`DEFAULT_BRAND`) applied when `brand` is unset.
- **Test path drift.** Vitest resolves `@/` to package `src`; tests that previously hit `apps/checkouts/lib/` need re-pointed imports. Mitigation: covered by the migration ordering — tests move with the code they exercise.
- **`apps/checkouts/components/payment-widget/index.tsx` is large.** Splitting wallet-flow rendering out without breaking Kraken support is delicate. Mitigation: the existing index keeps full ownership of routing + Kraken; only the review/processing leaf renders are delegated to `<PaymentWidget />`.

## Out of scope (future work)

- iframe embedding with `?embed=1` / `postMessage` resize / event passthrough (revisit only if an external-customer demo needs it).
- Extracting Kraken/exchange OAuth into the package.
- Publishing the package to npm.
- Per-widget Dynamic Checkout provisioning (env-var-only today; dashboard-managed later).
