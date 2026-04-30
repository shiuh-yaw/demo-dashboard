# Feature Landscape

**Domain:** Crypto shopping demo app (Dynamic SDK showcase)
**Researched:** 2026-03-31

## Table Stakes

Features users expect from a shopping demo that showcases crypto checkout. Missing any of these and the demo feels broken or incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Product catalog grid | Cannot demo "shopping" without browsable products | Low | JSON-driven, emoji images. 6-12 items is the sweet spot -- enough to feel like a store, few enough to not need pagination. |
| Add to cart | Core shopping interaction; without it there's no cart | Low | Single click per product, show visual feedback (badge count, toast). |
| Cart view with item list | Users need to see what they're buying before checkout | Low | Show product emoji, name, quantity, line total. |
| Quantity controls (add/remove/delete) | Users expect to adjust quantities in cart, not re-browse | Low | +/- buttons per item, swipe-to-delete or trash icon. |
| Cart total display | Must show what the user will pay | Low | Sum of line totals. USD-only per PROJECT.md scope. |
| Empty cart state | Prevents confusion when cart is empty | Low | Friendly illustration/emoji + "Start shopping" CTA linking back to catalog. |
| Wallet connection | Cannot pay with crypto without connecting a wallet | Medium | Use Dynamic SDK `connectWithWalletProvider`. Show wallet list from `getAvailableWalletProvidersData`. Reference impl already covers this pattern. |
| Token selection with balances | Users need to choose which token to pay with and see if they have enough | Medium | List tokens with balance and USD value. Filter to tokens with sufficient balance. Matches reference `AttachSourceView` pattern. |
| Quote review screen | Users must see fees/total before committing funds | Medium | Show amount, fees, estimated time, total due. Direct port of reference `ReviewQuoteView`. |
| Transaction submission | The actual payment -- core purpose of the demo | Medium | Call `submitCheckoutTransaction` via SDK. Show signing prompt state. |
| Transaction status/confirmation | Users need to know if payment succeeded or failed | Medium | Poll `getCheckoutTransaction` for status. Show success/failure/pending states with appropriate visuals. |
| Basic error handling | Failed connections, rejected transactions, network errors must not show blank screens | Medium | Error states for: wallet connection failure, insufficient balance, transaction rejection, network timeout. Retry buttons where applicable. |
| Consistent UI with monorepo | Demo must look like it belongs in the same product family | Low | Use `@dynamic-demos/ui` components (WidgetCard, Button, ListRow, etc.) and `@dynamic-demos/theme`. |

## Differentiators

Features that make the demo impressive and memorable. Not expected, but elevate it from "functional" to "showcase-worthy."

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Animated cart badge | Bouncing/scaling badge on cart icon when items added -- small detail that feels polished | Low | CSS animation on count change. Framer Motion if already in monorepo, otherwise CSS keyframes. |
| Cart slide-over panel | Cart as a slide-out drawer rather than a separate page -- feels modern and keeps context | Low | Use a Sheet/Drawer component. Keeps product grid visible underneath. |
| Product "added" animation | Brief visual feedback on the product card itself when added (checkmark flash, scale pulse) | Low | CSS transition, no library needed. |
| Multi-chain indicator | Show which chain/network a token is on during token selection (chain icon + name) | Low | Data already available from Dynamic SDK. Visual indicator only. |
| Order summary during checkout | Carry the cart items visually through the checkout flow so users see what they're paying for | Low | Collapsible section in checkout widget showing emoji + name + qty. |
| Skeleton loading states | Proper skeleton placeholders while catalog/balances load instead of spinners | Low | Use existing `Skeleton` component from `@dynamic-demos/ui`. |
| "Pay with any token" messaging | Prominent callout that users can pay with ANY token they hold -- key Dynamic SDK selling point | Low | Banner or callout card near token selection. Emphasizes the SDK value prop. |
| Connected wallet persistent display | Show connected wallet address/avatar in header throughout the checkout flow | Low | Small wallet pill in top-right. Already patterned in reference impl `ConnectedWallet` component. |

## Anti-Features

