# Roadmap: Crypto Shop Demo

## Overview

Build a client-side shopping demo that showcases Dynamic's headless checkout SDK. The app starts as a browsable emoji product catalog in the Turborepo monorepo, adds local cart state management, then layers in the full 5-step Dynamic SDK checkout flow. Three phases deliver the complete demo: a working storefront, a functional cart, and crypto payment from wallet connection through transaction completion.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Storefront** - App scaffold with Dynamic SDK init, themed UI, and browsable product catalog (completed 2026-03-31)
- [ ] **Phase 2: Cart** - Local cart state with add/remove, quantity controls, totals, and empty state
- [ ] **Phase 3: Checkout Flow** - End-to-end crypto payment via Dynamic SDK headless checkout

## Phase Details

### Phase 1: Storefront
**Goal**: Users can browse a themed product catalog in a properly configured Turborepo app with Dynamic SDK initialized and ready
**Depends on**: Nothing (first phase)
**Requirements**: SHELL-01, SHELL-02, SHELL-03, SHELL-04, SHELL-05, CATL-01, CATL-02, CATL-03
**Success Criteria** (what must be TRUE):
  1. App runs at localhost:4002 via `pnpm dev` from monorepo root and renders without errors
  2. Product grid displays all catalog items with emoji, name, and USD price using `@dynamic-demos/ui` components
  3. Each product card has a visible "Add to Cart" button (wired in Phase 2)
  4. Dark/light mode toggle switches the entire app theme consistently
  5. Dynamic SDK client initializes without errors (no double-init in Strict Mode) and the initialization gate prevents rendering before SDK is ready
**Plans:** 2/2 plans complete

Plans:
- [x] 01-01-PLAN.md — App shell with configs, SDK init, providers, theme toggle, and placeholder page
- [x] 01-02-PLAN.md — Product catalog data, product card component, and product grid page

### Phase 2: Cart
**Goal**: Users can manage a shopping cart with full add/remove/quantity controls and see a running total before proceeding to checkout
**Depends on**: Phase 1
**Requirements**: CART-01, CART-02, CART-03, CART-04, CART-05
**Success Criteria** (what must be TRUE):
  1. User can add a product from the catalog and see it appear in the cart with correct name, quantity, and line total
  2. User can increment and decrement item quantities in the cart, and remove items entirely
  3. Cart displays a running total that updates immediately when items change
  4. Empty cart shows a friendly message with a way to navigate back to the catalog
  5. A "Checkout" button is visible when the cart has items (disabled/placeholder until Phase 3)
**Plans:** 1 plan

Plans:
- [ ] 02-01-PLAN.md — Cart context with useReducer, wire Add to Cart, cart page with item controls, totals, and empty state

### Phase 3: Checkout Flow
**Goal**: Users can pay for their cart with any token from any connected wallet, completing the full Dynamic SDK checkout lifecycle
**Depends on**: Phase 2
**Requirements**: CHKT-01, CHKT-02, CHKT-03, CHKT-04, CHKT-05, CHKT-06, CHKT-07
**Success Criteria** (what must be TRUE):
  1. User can initiate checkout from the cart and connect a wallet via Dynamic SDK wallet providers
  2. User can select a token to pay with and see their available balance for each token
  3. User sees a quote review screen showing amount, fees, total, and estimated time before confirming
  4. User can confirm and submit the transaction, seeing distinct feedback for the approval and signing steps
  5. User sees real-time transaction status updates through to a terminal state (completed or failed) with human-readable error messages for failures and connection errors
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Storefront | 2/2 | Complete   | 2026-03-31 |
| 2. Cart | 0/1 | Not started | - |
| 3. Checkout Flow | 0/? | Not started | - |
