# Project Research Summary

**Project:** Crypto Shop Demo (`apps/shop`)
**Domain:** Crypto shopping demo app — Dynamic SDK headless checkout showcase
**Researched:** 2026-03-31
**Confidence:** HIGH

## Executive Summary

This project is a frontend-only e-commerce demo that showcases the Dynamic Labs headless checkout SDK. The app is a thin UI shell: a browsable emoji product catalog, a local-state cart, and a 5-step SDK-driven checkout wizard. There is no backend, no database, and no authentication wall before checkout. The entire product exists to demonstrate that users can pay for goods with any token in their wallet, across any supported chain, with Dynamic handling all bridging and swapping under the hood.

The recommended approach is to build in three sequential phases with a clear separation of concerns: first build the static shopping experience (catalog + cart) entirely without the SDK, then layer in the Dynamic checkout flow, then polish. This phasing is validated by the fact that the shopping features and the SDK checkout features have zero dependencies on each other until the "Pay" button is wired up. A working reference implementation exists at `apps/checkout-demo` in the SDK monorepo and should be treated as the primary specification for the 5-step checkout flow.

The most consequential risk is treating the 5-step checkout as a simple linear wizard. In reality it has branching states: users can go back, transactions can expire, wallet rejections need specific handling, and page refreshes must restore state. The reference implementation's `deriveViewFromTransaction()` pattern must be adopted from the start — not bolted on later. A secondary, less obvious risk is the Dynamic SDK double-initialization problem in React 19 Strict Mode, which must be neutralized with a module-level idempotency guard in Phase 1. Both risks have known solutions with low recovery cost if addressed early.

## Key Findings

### Recommended Stack

The stack is almost entirely inherited from the existing monorepo with zero net-new dependencies that aren't already present. Next.js 15.5.9, React 19.1.4, Tailwind CSS 4.1.18, TypeScript 5.9.3, and all four `@dynamic-demos/*` workspace packages (ui, theme, utils, types) are reused at locked versions. The Dynamic SDK packages (`@dynamic-labs-sdk/client`, `evm`, `solana`, `wallet-connect` at 0.12.1) are already in the monorepo lockfile. `@tanstack/react-query` at 5.90.16 — already used by the trade and deposit apps — is required for the `waitForClientInitialized()` initialization gate.

The only genuinely new runtime dependency is `sonner` at 2.0.7 for toast notifications. Cart state is managed with React `useReducer` + Context — no state library needed. Products are a static TypeScript import — no data fetching layer needed. The app should run on port 4002 to avoid conflicts with the existing dashboard (4000) and checkouts (4001) apps.

**Core technologies:**
- Next.js 15.5.9 / React 19.1.4: App Router, SSR shell — monorepo standard, no new dependency
- `@dynamic-labs-sdk/client` 0.12.1: Headless checkout SDK (5-step flow) — core demo purpose
- `@dynamic-demos/ui`: Card, Button, Dialog, ListRow, WidgetCard, Spinner — visual consistency
- `@tanstack/react-query` 5.90.16: Async state for SDK init gate and polling — already in monorepo
- `sonner` 2.0.7: Toast notifications for async transaction feedback — only new dependency

### Expected Features

The feature set splits cleanly between a shopping shell (zero SDK involvement) and a checkout flow (pure SDK integration). The shopping features are simple and can be built rapidly. The checkout flow is where the demo's value lives and where all the complexity resides.

**Must have (table stakes):**
- Product catalog grid (6-12 emoji products from static JSON) — cannot demo "shopping" without browsable products
- Add to cart with visual feedback (badge, toast) — core shopping interaction
- Cart view with item list, quantity controls, line totals, and cart total
- Empty cart state with CTA back to catalog
- Wallet connection via Dynamic SDK — required to pay
- Token selection with balances — key Dynamic SDK selling point (pay with any token)
- Quote review screen (fees, total, estimated time)
- Transaction submission with two-phase approval/signing feedback
- Transaction status polling to terminal state (success or failure)
- Basic error handling: wallet rejection, insufficient balance, network timeout

**Should have (differentiators):**
- Cart slide-over panel (drawer/sheet) — feels modern, keeps product context visible
- Animated cart badge — small polish detail
- Skeleton loading states during balance fetch
- Order summary visible throughout checkout flow
- Multi-chain indicator on token list
- "Pay with any token" callout — reinforces SDK value proposition
- Connected wallet pill in header

**Defer (v2+):**
- All anti-features: user accounts, order history, real product images, search/filtering, inventory, shipping, fiat fallback, discount codes, i18n, pixel-perfect mobile

### Architecture Approach

The architecture is a client-only Next.js app with no API routes. Three independent subsystems connect in a single point: the cart total feeds into `createCheckoutTransaction`. The Dynamic SDK client is initialized as a singleton in a `DynamicClientProvider` that gates all child rendering on `waitForClientInitialized()`. Cart state is managed by a `useReducer` + Context pattern. The 5-step checkout is a view state machine in a single `CheckoutFlow` parent component that receives `(amount, currency)` from the cart and maps SDK transaction state to the correct rendered view.

