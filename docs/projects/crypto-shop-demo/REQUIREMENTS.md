# Requirements: Crypto Shop Demo

**Defined:** 2026-03-31
**Core Value:** A customer can browse products, add them to a cart, and complete a crypto payment through Dynamic's checkout SDK

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### App Shell

- [x] **SHELL-01**: App scaffolded as `apps/shop` in Turborepo monorepo with proper config
- [x] **SHELL-02**: Dynamic SDK initialized with chain extensions (EVM, Solana, WalletConnect — Bitcoin/Sui/Tron unavailable in SDK 0.12.1)
- [x] **SHELL-03**: UI built with `@dynamic-demos/ui` components (Card, Button, ListRow, WidgetCard, etc.)
- [x] **SHELL-04**: Theming consistent with checkouts app via `@dynamic-demos/theme`
- [x] **SHELL-05**: Dark/light mode toggle

### Catalog

- [x] **CATL-01**: Product data defined in JSON file (emoji, name, price per item)
- [x] **CATL-02**: Product grid displays all items with emoji, name, and USD price
- [x] **CATL-03**: Each product has an "Add to Cart" button

### Cart

- [x] **CART-01**: User can view cart showing all added items with quantities and line totals
- [x] **CART-02**: User can increment/decrement item quantity in cart
- [x] **CART-03**: User can remove items from cart
- [x] **CART-04**: Cart displays running total of all items
- [x] **CART-05**: Empty cart shows friendly empty state message

### Checkout

- [ ] **CHKT-01**: User can initiate checkout from cart, creating a Dynamic checkout transaction with cart total
- [ ] **CHKT-02**: User can connect a wallet via Dynamic SDK wallet providers
- [ ] **CHKT-03**: User can select a token to pay with, seeing available balances
- [ ] **CHKT-04**: User sees quote review with amount, fees, total, and estimated time
- [ ] **CHKT-05**: User can confirm and submit the transaction
- [ ] **CHKT-06**: User sees real-time transaction status (bridging -> settling -> completed/failed)
- [ ] **CHKT-07**: Basic error handling for failed transactions and connection errors

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Cart Enhancements

- **CART-06**: Slide-over cart panel (slides in from side)
- **CART-07**: Animated cart badge with item count
- **CART-08**: Cart persistence via localStorage

### Checkout Enhancements

- **CHKT-08**: Transaction state recovery on page refresh
- **CHKT-09**: Cancel checkout and return to cart
- **CHKT-10**: Skeleton loading states throughout checkout flow

### Catalog Enhancements

- **CATL-04**: Category filtering for products
- **CATL-05**: Product search

## Out of Scope

| Feature | Reason |
|---------|--------|
| User authentication / login | Demo flow, no accounts needed |
| Order history / persistence | Transactions are fire-and-forget for demo |
| Real product images | Emoji-only keeps it simple and fun |
| Backend API routes | All checkout logic via Dynamic SDK client-side |
| Mobile app | Web only |
| Multiple currencies | USD only for demo simplicity |
| Payment confirmation emails | No backend, no user accounts |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SHELL-01 | Phase 1 | Complete |
| SHELL-02 | Phase 1 | Complete |
| SHELL-03 | Phase 1 | Complete |
| SHELL-04 | Phase 1 | Complete |
| SHELL-05 | Phase 1 | Complete |
| CATL-01 | Phase 1 | Complete |
| CATL-02 | Phase 1 | Complete |
| CATL-03 | Phase 1 | Complete |
| CART-01 | Phase 2 | Complete |
| CART-02 | Phase 2 | Complete |
| CART-03 | Phase 2 | Complete |
| CART-04 | Phase 2 | Complete |
| CART-05 | Phase 2 | Complete |
| CHKT-01 | Phase 3 | Pending |
| CHKT-02 | Phase 3 | Pending |
| CHKT-03 | Phase 3 | Pending |
| CHKT-04 | Phase 3 | Pending |
| CHKT-05 | Phase 3 | Pending |
| CHKT-06 | Phase 3 | Pending |
| CHKT-07 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 after roadmap creation*
