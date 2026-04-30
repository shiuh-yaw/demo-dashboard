# Architecture Patterns

**Domain:** Crypto shopping demo app (client-side checkout with Dynamic SDK)
**Researched:** 2026-03-31

## Recommended Architecture

A client-only Next.js app with no backend API routes. Product catalog is static JSON. Cart is React state. Checkout delegates entirely to Dynamic's headless `@dynamic-labs-sdk/client` SDK. The app is a thin UI shell over the SDK's 5-step checkout flow.

```
+------------------+     +------------------+     +---------------------------+
|   Product Grid   | --> |   Cart (state)   | --> |   Checkout Flow (SDK)     |
|   (static JSON)  |     |   add/remove/qty |     |   5-step wizard           |
+------------------+     +------------------+     +---------------------------+
                                                    |                         |
                                                    v                         v
                                              +-----------+           +-------------+
                                              | Dynamic   |           | Wallet      |
                                              | API       |           | Provider    |
                                              | (remote)  |           | (browser)   |
                                              +-----------+           +-------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **ProductCatalog** | Renders product grid from static JSON data | Cart (via add-to-cart callbacks) |
| **Cart** | Manages items, quantities, totals; React state only | ProductCatalog (receives items), CheckoutFlow (passes total) |
| **CheckoutFlow** | Orchestrates 5-step Dynamic SDK checkout wizard | Dynamic SDK (API calls), Wallet providers (signing) |
| **DynamicClientProvider** | Initializes `@dynamic-labs-sdk/client` with environment config | All SDK-consuming components |
| **WalletConnection** | Lists wallet providers, handles connect/disconnect | Dynamic SDK (`connectWithWalletProvider`, `getAvailableWalletProvidersData`) |
| **TokenSelection** | Shows connected wallet's token balances, user picks payment token | Dynamic SDK (token balances), CheckoutFlow (selected token) |
| **QuoteReview** | Displays amount, fees, total from SDK quote | Dynamic SDK (`attachCheckoutTransactionSource`, `getCheckoutTransactionQuote`) |
| **TransactionSubmit** | Triggers wallet signing, shows approval/signing steps | Dynamic SDK (`submitCheckoutTransaction`), wallet provider |
| **TransactionStatus** | Polls transaction status, shows terminal state | Dynamic SDK (`getCheckoutTransaction`, polling) |
| **Layout/Shell** | App chrome, navigation, theme provider | `@dynamic-demos/ui` (WidgetCard, ThemeProvider) |

### Data Flow

**Shopping flow (Products to Cart):**

```
products.json --> ProductGrid renders cards
                      |
                      v (user clicks "Add to Cart")
                  Cart state (useReducer)
                      |  items: Array<{ product, quantity }>
                      |  total: computed from items
                      v
                  CartSummary displays items + total
                      |
                      v (user clicks "Checkout")
                  CheckoutFlow receives { amount, currency: "USD" }
```

**Checkout flow (Cart total to payment):**

The Dynamic SDK checkout is a strict 5-step sequence. Each step depends on the previous step completing successfully. This maps directly to 5 view components.

```
Step 1: CREATE
  createCheckoutTransaction({ amount, checkoutId, currency })
  --> Returns CheckoutTransaction with transaction ID
  --> Advances to Step 2

Step 2: ATTACH SOURCE (wallet + token selection)
  User connects wallet via connectWithWalletProvider()
  User selects payment token from wallet balances
  --> Advances to Step 3

Step 3: REVIEW QUOTE
  attachCheckoutTransactionSource({ fromAddress, fromChainId, fromChainName, transactionId })
  getCheckoutTransactionQuote({ fromTokenAddress, transactionId })
  --> Shows amount, fees, total, estimated time
  --> User confirms or goes back to Step 2

Step 4: SUBMIT
  submitCheckoutTransaction({ transactionId, walletAccount, onStepChange })
  --> Wallet prompts user for approval, then signs
  --> Advances to Step 5

Step 5: STATUS (poll)
  getCheckoutTransaction({ transactionId }) on 3-second interval
  --> Terminal states: completed | failed | cancelled | expired
  --> Shows success/failure, tx hash
```

**State ownership:**

| State | Owner | Persistence | Scope |
|-------|-------|-------------|-------|
| Product list | Static JSON import | None (built-in) | App-wide |
| Cart items + quantities | React `useReducer` | None (demo, no localStorage) | App-wide via context |
| Current checkout step | `useState` in CheckoutFlow | localStorage (transactionId only) | CheckoutFlow |
| Checkout transaction | Dynamic SDK (remote) | Server-side (Dynamic API) | CheckoutFlow |
| Connected wallet | Dynamic SDK client state | SDK manages | App-wide |
| Token balances | Dynamic SDK | SDK caches | WalletConnection subtree |

## Component Hierarchy

```
App (layout.tsx)
  ThemeProvider (@dynamic-demos/ui)
  DynamicClientProvider (SDK init)
    ShopPage (page.tsx)
      ProductGrid
        ProductCard (x N)  -- uses @dynamic-demos/ui Card
      CartDrawer / CartSheet
        CartItemRow (x N)  -- uses @dynamic-demos/ui ListRow
        CartTotal
        CheckoutButton
      CheckoutModal (dialog overlay)
        CheckoutFlow (state machine)
          CreateStep
          AttachSourceStep
            WalletList
            TokenList
          ReviewQuoteStep
          SubmitStep
          StatusStep
