---
name: "@dynamic-demos/checkouts"
kind: app
flow_role: checkout
custody: non-custodial
status: stable
---

# @dynamic-demos/checkouts

Stablecoin checkout / pay-with-crypto demo. End users authenticate via Dynamic, view a multichain balance summary, and complete a checkout that may bridge/swap across chains via Dynamic Checkout Flow. Showcases the Dynamic embedded wallet + Dynamic Checkout Flow pattern when paired with a CeFi balance source (Kraken via Dynamic CeFi connector).

## Architecture (post `packages/checkouts-widget` extraction)

Wallet-source widget rendering (amount picker, review, processing) is delegated to `@dynamic-demos/checkouts-widget`. This app owns:

- Page chrome, auth flow, wallet/asset selection (`ConnectWalletScreen`, `AssetSelectorScreen`, `ConnectedWalletsScreen`).
- Kraken/exchange OAuth flow (`KrakenWhitelistingScreen`, `usePaymentExecution`'s exchange branch).
- Dashboard transaction mirror calls (`useTransaction.initializeTransaction` runs on login; `<PaymentWidget>` lifecycle callbacks — `onExecutionUpdate`, `onCancelled`, `onError` — drive subsequent state transitions).

Branching is by token type at the `review` render: wallet tokens mount `<PaymentWidget />` from the package; exchange tokens (Kraken) keep rendering the existing `ReviewScreen` / `ProcessingScreen` wrappers via the host's `usePaymentExecution`.

## Capabilities

- Email-OTP + social login (Dynamic).
- Multichain balance fetch via dashboard orchestration (the 30+ inline SSR-safe wrappers cover Kraken accounts, multichain balances, etc.).
- Cross-chain bridge / swap setup via the Dynamic Checkout Flow SDK (`@dynamic-labs-sdk/client`).
- Checkout flow: select asset/chain → quote → execute → confirm.
- Fiat-display + per-chain price formatting via dashboard prices proxy.

## Public surface

App routes:

- `/(widget)/...` — embedded checkout widget.
- `/...` — top-level pages.
- `/api/...` — server-only routes (mostly thin proxies to dashboard `/api/orchestrate/*`).

This app is a **partial consumer** of `@dynamic-demos/dynamic` Phase 1D primitives — Phase 1D migrated the env-id resolution and singleton bootstrap; the 30+ bespoke SSR-safe wrappers (`getKrakenAccounts`, `getMultichainBalances`, etc.) keep their hand-rolled shapes for now (see `packages/dynamic/AGENTS.md` open questions).

## Required environment

- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` — per-app Dynamic env — optional.
- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID_DEFAULT` — workspace default.
- `NEXT_PUBLIC_DASHBOARD_URL` — dashboard origin for orchestration / quote calls.
- `NEXT_PUBLIC_APP_ENV` — `production` flips sandbox off.

Coinbase + Iron credentials live at the **dashboard** (D-003) — never in this app.

## Theming

Adopts the unified theme injection pattern (D-007/D-008):

- `middleware.ts` resolves the config id from `?theme=<id>` (or the sticky `checkouts_config_id` cookie) and forwards it as `x-checkouts-config-id` (header + cookie via the shared `createConfigForwardingMiddleware` factory).
- `app/(widget)/page.tsx` is the canonical entry point: it reads `x-checkouts-config-id`, fetches the stored config, parses any `externalId` / `metadata` query params, and routes to the completion / pending / payment screen. With no id it falls back to the unbranded demo.
- `app/(widget)/wallet/page.tsx` is the embedded-wallet view (active when `depositDestination === "embedded"`); it reads the same header to resolve the brand.
- `app/layout.tsx` reads the header, fetches the config via `getCheckoutConfig`, projects the stored `WidgetTheme` onto a `Partial<BrandTheme>` overlay via `lib/checkouts-brand.ts#themeToBrandTheme`, and emits `--brand-*` overrides via `<ThemeStyleTag overridesOnly>` in `<head>`.
- `globals.css` declares checkouts' static `--brand-*` overrides (charcoal-on-near-white, blue accent, tighter radii) on top of `@dynamic-demos/theme/defaults.css`, plus a `--widget-*` compat alias block kept until the shared `packages/ui` consumers migrate.
- Components consume `var(--brand-*)` directly. The `themeToCssVars` helper (legacy `--widget-*` projector) is removed from `lib/widget-config.ts`.
- Legacy `/w/:id/...` URLs are kept working via `next.config.ts` redirects → `/?theme=:id` (or `/wallet?theme=:id`). The path tree itself is removed.

Storage prefix in dashboard remains `payment-widget:` (legacy quirk — kept for backwards compatibility with the original nextjs-payment-widget project). Internal abstractions in this app follow the unified `checkouts` naming.

## Credentials

- **Dynamic:** per-app or workspace-default (D-003).
- **Fireblocks:** none.
- **Other providers:** none — Coinbase / Iron go through dashboard orchestration.

## Slots vs invariants

**Slots:** brand, supported chains/tokens (constrained by dashboard config), checkout flow copy.

**Invariants:**

- All Checkout Flow API calls go through `@dynamic-demos/checkouts-widget/checkout-flow` — never directly from `@dynamic-labs-sdk/client` elsewhere in the app.
- The Checkout Flow primitives sign and broadcast on the user's behalf; the app never holds keys.
- Apps don't access Postgres (D-002).

## Data boundaries

- No Postgres.
- Redis: not used directly by this app. Dashboard transient transaction state remains Redis-backed; this app reads/writes that state via the dashboard API.
- User state → Dynamic user metadata.
- Canonical transactions: Dynamic Checkout Flow is the routing source of truth. The dashboard transaction mirror is dual-written from each lifecycle transition (initialize → update with `dynamicTransactionId` → submit with `txHash` → done/fail/cancel).

## Deployment

- **Vercel project:** `dynamic-demos-checkouts`.
- **Root dir:** `apps/checkouts`.
- **Required env:** see above.
- **Owner:** demos team.
- **Dev port:** 4001.

## Integration map

**Imports:** `@dynamic-demos/dynamic`, `@dynamic-demos/ui`, `@dynamic-demos/utils`, `@dynamic-demos/theme`, `@dynamic-demos/types`.
**Imported by:** none.

## Examples

```ts
// hooks/use-checkout-flow.ts
import { createTransaction, submit } from "@dynamic-demos/checkouts-widget/checkout-flow";
// SDK lifecycle: create → attach → quote → submit → events → cancel
```

## Do / Don't

- Do: route all Checkout Flow calls through `@dynamic-demos/checkouts-widget/checkout-flow`. Components and hooks should never import directly from `@dynamic-labs-sdk/client` for Checkout Flow functions.
- Don't: import `@dynamic-labs-sdk/client` Checkout Flow functions directly from components — use the `@dynamic-demos/checkouts-widget/checkout-flow` wrapper.

## Open questions / known gaps

- 30+ inline SSR-safe wrappers (`getKrakenAccounts`, etc.) retain bespoke shapes; consolidate when a third app needs the same wrappers.
- `--widget-*` compat aliases in `globals.css` retained until `packages/ui` shared components migrate to `--brand-*`.
- No real-network E2E in CI (D-023).
- `needsTokenConversion` in `components/payment-widget/utils.ts` derives the same signal that a `requiresConversion` SDK helper could provide; could be consolidated if Dynamic surfaces that helper in a future SDK release.
- The Kraken path still hand-writes wallet transfer logic in `usePaymentExecution`; a future PR can extract a Kraken-specific package or fold it into a generic exchange-flow primitive.
