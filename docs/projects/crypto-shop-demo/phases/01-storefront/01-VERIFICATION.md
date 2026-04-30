---
phase: 01-storefront
verified: 2026-03-31T08:00:00Z
status: gaps_found
score: 7/8 must-haves verified
re_verification: false
gaps:
  - truth: "Dynamic SDK initialized with chain extensions (EVM, Solana, Bitcoin, Sui, Tron)"
    status: partial
    reason: "SHELL-02 requires Bitcoin, Sui, and Tron extensions. The plan and implementation include only EVM, Solana, and WalletConnect. The Dynamic Labs SDK packages for Bitcoin (@dynamic-labs-sdk/bitcoin), Sui, and Tron are not present in the monorepo lockfile at all. The research acknowledged this gap but noted uncertainty about lockfile availability and proceeded without them."
    artifacts:
      - path: "apps/shop/lib/dynamic-client.ts"
        issue: "Only addEvmExtension, addSolanaExtension, and addWalletConnectEvmExtension are registered. Bitcoin, Sui, and Tron extensions are absent."
      - path: "apps/shop/package.json"
        issue: "No @dynamic-labs-sdk/bitcoin, @dynamic-labs-sdk/sui, or @dynamic-labs-sdk/tron dependencies declared."
    missing:
      - "Determine whether Bitcoin, Sui, and Tron SDK packages are available for @dynamic-labs-sdk 0.12.1 and add them to package.json if so"
      - "If packages exist: add addBitcoinExtension, addSuiExtension, addTronExtension calls to apps/shop/lib/dynamic-client.ts"
      - "If packages are not available at this SDK version, update REQUIREMENTS.md SHELL-02 description to reflect actual supported chains and mark as accepted deviation"
human_verification:
  - test: "Visual: dark/light mode toggle switches entire app theme"
    expected: "Clicking the sun/moon icon in the header toggles the page between dark (black background) and light (white background) mode with all text and card colors updating consistently"
    why_human: "CSS class toggling on html element and runtime theme resolution cannot be verified statically"
  - test: "Visual: SDK initialization gate shows spinner until ready"
    expected: "A brief loading spinner appears on first page load before the product grid renders, confirming DynamicClientProvider blocks rendering until waitForDynamicClientInitialized resolves"
    why_human: "Async runtime behavior — the Spinner branch in DynamicClientProvider exists in code but only visible when isReady is falsy during SDK init, requires live observation"
  - test: "Console: no double-init errors in Strict Mode"
    expected: "Browser console shows no warnings about duplicate SDK initialization across React Strict Mode double-invocation"
    why_human: "React Strict Mode double-invoke behavior is only observable at runtime"
---

# Phase 1: Storefront Verification Report

**Phase Goal:** Users can browse a themed product catalog in a properly configured Turborepo app with Dynamic SDK initialized and ready
**Verified:** 2026-03-31T08:00:00Z
**Status:** gaps_found — 1 requirement partially satisfied (SHELL-02 missing Bitcoin, Sui, Tron extensions)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | App runs at localhost:4002 via `pnpm dev` from monorepo root and renders without errors | VERIFIED | `pnpm --filter shop build` exits 0; `dev: "next dev -p 4002"` in package.json; shop is a recognized pnpm workspace |
| 2 | Product grid displays all catalog items with emoji, name, and USD price using `@dynamic-demos/ui` components | VERIFIED | `apps/shop/app/page.tsx` maps products array through `<ProductCard>`, which imports `Card`, `CardContent`, `Button` from `@dynamic-demos/ui` and renders `product.emoji`, `product.name`, `product.description`, `formatCurrency(product.price)` |
| 3 | Each product card has a visible "Add to Cart" button (wired in Phase 2) | VERIFIED | `product-card.tsx` line 15: `<Button variant="primary" size="sm" className="w-full">Add to Cart</Button>` — `primary` variant is valid in `@dynamic-demos/ui` Button |
| 4 | Dark/light mode toggle switches the entire app theme consistently | VERIFIED (human confirm needed) | `theme-toggle.tsx` uses `useTheme().resolvedTheme` and `setTheme` from next-themes; `ThemeProvider attribute="class"` in providers.tsx; `@custom-variant dark` in globals.css; `suppressHydrationWarning` on `<html>` in layout.tsx |
| 5 | Dynamic SDK initializes without errors (no double-init in Strict Mode) and initialization gate prevents rendering before SDK is ready | VERIFIED (human confirm needed) | `dynamic-client.ts` uses module-level `let initialized = false` guard with `autoInitialize: false`; `DynamicClientProvider.tsx` uses `useRef` guard in `useEffect` and `useQuery({ staleTime: Infinity })` to gate on `waitForDynamicClientInitialized`; Spinner shown when `!isReady` |

**Score:** 5/5 truths verified (with 3 items flagged for human runtime confirmation)

### Required Artifacts

