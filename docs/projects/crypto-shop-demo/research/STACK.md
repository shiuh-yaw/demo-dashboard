# Technology Stack

**Project:** Crypto Shop Demo (`apps/shop`)
**Researched:** 2026-03-31

## Recommended Stack

This app lives inside the existing Turborepo monorepo. The stack is constrained by monorepo alignment -- the goal is to add as few new dependencies as possible while filling genuine gaps.

### Core Framework (Inherited -- No New Dependencies)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 15.5.9 | App Router, SSR/SSG | Monorepo standard. All apps use this version. |
| React | 19.1.4 | UI rendering | Monorepo standard. |
| React DOM | 19.1.4 | DOM rendering | Monorepo standard. |
| TypeScript | 5.9.3 | Type safety | Monorepo standard. |

**Confidence:** HIGH -- directly read from lockfile and existing app `package.json` files.

### Styling (Inherited -- No New Dependencies)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | 4.1.18 | Utility CSS | Monorepo standard. Checkouts app uses this exact version. |
| @tailwindcss/postcss | 4.1.18 | Build integration | Monorepo standard. |
| clsx | 2.1.1 | Conditional classes | Monorepo standard. |
| tailwind-merge | 3.4.0 | Class dedup | Monorepo standard (checkouts version). |
| tw-animate-css | 1.4.0 | Animations | Monorepo standard. |
| next-themes | 0.4.6 | Dark/light mode | Monorepo standard, already in @dynamic-demos/ui. |

**Confidence:** HIGH -- versions taken directly from `apps/checkouts/package.json`.

### Shared Workspace Packages (Inherited -- No New Dependencies)

| Package | Purpose | Why |
|---------|---------|-----|
| @dynamic-demos/ui | Button, Card, WidgetCard, ListRow, Dialog, Spinner, etc. | PROJECT.md requirement: reuse existing component library. |
| @dynamic-demos/theme | Design tokens, theme config | Visual consistency with checkouts app. |
| @dynamic-demos/utils | `cn()`, `formatCurrency()` | Utility reuse. |
| @dynamic-demos/types | Shared TypeScript types | Type reuse where applicable. |
| @dynamic-demos/tsconfig | TSConfig base | Monorepo standard. |

**Confidence:** HIGH -- these packages exist and are used by every app in the monorepo.

### Dynamic SDK (Inherited -- Match Existing Versions)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @dynamic-labs-sdk/client | 0.12.1 | Headless checkout SDK (createCheckoutTransaction, attachSource, getQuote, submit, poll) | Core requirement. Checkouts app already uses this exact version. The reference checkout-demo shows the 5-step flow pattern. |
| @dynamic-labs-sdk/evm | 0.12.1 | EVM chain support (Ethereum, Polygon, Base, etc.) | Multi-chain wallet connection. Already used in checkouts app. |
| @dynamic-labs-sdk/solana | 0.12.1 | Solana chain support | Multi-chain coverage. Already used in checkouts app. |
| @dynamic-labs-sdk/wallet-connect | 0.12.1 | WalletConnect protocol support | External wallet connectivity. Already used in checkouts app. |

**Confidence:** HIGH -- versions locked in monorepo `pnpm-lock.yaml`. The `@dynamic-labs-sdk/client` is a private package (not on npm public registry) published internally by Dynamic Labs at version 0.12.1 in this monorepo.

**Note on chain extensions:** The reference checkout-demo also uses `@dynamic-labs-sdk/bitcoin`, `@dynamic-labs-sdk/sui`, and `@dynamic-labs-sdk/tron` (all at 0.21.0 in the reference repo). The existing checkouts app only includes EVM + Solana + WalletConnect. Start with those three to match the existing app. Add Bitcoin/Sui/Tron only if explicitly needed for the demo.

### New Dependencies (Actually New to apps/shop)

| Technology | Version | Purpose | Why This, Why Now |
|------------|---------|---------|-------------------|
| @tanstack/react-query | 5.90.16 | Async state for SDK calls (wallet init, checkout polling, token balances) | **Already used in monorepo** (trade, deposit apps use this exact version). The reference checkout-demo uses it for `waitForClientInitialized` and transaction restoration. Essential for the checkout flow polling pattern. |
| sonner | 2.0.7 | Toast notifications for transaction success/failure/errors | Lightweight (< 5KB), zero-config. The reference checkout-demo already uses this exact version. Better UX than alert() for async crypto operations. |
| class-variance-authority | 0.7.1 | Component variant management | Already used in checkouts app at this version. Needed if building any local variant components. |

**Confidence:** HIGH for react-query (verified in monorepo lockfile). MEDIUM for sonner (verified version from reference checkout-demo package.json and npm).

### What NOT to Add