**Major components:**
1. `DynamicClientProvider` — singleton SDK init with initialization gate, must come first
2. `CartContext` (useReducer) — add/remove/update/clear with typed discriminated union actions
3. `CheckoutFlow` (view state machine) — orchestrates create → attachSource → reviewQuote → submit → status; owns `transactionId` in localStorage and `deriveViewFromTransaction` logic
4. `ProductGrid` / `ProductCard` — renders static product array, delegates add-to-cart upward
5. `CartDrawer` — slide-out panel with item rows, quantity controls, cart total, checkout button
6. Five step components (`CreateStep`, `AttachSourceStep`, `ReviewQuoteStep`, `SubmitStep`, `StatusStep`) — each is a leaf that calls one SDK function and reports completion upward

**Key patterns:**
- View state machine for checkout (not a linear stepper) — prevents invalid transitions
- Static TypeScript import for product data (no fetch, no loading state)
- `useReducer` + Context for cart (no external state library)
- `useSyncExternalStore` for SDK state reads (not useState + useEffect)
- All UI from `@dynamic-demos/ui` (no new primitives)

### Critical Pitfalls

1. **Double SDK initialization in Strict Mode** — use a module-level `let initialized = false` guard in `initializeDynamicClient()`; the reference implementation pattern is mandatory, not optional. Address in Phase 1.

2. **Checkout UI rendering before `waitForClientInitialized`** — `DynamicClientProvider` must show a loading state and render nothing until the SDK is ready; all checkout calls silently fail before this resolves. Address in Phase 1.

3. **Linear checkout assumption** — the 5 steps are not strictly sequential; implement `deriveViewFromTransaction(executionState, settlementState)` from day one to handle expiry, rejection, and page refresh state restoration. Address in Phase 3 design, not as a bolt-on.

4. **Cart-checkout amount desync** — freeze the cart the moment `createCheckoutTransaction` is called; read amount from the transaction object, not from cart state. Define this contract at the Phase 2/3 boundary.

5. **Missing two-phase wallet approval feedback** — `submitCheckoutTransaction` fires `onStepChange` with `'approval'` then `'transaction'`; both need distinct UI messages or users reject the second popup thinking it is a duplicate.

6. **Infinite status polling** — set a 15-30s timeout, stop polling on terminal states (`cancelled`, `expired`, `failed`, `completed`), and show a manual "Check Status" button after timeout.

7. **SDK version misalignment** — all `@dynamic-labs-sdk/*` packages must be on the exact same version (0.12.1); mixing versions causes runtime failures.

## Implications for Roadmap

Based on the research, four phases emerge naturally from the dependency graph and pitfall-to-phase mapping. The feature and architecture research agree on this exact sequence.

### Phase 1: App Scaffold + Static Catalog

**Rationale:** Validates monorepo integration and shared component consumption before introducing SDK complexity. Produces immediately visible, shareable output. SDK pitfalls (double-init, initialization gate) must be planted here as a foundation even before checkout logic exists.
**Delivers:** A browsable product catalog in a properly configured Turborepo app that uses `@dynamic-demos/ui` correctly. DynamicClientProvider with initialization gate is scaffolded but not yet wired to checkout.
**Addresses:** Product catalog grid, consistent UI with monorepo (table stakes from FEATURES.md)
**Avoids:** Double SDK initialization (Pitfall 1), missing initialization gate (Pitfall 2)

### Phase 2: Cart State + Cart UI

**Rationale:** Cart is pure local React state with zero external dependencies — it can be built and fully tested in isolation. This phase also defines the cart-checkout contract (amount source of truth, cart freeze mechanism) which prevents Pitfall 5.
**Delivers:** Fully functional shopping experience (add, remove, quantity, totals, empty state, checkout button) minus actual payment. The "Checkout" button is wired to open the checkout modal but disabled until Phase 3.
**Uses:** `useReducer` + Context pattern, `@dynamic-demos/ui` ListRow, Dialog
**Implements:** CartContext, CartDrawer, CartItemRow, CartTotal components
**Avoids:** Cart-checkout amount desync (Pitfall 5) — cart freeze and amount source-of-truth defined here

### Phase 3: Dynamic SDK Checkout Flow

**Rationale:** This is the core demo value. It requires a working cart (Phase 2) to provide the amount and a properly initialized SDK (Phase 1) to accept checkout calls. All SDK-specific pitfalls concentrate here.
**Delivers:** Complete end-to-end crypto checkout: wallet connection, token selection with balances, quote review, transaction submission with two-phase wallet approval, and status polling to terminal state.
**Uses:** `@dynamic-labs-sdk/client` full 5-step flow, `@tanstack/react-query` for polling, `sonner` for toast feedback
**Implements:** CheckoutFlow state machine, all five step components, `deriveViewFromTransaction`, localStorage transactionId persistence
**Avoids:** Linear checkout assumption (Pitfall 3), quote staleness (Pitfall 4), missing approval step feedback (Pitfall 6), infinite polling (Pitfall 7)

### Phase 4: Polish + Edge Cases