```

## Patterns to Follow

### Pattern 1: View State Machine for Checkout

**What:** A single parent component (`CheckoutFlow`) owns a `view` state that determines which step is rendered. Each step is a leaf component that calls SDK functions and reports completion upward.

**When:** Always, for the checkout wizard. This mirrors the reference implementation exactly.

**Why:** The Dynamic SDK checkout is inherently sequential. A state machine prevents invalid step transitions and makes it trivial to go back/cancel. The reference implementation proves this pattern works.

**Example:**
```typescript
type CheckoutView = 'create' | 'attachSource' | 'reviewQuote' | 'submit' | 'status';

const [view, setView] = useState<CheckoutView>('create');
const [transaction, setTransaction] = useState<CheckoutTransaction | null>(null);

// Each view component receives callbacks to advance the state machine
{view === 'create' && <CreateStep onCreated={(tx) => { setTransaction(tx); setView('attachSource'); }} />}
{view === 'attachSource' && <AttachSourceStep onTokenSelect={(token) => setView('reviewQuote')} />}
// ... etc
```

### Pattern 2: Cart as useReducer + Context

**What:** Cart state managed by `useReducer` with typed actions, exposed via React context. No persistence needed for a demo.

**When:** Cart is accessed from multiple components (product cards, cart drawer, checkout button).

**Why:** `useReducer` with discriminated union actions makes cart operations explicit and testable. Context avoids prop drilling. No external state library needed for this scope.

**Example:**
```typescript
type CartAction =
  | { type: 'ADD_ITEM'; product: Product }
  | { type: 'REMOVE_ITEM'; productId: string }
  | { type: 'UPDATE_QUANTITY'; productId: string; quantity: number }
  | { type: 'CLEAR' };

