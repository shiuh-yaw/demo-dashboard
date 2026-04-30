# Crypto Shop Demo

## What This Is

A simple shopping app that demonstrates Dynamic's new checkout pay-with-crypto features. Users browse a catalog of fun items (emoji-based), manage a local cart, and pay using crypto via the headless `@dynamic-labs-sdk/client` checkout flow. Lives as a new app in the Turborepo monorepo (`apps/shop`), reusing the existing `@dynamic-demos/ui` component library for visual consistency with the checkouts app.

## Core Value

A customer can browse products, add them to a cart, and complete a crypto payment through Dynamic's checkout SDK — demonstrating the end-to-end purchase flow.

## Requirements

### Validated

- ✓ Monorepo infrastructure (Turborepo, shared packages) — existing
- ✓ `@dynamic-demos/ui` component library (Button, Card, WidgetCard, ListRow, etc.) — existing
- ✓ `@dynamic-demos/theme` theming system — existing
- ✓ `@dynamic-demos/utils` (cn, formatCurrency) — existing

### Active

- [ ] Product catalog driven from a JSON file (emoji image, name, price)
- [ ] Product grid/list displaying items with add-to-cart action
- [ ] Local cart with add/remove items and quantity controls
- [ ] Cart total calculation
- [ ] Checkout flow using `@dynamic-labs-sdk/client` (createCheckoutTransaction)
- [ ] Wallet connection via Dynamic SDK (getAvailableWalletProvidersData, connectWithWalletProvider)
- [ ] Token selection with balance display
- [ ] Quote review screen (amount, fees, total)
- [ ] Transaction submission and status tracking
- [ ] Empty cart state
- [ ] Basic error handling (failed transactions, connection errors)
- [ ] Consistent UI with existing checkouts app (reuse @dynamic-demos/ui components)

### Out of Scope

- User authentication / login — demo flow, no accounts needed
- Order history / persistence — transactions are fire-and-forget for demo
- Real product images — emoji-only, keeps it simple
- Backend API routes — all checkout logic via Dynamic SDK client-side
- Mobile app — web only
- Multiple currencies — USD only

## Context

- Reference implementation: `/Users/etesenair/Projects/dynamic-sdk/apps/checkout-demo` — headless Dynamic SDK checkout widget with 5-step flow (create → attachSource → reviewQuote → submit → status)
- Existing checkouts app (`apps/checkouts/`) provides the UI component library and design system to reuse
- Dynamic SDK checkout flow: `createCheckoutTransaction` → `attachCheckoutTransactionSource` → `getCheckoutTransactionQuote` → `submitCheckoutTransaction` → poll `getCheckoutTransaction`
- Products are purely client-side (JSON), no backend needed for catalog
- Multi-chain support via Dynamic SDK extensions (EVM, Solana, Bitcoin, Sui, Tron)

## Constraints

- **Tech stack**: Next.js 15 + React 19 + Tailwind CSS v4 (match monorepo)
- **UI library**: Must use `@dynamic-demos/ui` components, not custom from scratch
- **SDK**: `@dynamic-labs-sdk/client` headless approach (not embedded Dynamic widget)
- **Monorepo**: Must integrate as `apps/shop` with proper Turborepo config
- **Scope**: Demo quality — light polish, not production-grade

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| New app in apps/shop | Keeps demo isolated from existing checkouts app | — Pending |
| Headless @dynamic-labs-sdk/client | Matches reference implementation, full control over UX | — Pending |
| JSON-driven products | No backend needed, easy to modify catalog | — Pending |
| Reuse @dynamic-demos/ui | Visual consistency with checkouts app, faster development | — Pending |
| Local cart state (React state) | No persistence needed for demo | — Pending |

---
*Last updated: 2026-03-31 after initialization*