Features to deliberately NOT build. These add complexity without serving the demo's purpose.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| User authentication / accounts | Demo should be zero-friction. No login wall before browsing. Wallet connection IS the auth moment and it only happens at checkout. | Let users browse freely. Wallet connects only when they tap "Pay." |
| Order history / persistence | Adds backend complexity (database, API routes) for minimal demo value. Transactions are fire-and-forget. | Show a success screen with transaction hash link to block explorer. That's the "receipt." |
| Real product images | Requires asset management, CDN, loading optimization. Emoji keeps it fun and lightweight. | Use emoji as product images. It's intentionally playful and on-brand for a demo. |
| Backend API routes for catalog | JSON catalog client-side is simpler. No server needed for product data. | Import products from a static JSON/TS file. |
| Search / filtering / categories | Overkill for 6-12 emoji products. Adds UI complexity that distracts from the checkout flow. | Simple grid. All products visible at once. |
| Inventory management | No real inventory. Every product is always "in stock." | Omit entirely. No stock counts, no sold-out states. |
| Shipping / delivery info | Physical delivery is irrelevant -- these are fun demo products, not real goods. | Skip entirely. No address forms, no shipping options. |
| Fiat payment fallback | Demo purpose is to showcase CRYPTO payments via Dynamic SDK. Fiat undermines the point. | Only crypto checkout. That's the whole demo. |
| Price in crypto | Adds complexity (real-time conversion, price volatility display). USD pricing with crypto payment is clearer. | Prices in USD. SDK handles conversion at checkout time. |
| Discount codes / coupons | E-commerce feature that adds form fields and logic without showcasing Dynamic SDK. | Omit entirely. Fixed prices. |
| Responsive mobile optimization | Demo is primarily for desktop showcasing. Basic mobile should work but pixel-perfect mobile is out of scope. | Use Tailwind responsive classes for basic mobile, but don't invest in mobile-specific UX. |
| Internationalization (i18n) | English-only demo. Multi-language adds significant complexity. | Hardcode English strings. |

## Feature Dependencies

```
Product Catalog (JSON data)
  --> Product Grid (display)
    --> Add to Cart (interaction)
      --> Cart State (React state)
        --> Cart View (display)
          --> Cart Total (calculation)
            --> Checkout Initiation (createCheckoutTransaction)
              --> Wallet Connection (connectWithWalletProvider)
                --> Token Selection (getAvailableTokens + balances)
                  --> Quote Review (attachSource + getQuote)
                    --> Transaction Submission (submitCheckoutTransaction)
                      --> Transaction Status (poll getCheckoutTransaction)
```

Key dependency insight: The shopping features (catalog, cart) are completely independent of the SDK integration (wallet, tokens, checkout). This means they can be built and polished in isolation before wiring up the Dynamic SDK flow.

## MVP Recommendation

**Phase 1 -- Shopping Shell (no SDK needed):**
1. Product catalog grid with emoji products from JSON
2. Cart state management (add/remove/quantity)
3. Cart view with totals
4. Empty cart state
5. "Checkout" button that transitions to payment flow

**Phase 2 -- Checkout Flow (SDK integration):**
1. Wallet connection via Dynamic SDK
2. Token selection with balance display
3. Quote review screen
4. Transaction submission
5. Transaction status / success screen
6. Error handling across all checkout steps

**Phase 3 -- Polish (differentiators):**
1. Cart slide-over panel
2. Animated cart badge
3. Skeleton loading states
4. Order summary in checkout
5. Multi-chain indicators

**Defer indefinitely:** All anti-features listed above. They add complexity without demonstrating Dynamic SDK capabilities.

## Sources

- Reference implementation: `/Users/etesenair/Projects/dynamic-sdk/apps/checkout-demo/` -- 5-step checkout flow (create, attachSource, reviewQuote, submit, status)
- Existing monorepo apps (`apps/deposit`, `apps/trade`, `apps/checkouts`) -- established UI patterns and component usage
- `@dynamic-demos/ui` component library -- available components (WidgetCard, Button, ListRow, Skeleton, etc.)
- [E-commerce UX best practices](https://www.designstudiouiux.com/blog/ecommerce-checkout-ux-best-practices/) -- cart and checkout patterns
- [Baymard Institute checkout research](https://baymard.com/research/checkout-usability) -- cart abandonment and UX patterns
- [DePay Web3 Payments](https://depay.com/) -- multi-token payment flow patterns
- [Dynamic Labs SDK](https://www.dynamic.xyz/sdk) -- checkout SDK capabilities