function cartReducer(state: CartState, action: CartAction): CartState { ... }
```

### Pattern 3: Static Product Data via JSON Import

**What:** Products defined in a TypeScript file exporting a typed array. No API, no fetch, no loading states for product data.

**When:** Always. The product catalog is fixed demo data.

**Why:** Eliminates an entire data-fetching layer. Products are available synchronously at render time. Easy to modify (edit one file).

**Example:**
```typescript
// data/products.ts
export const products: Product[] = [
  { id: 'hoodie', name: 'Crypto Hoodie', emoji: '🧥', price: 59.99, description: '...' },
  // ...
];
```

### Pattern 4: Reuse @dynamic-demos/ui Components

**What:** Build all UI from existing shared components (Card, Button, Dialog, ListRow, WidgetCard, Spinner) rather than creating new primitives.

**When:** Always. The shared library already has what this app needs.

**Why:** Visual consistency with other monorepo apps. Faster development. The existing component set covers cards (product display), list rows (cart items), dialogs (checkout modal), buttons, and spinners (loading states).

### Pattern 5: SDK Initialization as Singleton

**What:** Initialize `@dynamic-labs-sdk/client` once at app startup via a provider component, matching the reference implementation pattern.

**When:** App mount (layout or top-level client component).

**Why:** The Dynamic SDK must be initialized before any checkout functions are called. Extensions (EVM, Solana, etc.) must be registered during initialization. The reference implementation uses a singleton pattern that prevents double-init.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Backend API Routes for Checkout Logic

**What:** Creating Next.js API routes to proxy Dynamic SDK calls.

**Why bad:** The Dynamic SDK is designed for client-side use. Adding a backend proxy layer adds complexity, latency, and CORS configuration for zero benefit. The SDK handles auth and communication with Dynamic's servers.

**Instead:** Call SDK functions directly from client components. The only "server" interaction is the SDK talking to Dynamic's API.

### Anti-Pattern 2: Global State Library for Cart

**What:** Pulling in Zustand, Jotai, or Redux for cart state management.

**Why bad:** The cart has 4 operations (add, remove, update quantity, clear) and is used by 3-4 components. A state library is overkill and adds a dependency.

**Instead:** `useReducer` + React Context. If the cart grows beyond demo scope, Zustand is the obvious upgrade path, but do not add it preemptively.

### Anti-Pattern 3: Product Data Fetching

**What:** Setting up an API endpoint or CMS to serve product data.

**Why bad:** This is a demo with a fixed catalog. Introducing data fetching adds loading states, error handling, caching, and skeleton UI for something that never changes.

**Instead:** Static TypeScript import. Zero loading states, zero error cases.

### Anti-Pattern 4: Persisting Cart to LocalStorage

**What:** Saving cart state to localStorage to survive page refresh.

**Why bad:** Demo app. Users are not real shoppers. Persistence adds edge cases (stale data, hydration mismatches in Next.js SSR) for no demo value.

**Instead:** Cart resets on refresh. This is fine for a demo.

### Anti-Pattern 5: Custom Wallet Connection UI

**What:** Building custom wallet detection, provider enumeration, or connection logic.

**Why bad:** The Dynamic SDK provides `getAvailableWalletProvidersData()` and `connectWithWalletProvider()` that handle all of this. Reimplementing it means maintaining chain-specific logic.

**Instead:** Use SDK hooks/functions for wallet connection. Only customize the visual presentation.

## Suggested Build Order

Components have clear dependencies that dictate the build sequence.

### Phase 1: App Scaffold + Static Catalog (no SDK)

**Build:** App shell, layout, product data, product grid.

- `apps/shop/` Turborepo setup (package.json, next.config, tsconfig)
- Layout with ThemeProvider from `@dynamic-demos/ui`
- `data/products.ts` with typed product array
- `ProductGrid` and `ProductCard` components using `@dynamic-demos/ui` Card
- No Dynamic SDK yet -- just a browsable catalog

**Dependencies:** Only `@dynamic-demos/ui`, `@dynamic-demos/theme`, `@dynamic-demos/utils`.

**Rationale:** Validates monorepo integration and shared package consumption before introducing SDK complexity. Produces visible output immediately.

### Phase 2: Cart State + Cart UI

**Build:** Cart reducer, context provider, cart drawer/sheet, cart item rows.

- `CartContext` with `useReducer`
- "Add to Cart" wired to product cards
- `CartDrawer` component (slide-out or sheet) with item list, quantity controls, total
- Empty cart state
- Checkout button (disabled until Phase 3)

**Dependencies:** Phase 1 (products exist to add to cart).

**Rationale:** Cart is purely local React state. No external dependencies. Can be built and tested in isolation.

### Phase 3: Dynamic SDK Integration + Checkout Flow

**Build:** SDK initialization, wallet connection, full 5-step checkout wizard.

- `DynamicClientProvider` singleton initialization
- `CheckoutFlow` state machine (create -> attachSource -> reviewQuote -> submit -> status)
- `WalletConnection` component (list providers, connect)
- `TokenSelection` component (balances, select payment token)
- `QuoteReview` component (fees, total, confirm)
- `TransactionSubmit` component (wallet approval/signing)
- `TransactionStatus` component (polling, terminal states)
- Wire checkout button from cart to open `CheckoutFlow` in a modal/dialog

**Dependencies:** Phase 2 (cart total feeds into checkout amount), Dynamic SDK packages.

**Rationale:** This is the core value of the demo. It requires all SDK packages and a configured Dynamic environment. Should not be started until the static app shell is working.

### Phase 4: Polish + Edge Cases

**Build:** Error handling, loading states, responsive layout, success celebrations.

- Error boundaries around SDK calls
- Retry logic for failed quotes
- Cancel transaction flow
- Transaction persistence (localStorage for transactionId, matching reference impl)
- Visual polish (animations, transitions)
- Responsive layout for mobile viewports

**Dependencies:** Phase 3 (checkout flow must work before polishing it).

## Monorepo Integration Details

### Package Dependencies for apps/shop

```
@dynamic-demos/ui        -- Card, Button, Dialog, ListRow, WidgetCard, Spinner, ThemeProvider
@dynamic-demos/theme     -- Tailwind theme tokens
@dynamic-demos/utils     -- cn(), formatCurrency()
@dynamic-demos/types     -- Shared type definitions (if applicable)
@dynamic-demos/tsconfig  -- Shared TypeScript config (devDep)
@dynamic-labs-sdk/client -- Headless checkout SDK
@dynamic-labs-sdk/evm    -- EVM chain extension
@dynamic-labs-sdk/solana -- Solana chain extension
```

### Turborepo Configuration

No changes needed to `turbo.json`. The existing task pipeline (`build`, `dev`, `lint`, `typecheck`) with `dependsOn: ["^build"]` automatically handles the new app. The app just needs to be in `pnpm-workspace.yaml` patterns (which already covers `apps/*`).

### Port Allocation

Existing apps use ports 4000 (dashboard) and 4001 (checkouts). The shop app should use port 4002 for local dev: `"dev": "next dev -p 4002"`.

## Sources

- Reference implementation: `/Users/etesenair/Projects/dynamic-sdk/apps/checkout-demo/` (HIGH confidence -- actual working code)
- Existing monorepo structure: `/Users/etesenair/Projects/demo-dashboard/` (HIGH confidence -- the target codebase)
- Dynamic SDK API surface: derived from reference implementation imports (HIGH confidence)
- `@dynamic-demos/ui` component inventory: from `packages/ui/src/` listing (HIGH confidence)

---

*Architecture analysis: 2026-03-31*