**Plan 01-01 Artifacts:**

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/shop/package.json` | App package manifest | VERIFIED | Contains `"name": "@dynamic-demos/shop"`, `"dev": "next dev -p 4002"`, all required SDK deps |
| `apps/shop/lib/dynamic-client.ts` | SDK singleton initialization | VERIFIED | Contains `let initialized = false`, `autoInitialize: false`, `addEvmExtension`, `addSolanaExtension`, `addWalletConnectEvmExtension` — but missing Bitcoin, Sui, Tron |
| `apps/shop/components/DynamicClientProvider.tsx` | SDK initialization gate | VERIFIED | Contains `waitForDynamicClientInitialized` (local wrapper), `initializedRef.current`, `staleTime: Infinity`, `<Spinner>` loading state |
| `apps/shop/components/theme-toggle.tsx` | Dark/light mode toggle | VERIFIED | Contains `useTheme`, `resolvedTheme`, `setTheme`, Sun/Moon icons |
| `apps/shop/lib/providers.tsx` | Provider composition | VERIFIED | Contains `ThemeProvider` (from `@dynamic-demos/ui`), `QueryClientProvider`, `DynamicClientProvider` in correct nesting order |
| `apps/shop/globals.css` | Tailwind + CSS custom properties | VERIFIED | Contains `@source`, `@custom-variant dark`, `--widget-page-bg`, `.dark {` — 115 CSS custom property definitions |

**Plan 01-02 Artifacts:**

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/shop/data/products.ts` | Static product catalog data | VERIFIED | Exports `Product` interface and `products: Product[]` with exactly 9 items (hoodie through keychain) |
| `apps/shop/components/product-card.tsx` | Product card using @dynamic-demos/ui | VERIFIED | Imports `Card, CardContent, Button` from `@dynamic-demos/ui`, `formatCurrency` from `@dynamic-demos/utils`, renders "Add to Cart" |
| `apps/shop/app/page.tsx` | Shop page with product grid | VERIFIED | Contains `products.map`, `ProductCard`, `ThemeToggle`, responsive grid `grid-cols-2 md:grid-cols-3` |

### Key Link Verification

**Plan 01-01 Links:**

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `apps/shop/app/layout.tsx` | `apps/shop/lib/providers.tsx` | `import Providers from` | WIRED | Line 3: `import Providers from "@/lib/providers"`, line 18: `<Providers>{children}</Providers>` |
| `apps/shop/lib/providers.tsx` | `apps/shop/components/DynamicClientProvider.tsx` | `DynamicClientProvider wraps children` | WIRED | Line 5: import, lines 14-16: `<DynamicClientProvider>{children}</DynamicClientProvider>` |
| `apps/shop/components/DynamicClientProvider.tsx` | `apps/shop/lib/dynamic-client.ts` | `calls initializeDynamicClient` | WIRED | Line 5: imports both `initializeDynamicClient` and `waitForDynamicClientInitialized`, both called |

**Plan 01-02 Links:**

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `apps/shop/app/page.tsx` | `apps/shop/data/products.ts` | `imports products array` | WIRED | Line 1: `import { products } from "@/data/products"`, mapped at line 14 |
| `apps/shop/app/page.tsx` | `apps/shop/components/product-card.tsx` | `renders ProductCard per product` | WIRED | Line 2: import, line 15: `<ProductCard key={product.id} product={product} />` |
| `apps/shop/components/product-card.tsx` | `@dynamic-demos/ui` | `imports Card, CardContent, Button` | WIRED | Line 1: `import { Card, CardContent, Button } from "@dynamic-demos/ui"` |
| `apps/shop/components/product-card.tsx` | `@dynamic-demos/utils` | `imports formatCurrency` | WIRED | Line 2: import, line 14: `formatCurrency(product.price)` used in render |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| SHELL-01 | 01-01-PLAN | App scaffolded as `apps/shop` in Turborepo with proper config | SATISFIED | `apps/shop` recognized by pnpm workspace; `pnpm-workspace.yaml` includes `apps/*`; all config files present (package.json, tsconfig.json, next.config.ts, postcss.config.mjs, eslint.config.mjs) |
| SHELL-02 | 01-01-PLAN | Dynamic SDK initialized with chain extensions (EVM, Solana, Bitcoin, Sui, Tron) | PARTIAL | EVM, Solana, and WalletConnect extensions registered; Bitcoin, Sui, and Tron extensions absent from dynamic-client.ts and not in monorepo lockfile |
| SHELL-03 | 01-01-PLAN | UI built with `@dynamic-demos/ui` components | SATISFIED | Card, CardContent, Button, Spinner, ThemeProvider all imported from `@dynamic-demos/ui` across multiple files |
| SHELL-04 | 01-01-PLAN | Theming consistent with checkouts app via `@dynamic-demos/theme` | SATISFIED | `globals.css` copied from checkouts app (with intentional dark mode background fix to pure black per user feedback); `@dynamic-demos/theme` in dependencies; CSS custom property system identical structure; ThemeProvider wraps app |
| SHELL-05 | 01-01-PLAN | Dark/light mode toggle | SATISFIED | `theme-toggle.tsx` using next-themes `useTheme`, Sun/Moon icons, wired into page header |
| CATL-01 | 01-02-PLAN | Product data defined (emoji, name, price per item) | SATISFIED | `apps/shop/data/products.ts` exports typed `Product` interface with `id, name, emoji, price, description` and array of 9 items |
| CATL-02 | 01-02-PLAN | Product grid displays all items with emoji, name, and USD price | SATISFIED | `page.tsx` maps all products through `ProductCard`; card renders emoji, name, description, `formatCurrency(price)` |
| CATL-03 | 01-02-PLAN | Each product has an "Add to Cart" button | SATISFIED | `product-card.tsx` renders `<Button>Add to Cart</Button>` using `@dynamic-demos/ui` Button with `variant="primary"` (valid variant) |

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `apps/shop/app/page.tsx` (Plan 01-01 version, now replaced) | "Products coming soon..." placeholder text | N/A | This was the intended temporary placeholder from Plan 01-01. Plan 01-02 replaced it with the full product grid. No issue — by Plan 01-02 completion the placeholder is gone. |

No active anti-patterns found in the final state of any file. No TODO/FIXME comments, no stub implementations, no empty handlers, no console.logs in source files.

**Note on `product-card.tsx` Button variant:** The SUMMARY claims `default` variant was used, but the actual committed code uses `variant="primary"`. This is not a bug — `primary` is a valid variant in `@dynamic-demos/ui` Button (confirmed in `packages/ui/src/button.tsx` line 14). The SUMMARY was inaccurate on this detail; the code is correct.

### Human Verification Required

#### 1. Dark/Light Mode Theme Toggle

**Test:** Start `pnpm --filter shop dev`, navigate to localhost:4002, click the sun/moon icon in the top-right of the header.
**Expected:** Entire page switches between dark mode (pure black background, white text) and light mode (light grey background, dark text). All card backgrounds, text colors, and border colors should update consistently. No flash of unstyled content.
**Why human:** CSS class toggling on the html element and next-themes resolution cannot be verified statically.

#### 2. SDK Initialization Gate Spinner

**Test:** With the dev server running, do a hard reload of localhost:4002 and watch the first paint.
**Expected:** A spinner (centered on screen) briefly appears before the product grid renders, confirming `DynamicClientProvider` is blocking on `waitForDynamicClientInitialized`.
**Why human:** Async runtime behavior — the Spinner branch exists in code but only observable live during the SDK init window.

#### 3. No Double-Init Errors in Strict Mode

**Test:** Open browser DevTools console, hard-reload localhost:4002, watch for errors or warnings.
**Expected:** No messages about duplicate Dynamic SDK initialization. The `useRef` guard in `DynamicClientProvider` and module-level `let initialized = false` guard in `dynamic-client.ts` should prevent React Strict Mode double-invoke from causing double-init.
**Why human:** React Strict Mode double-invocation behavior is only observable at runtime.

### Gaps Summary

**One gap found** blocking full SHELL-02 compliance:

**SHELL-02 — Missing Bitcoin, Sui, and Tron chain extensions**

The REQUIREMENTS.md SHELL-02 explicitly lists "EVM, Solana, Bitcoin, Sui, Tron" as the required chain extensions. The implementation in `apps/shop/lib/dynamic-client.ts` registers only EVM, Solana, and WalletConnect. Neither `@dynamic-labs-sdk/bitcoin` nor any Sui/Tron equivalent packages are present in the monorepo's pnpm lockfile for the `@dynamic-labs-sdk` 0.12.1 version.

The research file (line 505-506) explicitly flagged this uncertainty: "Requirements say 'EVM, Solana, Bitcoin, Sui, Tron' but those extra extensions (Bitcoin/Sui/Tron) are not in the monorepo lockfile at the same version." The plan resolved this by starting with EVM + Solana + WalletConnect to match the checkouts app pattern, but did not close the requirement.

**Resolution options:**
1. If `@dynamic-labs-sdk/bitcoin`, `@dynamic-labs-sdk/sui`, `@dynamic-labs-sdk/tron` packages exist at version 0.12.1 — add them to `apps/shop/package.json` and `dynamic-client.ts`
2. If these packages are unavailable at this SDK version — update REQUIREMENTS.md SHELL-02 to reflect the actually supported chains and document this as an accepted constraint

This gap is isolated to `dynamic-client.ts` and `package.json` — it does not affect the browsable storefront goal or any other requirement. All catalog, theming, and core SDK functionality is fully working.

---

_Verified: 2026-03-31T08:00:00Z_
_Verifier: Claude (gsd-verifier)_