| Technology | Why Not |
|------------|---------|
| Zustand / Jotai / Redux | Cart state is a single array of items with quantities. React `useState` + Context is sufficient for a demo app with no persistence. Adding a state management library for this is over-engineering. The reference checkout-demo manages all its state with plain `useState`. |
| @tanstack/react-table | No table views needed. Product grid is a simple map over JSON. |
| Prisma / Drizzle / any ORM | No database. Products are JSON, cart is local state, checkout is SDK-driven. |
| nuqs | URL state management is unnecessary -- cart doesn't need to be shareable via URL for a demo. |
| react-hook-form | No complex forms. The only "input" is quantity +/- buttons and wallet selection. |
| Framer Motion | Animations should use Tailwind CSS transitions + tw-animate-css (already in monorepo). Adding a 30KB animation library for a demo is wasteful. |
| @radix-ui/* (beyond what's in @dynamic-demos/ui) | The shared UI package already wraps Dialog via Radix. Don't add more Radix primitives directly -- use the shared components. |
| Stripe / payment processors | This is a crypto-only checkout demo. Payment is through Dynamic SDK. |
| next-intl / i18n | English-only demo. |

## Cart State Architecture Decision

**Decision: React Context + useReducer, no external library.**

Rationale:
- Cart has ~4 operations: add, remove, update quantity, clear
- State shape is `{ items: Array<{ productId, quantity }> }`
- No persistence needed (PROJECT.md: "transactions are fire-and-forget for demo")
- No cross-tab sync needed
- No derived async state
- `useReducer` gives predictable state transitions without a library

This matches the pattern in the reference checkout-demo, which uses plain `useState` for all widget state including the 5-step checkout flow.

## SDK Initialization Pattern

Based on the reference checkout-demo (`DynamicClientProvider.tsx`):

```typescript
// 1. Create client with environment ID (once, at module level)
createDynamicClient({
  environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
});

// 2. Initialize + add chain extensions
initializeClient();
addEvmExtension();
addSolanaExtension();

// 3. Wait for ready state before rendering children
await waitForClientInitialized(); // via @tanstack/react-query
```

This pattern requires `@tanstack/react-query` for the `useQuery` wrapper around `waitForClientInitialized()`. This is why react-query is listed as a new dependency even though checkout flow itself could theoretically use raw `useEffect`.

## Environment Variables

New env vars needed for `apps/shop`:

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` | Yes | Dynamic Labs environment for SDK init |

No additional API keys needed. The Dynamic SDK client handles checkout server-side via its own environment configuration. No backend API routes means no server-side secrets.

## Installation

```bash
# From monorepo root -- all dependencies are either workspace packages or already in lockfile
cd apps/shop
pnpm add @dynamic-labs-sdk/client@0.12.1 @dynamic-labs-sdk/evm@0.12.1 @dynamic-labs-sdk/solana@0.12.1 @dynamic-labs-sdk/wallet-connect@0.12.1 @tanstack/react-query@5.90.16 sonner@2.0.7 class-variance-authority@0.7.1 clsx@2.1.1 tailwind-merge@3.4.0 lucide-react@0.541.0 next@15.5.9 react@19.1.4 react-dom@19.1.4 zod@3.24.3

# Workspace packages (in package.json)
# "@dynamic-demos/ui": "workspace:*"
# "@dynamic-demos/theme": "workspace:*"
# "@dynamic-demos/utils": "workspace:*"
# "@dynamic-demos/types": "workspace:*"

# Dev dependencies
pnpm add -D @dynamic-demos/tsconfig@workspace:* @tailwindcss/postcss@4.1.18 tailwindcss@4.1.18 tw-animate-css@1.4.0 typescript@5.9.3 @types/react@19.2.5 @types/react-dom@19.2.3 @types/node@20.19.27 eslint@9.39.1 eslint-config-next@15.5.4 @eslint/eslintrc@3.3.1
```

## Dependency Budget Summary

| Category | Count | Notes |
|----------|-------|-------|
| Inherited from monorepo (workspace packages) | 5 | ui, theme, utils, types, tsconfig |
| Inherited from monorepo (same versions as other apps) | 12 | Next, React, Tailwind, Dynamic SDK, etc. |
| Genuinely new to this app | 1 | sonner (toast notifications) |
| Already in monorepo lockfile but new to this app | 1 | @tanstack/react-query |

**Total new dependencies not already in monorepo: 1** (sonner). Everything else is version-matched to existing apps.

## Sources

- Monorepo `pnpm-lock.yaml` -- version verification for all existing packages
- `apps/checkouts/package.json` -- dependency alignment reference
- Reference checkout-demo at `/Users/etesenair/Projects/dynamic-sdk/apps/checkout-demo/` -- SDK usage patterns, DynamicClientProvider, CheckoutWidget flow
- [sonner npm](https://www.npmjs.com/package/sonner) -- version 2.0.7 confirmed
- [Zustand vs Jotai comparison](https://dev.to/hijazi313/state-management-in-2025-when-to-use-context-redux-zustand-or-jotai-2d2k) -- evaluated and rejected for this use case
- [nuqs](https://nuqs.dev/) -- evaluated and rejected for this use case

---

*Stack analysis: 2026-03-31*