**Rationale:** Error handling, loading states, animations, and mobile layout are meaningful only once the happy path works end-to-end.
**Delivers:** Production-quality demo feel: error boundaries, human-readable error messages, skeleton states, animated cart badge, cart slide-over, multi-chain indicators, responsive layout.
**Addresses:** All "differentiator" features from FEATURES.md
**Avoids:** Raw SDK error messages (UX pitfall from PITFALLS.md), no cancel flow, missing loading states

### Phase Ordering Rationale

- Phases 1 and 2 have no SDK dependency, enabling fast iteration and visual validation before any Dynamic environment is configured.
- The SDK initialization pitfalls (double-init, initialization gate) are planted in Phase 1 even though checkout doesn't work yet — this prevents them from being forgotten or retrofitted.
- Phase 2 defines the cart-checkout contract (cart freeze, amount source of truth) before Phase 3 builds against it — this eliminates the most common desync bug at the seam between the two subsystems.
- Phase 3 is the largest phase and the entire demo value; it must not start until Phases 1 and 2 are stable.
- Phase 4 polish is genuinely last — adding animations to a broken checkout wastes time.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3:** The `deriveViewFromTransaction` state mapping requires understanding all `executionState` and `settlementState` enum values from the Dynamic SDK. The reference implementation covers this but the exact enum values should be verified against SDK source before implementation.
- **Phase 3:** Quote TTL behavior — the SDK documentation on quote expiry timing is sparse; the reference implementation uses a 15s poll timeout but the actual quote TTL from Dynamic's API should be confirmed during implementation.

Phases with standard patterns (skip research-phase):
- **Phase 1:** Standard Turborepo app setup with existing monorepo conventions — no unknowns.
- **Phase 2:** React `useReducer` + Context cart — well-documented pattern, zero unknowns.
- **Phase 4:** CSS animations and error message mapping — straightforward polish work.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versions verified directly from monorepo lockfile and existing app package.json files. One new dependency (sonner) confirmed on npm. |
| Features | HIGH | Feature set derived from reference implementation + established e-commerce UX research. Table stakes list is conservative and well-validated. |
| Architecture | HIGH | Primary source is a working reference implementation at `apps/checkout-demo`. Component boundaries and data flow are derived from actual working code, not speculation. |
| Pitfalls | HIGH | All critical pitfalls sourced from reference implementation analysis (direct code inspection) plus crypto checkout UX research. Recovery strategies are concrete and low-risk. |

**Overall confidence:** HIGH

### Gaps to Address

- **Dynamic SDK enum completeness:** `executionState` and `settlementState` values beyond what appear in the reference implementation are not fully enumerated. Verify against SDK TypeScript types before implementing `deriveViewFromTransaction`.
- **Quote TTL:** Actual quote expiry window from Dynamic's API is undocumented in research. Assume 30-60 seconds for implementation; add explicit timeout handling and confirm empirically during Phase 3.
- **`checkoutId` value:** Research assumes a hardcoded `checkoutId` from the Dynamic dashboard is acceptable for this demo (per PROJECT.md "fire-and-forget"). Confirm the test/sandbox environment's checkout config ID before starting Phase 3.
- **Chain extension scope:** Research recommends EVM + Solana + WalletConnect to match the existing checkouts app. If the demo needs Bitcoin, Sui, or Tron (as used in the reference checkout-demo), those extensions must be added during Phase 3 setup.

## Sources

### Primary (HIGH confidence)
- `/Users/etesenair/Projects/dynamic-sdk/apps/checkout-demo/` — reference implementation; DynamicClientProvider pattern, 5-step checkout flow, `deriveViewFromTransaction`, polling timeout, wallet rejection handling
- `/Users/etesenair/Projects/demo-dashboard/apps/checkouts/package.json` — dependency version alignment
- `/Users/etesenair/Projects/demo-dashboard/pnpm-lock.yaml` — version verification for all monorepo packages
- `/Users/etesenair/Projects/demo-dashboard/packages/ui/src/` — `@dynamic-demos/ui` component inventory

### Secondary (MEDIUM confidence)
- [sonner npm](https://www.npmjs.com/package/sonner) — version 2.0.7 confirmed
- [E-commerce checkout UX best practices](https://www.designstudiouiux.com/blog/ecommerce-checkout-ux-best-practices/) — cart and checkout UX patterns
- [Baymard Institute checkout research](https://baymard.com/research/checkout-usability) — cart abandonment patterns
- [7 UX Best Practices for Crypto Payment Checkouts](https://www.krayondigital.com/blog/7-ux-best-practices-for-crypto-payment-checkouts) — crypto-specific UX guidance
- [Crypto Checkout UX Design: Handling Payment Volatility](https://theenterpriseworld.com/crypto-checkout-ux-design/) — quote staleness and volatility handling

### Tertiary (LOW confidence)
- [DePay Web3 Payments](https://depay.com/) — multi-token payment flow patterns (informational only; Dynamic SDK differs)
- [Why Your Swaps Fail (Uniswap)](https://blog.uniswap.org/why-swaps-fail-and-what-you-can-do) — swap failure modes (general reference, Dynamic SDK abstracts these)

---
*Research completed: 2026-03-31*
*Ready for roadmap: yes*
