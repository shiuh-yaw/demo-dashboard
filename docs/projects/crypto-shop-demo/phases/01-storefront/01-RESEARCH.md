# Phase 1: Storefront - Research

**Researched:** 2026-03-31
**Domain:** Turborepo app scaffolding, Dynamic SDK initialization, shared UI component consumption, Tailwind theming
**Confidence:** HIGH

## Summary

Phase 1 creates a new `apps/shop` Next.js app inside the existing Turborepo monorepo. The work is entirely brownfield -- every config file, dependency version, and pattern has a direct precedent in the existing `apps/checkouts` app. The app displays a static product catalog using `@dynamic-demos/ui` components, supports dark/light mode via `next-themes` (already wrapped in `ThemeProvider` from the UI package), and initializes the Dynamic SDK client as a singleton with a `useRef`-gated initialization and `@tanstack/react-query`-based readiness gate.

The research confirms that all dependencies exist in the monorepo lockfile at exact versions. No net-new third-party packages are needed for Phase 1 (the SDK, react-query, and all UI packages are already resolved). The only creative work is the product data JSON structure and the product grid layout -- everything else is copy-and-adapt from existing apps.

**Primary recommendation:** Clone the `apps/checkouts` scaffolding (package.json, tsconfig.json, next.config.ts, postcss.config.mjs, eslint.config.mjs, globals.css, layout.tsx, providers.tsx, dynamicClient.ts) as the starting skeleton, then customize for the shop use case. Do not start from `create-next-app`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SHELL-01 | App scaffolded as `apps/shop` in Turborepo monorepo with proper config | Exact scaffolding pattern documented from `apps/checkouts` -- package.json, tsconfig, next.config, postcss, eslint, globals.css. Port 4002. No turbo.json or workspace changes needed. |
| SHELL-02 | Dynamic SDK initialized with chain extensions (EVM, Solana, Bitcoin, Sui, Tron) | Two initialization patterns documented: (1) checkouts app singleton with `autoInitialize: true`, (2) reference checkout-demo with `useRef` guard + `initializeClient()`. Use pattern 2 with `useRef` for Strict Mode safety. Start with EVM + Solana + WalletConnect to match checkouts app. |
| SHELL-03 | UI built with `@dynamic-demos/ui` components (Card, Button, ListRow, WidgetCard, etc.) | Full component inventory documented. Product cards use `Card` + `CardContent`. "Add to Cart" uses `Button`. Grid layout is standard Tailwind CSS grid. |
| SHELL-04 | Theming consistent with checkouts app via `@dynamic-demos/theme` | Copy `globals.css` from checkouts verbatim -- contains all CSS custom properties for light/dark. `ThemeProvider` from `@dynamic-demos/ui` wraps app in Providers component. |
| SHELL-05 | Dark/light mode toggle | `next-themes` `useTheme()` hook provides `theme`/`setTheme`. Build a small toggle button (Sun/Moon icons from `lucide-react`). No existing toggle component in `@dynamic-demos/ui` -- must create locally. |
| CATL-01 | Product data defined in JSON file (emoji, name, price per item) | Product type and static data array pattern documented. TypeScript file with typed `Product[]` export. |
| CATL-02 | Product grid displays all items with emoji, name, and USD price | Grid layout using Tailwind `grid grid-cols-2 md:grid-cols-3` with `@dynamic-demos/ui` Card components. `formatCurrency()` from `@dynamic-demos/utils` for price display. |
| CATL-03 | Each product has an "Add to Cart" button | `Button` component from `@dynamic-demos/ui` with `variant="primary"`. Button is rendered but not wired to cart state until Phase 2. |
</phase_requirements>

## Standard Stack

### Core (All Inherited from Monorepo)

| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| Next.js | 15.5.9 | App Router, SSR shell | `apps/checkouts/package.json` |
| React | 19.1.4 | UI rendering | monorepo lockfile |
| TypeScript | 5.9.3 | Type safety | monorepo standard |
| Tailwind CSS | 4.1.18 | Utility CSS | `apps/checkouts` devDeps |
| @tailwindcss/postcss | 4.1.18 | PostCSS integration | `apps/checkouts` devDeps |
| next-themes | 0.4.6 | Dark/light mode | already in `@dynamic-demos/ui` peer |
| lucide-react | 0.541.0 | Icons (Sun, Moon, ShoppingCart) | `apps/checkouts` deps |
| clsx | 2.1.1 | Conditional classes | monorepo standard |
| tailwind-merge | 3.4.0 | Class dedup | `apps/checkouts` deps |
| class-variance-authority | 0.7.1 | Component variants | `apps/checkouts` deps |
| zod | 3.24.3 | Env validation | `apps/checkouts` deps |
| @t3-oss/env-nextjs | 0.11.1 | Type-safe env vars | `apps/checkouts` deps |

### Dynamic SDK (Match Existing Versions)

| Library | Version | Purpose |
|---------|---------|---------|
| @dynamic-labs-sdk/client | 0.12.1 | Core SDK, `createDynamicClient`, `waitForClientInitialized` |
| @dynamic-labs-sdk/evm | 0.12.1 | EVM chain extension |
| @dynamic-labs-sdk/solana | 0.12.1 | Solana chain extension |
| @dynamic-labs-sdk/wallet-connect | 0.12.1 | WalletConnect protocol |

### Workspace Packages

| Package | Purpose |
|---------|---------|
| @dynamic-demos/ui | Card, Button, Spinner, ThemeProvider, WidgetCard |
| @dynamic-demos/theme | Design tokens (CSS custom properties) |
| @dynamic-demos/utils | `cn()`, `formatCurrency()` |
| @dynamic-demos/types | Shared types (if needed) |
| @dynamic-demos/tsconfig | Shared TypeScript config (`nextjs.json`) |

### New to apps/shop (But Already in Monorepo Lockfile)

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| @tanstack/react-query | 5.90.16 | SDK initialization gate (`waitForClientInitialized`) | Used by trade/deposit apps. Required by DynamicClientProvider pattern. |

### Not Needed in Phase 1

| Library | Why Not |
|---------|---------|
| sonner | Toast notifications -- not needed until Phase 2 (cart add feedback) |
| Any state library | No cart state in Phase 1 |
| @radix-ui/* directly | Dialog not needed until Phase 2; all Radix is wrapped by @dynamic-demos/ui |

## Architecture Patterns

### Recommended Project Structure

```
apps/shop/
  app/
    layout.tsx              # Root layout (fonts, Providers wrapper)
    page.tsx                # Shop page (ProductGrid)
    globals.css             # Tailwind + CSS custom properties (copy from checkouts)
  components/
    theme-toggle.tsx        # Dark/light mode toggle button
  data/
    products.ts             # Static product data (typed Product[])
  lib/
    providers.tsx           # ThemeProvider + QueryClientProvider + DynamicClientProvider
    dynamic-client.ts       # SDK singleton initialization (module-level guard)
    env.ts                  # Zod-validated environment variables
  package.json
  tsconfig.json
  next.config.ts
  postcss.config.mjs
  eslint.config.mjs
```

### Pattern 1: App Scaffolding (Copy from checkouts)

**What:** Every config file in `apps/shop` follows the exact same structure as `apps/checkouts`.
**Why:** Monorepo consistency. Turbo pipeline, build tooling, and CI all expect identical shape.

Key files to clone and customize:

**package.json** -- name `@dynamic-demos/shop`, port 4002 in dev script, trim dependencies to only what Phase 1 needs:
```json
{
  "name": "@dynamic-demos/shop",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 4002",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit"
  }
}
```

**tsconfig.json** -- identical to checkouts:
```json
{
  "extends": "@dynamic-demos/tsconfig/nextjs.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**next.config.ts** -- identical to checkouts:
```typescript
const nextConfig = {
  webpack: (config: any) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
};
module.exports = nextConfig;
```

**postcss.config.mjs** -- identical:
```javascript
const config = { plugins: ["@tailwindcss/postcss"] };
export default config;
```

**eslint.config.mjs** -- identical to checkouts.

**globals.css** -- copy from checkouts verbatim. Contains all CSS custom properties for light/dark themes, widget variables, and Tailwind `@theme inline` block. Critical lines:
```css
@import "tailwindcss";
@import "tw-animate-css";
@source "../../packages/ui/src/**/*.tsx";
@source "../../packages/ui/src/**/*.ts";
@custom-variant dark (&:is(.dark *));
```

### Pattern 2: Dynamic SDK Singleton Initialization

**What:** Module-level boolean guard prevents double initialization in React 19 Strict Mode.
**Source:** Reference checkout-demo at `/Users/etesenair/Projects/dynamic-sdk/apps/checkout-demo/src/app/constants/dynamicClient.ts`

```typescript
// lib/dynamic-client.ts
import { createDynamicClient, initializeClient } from "@dynamic-labs-sdk/client";
import { addEvmExtension } from "@dynamic-labs-sdk/evm";
import { addSolanaExtension } from "@dynamic-labs-sdk/solana";
import { addWalletConnectEvmExtension } from "@dynamic-labs-sdk/evm/wallet-connect";
import { env } from "./env";

let initialized = false;

export const initializeDynamicClient = (): void => {
  if (initialized) return;
  initialized = true;

  const client = createDynamicClient({
    environmentId: env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
    autoInitialize: false,
  });

  void initializeClient();
  addEvmExtension();
  addSolanaExtension();
  void addWalletConnectEvmExtension();
};
```

**Important distinction:** The checkouts app uses `autoInitialize: true` and the reference checkout-demo uses `autoInitialize: false` + explicit `initializeClient()`. The reference pattern with `autoInitialize: false` is safer because it gives explicit control over when initialization starts. Use the reference pattern.

### Pattern 3: DynamicClientProvider (Initialization Gate)

**What:** Provider component that gates child rendering on SDK readiness using `@tanstack/react-query`.
**Source:** Reference checkout-demo `DynamicClientProvider.tsx`

```typescript
// components/DynamicClientProvider.tsx
"use client";

import { waitForClientInitialized } from "@dynamic-labs-sdk/client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, type FC, type ReactNode } from "react";
import { initializeDynamicClient } from "@/lib/dynamic-client";
import { Spinner } from "@dynamic-demos/ui";

export const DynamicClientProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initializeDynamicClient();
  }, []);

  const { data: isReady } = useQuery({
    queryFn: async () => {
      await waitForClientInitialized();
      return true;
    },
    queryKey: ["clientInitialized"],
    staleTime: Infinity,
  });

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return <>{children}</>;
};
```

**Why `useRef` instead of module-level in the component?** The module-level `let initialized = false` in `dynamic-client.ts` prevents double SDK creation. The `useRef` in the provider prevents double `useEffect` calls in Strict Mode. Both guards are needed.

### Pattern 4: Providers Composition

**What:** Wrap the app with ThemeProvider, QueryClientProvider, and DynamicClientProvider.
**Source:** `apps/checkouts/lib/providers.tsx` (adapted)

```typescript
// lib/providers.tsx
"use client";

import { ThemeProvider } from "@dynamic-demos/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DynamicClientProvider } from "@/components/DynamicClientProvider";
import { useState } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <DynamicClientProvider>
          {children}
        </DynamicClientProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

### Pattern 5: Static Product Data

**What:** Products as a typed TypeScript array, no data fetching.

```typescript
// data/products.ts
export interface Product {
  id: string;
  name: string;
  emoji: string;
  price: number;       // USD
  description: string;
}

export const products: Product[] = [
  { id: "hoodie",     name: "Crypto Hoodie",     emoji: "\ud83e\udde5", price: 59.99, description: "Stay warm, stay decentralized" },
  { id: "coffee-mug", name: "HODL Mug",          emoji: "\u2615",      price: 14.99, description: "Diamond hands need coffee" },
  { id: "laptop-bag", name: "Blockchain Bag",     emoji: "\ud83d\udcbb", price: 79.99, description: "Carry your nodes in style" },
  { id: "sticker",    name: "Sticker Pack",       emoji: "\ud83c\udfa8", price: 4.99,  description: "Plaster your laptop" },
  { id: "hat",        name: "Web3 Cap",           emoji: "\ud83e\udde2", price: 24.99, description: "Tip your cap to the future" },
  { id: "socks",      name: "Gas Fee Socks",      emoji: "\ud83e\udde6", price: 12.99, description: "Warm feet, low gas" },
  { id: "tshirt",     name: "DeFi T-Shirt",       emoji: "\ud83d\udc55", price: 29.99, description: "Yield farming casual wear" },
  { id: "poster",     name: "Moon Poster",         emoji: "\ud83c\udf19", price: 19.99, description: "When moon? Now moon." },
  { id: "keychain",   name: "Private Key-chain",  emoji: "\ud83d\udd11", price: 9.99,  description: "Not your keys, not your crypto" },
];
```

### Pattern 6: Dark/Light Mode Toggle

**What:** Simple toggle button using `useTheme()` from `next-themes` and icons from `lucide-react`.
**Why build locally:** No toggle component exists in `@dynamic-demos/ui`. The trade app uses `useTheme` but for dynamic CSS variable injection, not a toggle button.

```typescript
// components/theme-toggle.tsx
"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Button } from "@dynamic-demos/ui";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
```

### Anti-Patterns to Avoid

- **Do not run `create-next-app`:** Clone from checkouts. `create-next-app` generates different defaults (app router structure, config format, tailwind version) that require manual alignment.
- **Do not add `next-themes` as a direct dependency:** It is already a dependency of `@dynamic-demos/ui`. Import `useTheme` from `next-themes` directly (it is in the lockfile).
- **Do not modify `turbo.json` or `pnpm-workspace.yaml`:** The existing `apps/*` glob already covers `apps/shop`. The existing task pipeline handles `build`, `dev`, `lint`, `typecheck` automatically.
- **Do not use `autoInitialize: true` for SDK:** The reference implementation uses `autoInitialize: false` + explicit `initializeClient()` for better control. The checkouts app's `autoInitialize: true` pattern works but is less explicit.
- **Do not fetch product data:** Static TypeScript import. Zero loading states, zero error handling for product data.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Card layout | Custom card component | `Card` from `@dynamic-demos/ui` | Already styled with CSS variables for theming |
| Button variants | Custom button styles | `Button` from `@dynamic-demos/ui` | Has primary, secondary, ghost, outline, loading states |
| Class merging | Manual string concat | `cn()` from `@dynamic-demos/utils` | Handles Tailwind class conflicts via tailwind-merge |
| Currency formatting | `toFixed(2)` | `formatCurrency()` from `@dynamic-demos/utils` | Handles locale, symbol, NaN |
| Theme switching | Custom context | `ThemeProvider` from `@dynamic-demos/ui` | Wraps `next-themes`, handles class-based dark mode |
| Loading spinner | CSS animation | `Spinner` from `@dynamic-demos/ui` | Consistent with other apps |
| SDK initialization | Raw useEffect | `DynamicClientProvider` pattern | Handles Strict Mode, initialization gate, loading state |

## Common Pitfalls

### Pitfall 1: Double SDK Initialization in React 19 Strict Mode
**What goes wrong:** `useEffect` runs twice in Strict Mode, creating two SDK client instances.
**Why it happens:** React 19 Strict Mode intentionally double-invokes effects for purity checking.
**How to avoid:** Module-level `let initialized = false` guard in `dynamic-client.ts` AND `useRef` guard in `DynamicClientProvider`. Both are needed.
**Warning signs:** Console warnings about duplicate client creation, or SDK functions failing silently.

### Pitfall 2: Rendering Before SDK is Ready
**What goes wrong:** Components that depend on the SDK render before `waitForClientInitialized()` resolves.
**Why it happens:** The SDK client is created synchronously but initialization is async. Functions called before initialization completes return empty/undefined.
**How to avoid:** `DynamicClientProvider` gates all children behind `useQuery` that resolves when SDK is ready. Shows `Spinner` during init.
**Warning signs:** Empty wallet provider lists, undefined network data, silent SDK call failures.

### Pitfall 3: Missing Tailwind @source Directive for Shared Packages
**What goes wrong:** Tailwind classes used in `@dynamic-demos/ui` components are purged in production builds.
**Why it happens:** Tailwind 4's content scanning only scans the app's own files by default.
**How to avoid:** Include `@source "../../packages/ui/src/**/*.tsx";` in `globals.css` (already present in the checkouts template).
**Warning signs:** Components render with missing styles in `next build` but work fine in `next dev`.

### Pitfall 4: `suppressHydrationWarning` Missing on `<html>` Tag
**What goes wrong:** React hydration mismatch error because `next-themes` adds `class="dark"` or `class="light"` to `<html>` on the client.
**Why it happens:** Server renders without theme class, client adds it immediately.
**How to avoid:** Add `suppressHydrationWarning` to the `<html>` element in `layout.tsx` (present in checkouts layout).
**Warning signs:** Console hydration mismatch warning on page load.

### Pitfall 5: Webpack Externals for SDK Dependencies
**What goes wrong:** Build errors or runtime crashes from `pino-pretty`, `lokijs`, or `encoding` modules.
**Why it happens:** The Dynamic SDK pulls in Node.js dependencies that don't exist in browser context.
**How to avoid:** Add webpack externals in `next.config.ts`: `config.externals.push("pino-pretty", "lokijs", "encoding")`. This is already in the checkouts template.
**Warning signs:** Module not found errors during `next build`.

## Code Examples

### Root Layout (layout.tsx)
```typescript
// Source: apps/checkouts/app/layout.tsx (adapted)
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Providers from "@/lib/providers";
import "@/app/globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Crypto Shop",
  description: "Browse and pay with crypto via Dynamic SDK",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Environment Validation (env.ts)
```typescript
// Source: apps/checkouts/lib/env.ts (simplified for shop)
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  client: {
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: z.string().min(1),
  },
  runtimeEnv: {
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
    NODE_ENV: process.env.NODE_ENV,
  },
});
```

### Product Card Component
```typescript
// Using @dynamic-demos/ui Card + Button
import { Card, CardContent, Button } from "@dynamic-demos/ui";
import { formatCurrency } from "@dynamic-demos/utils";
import type { Product } from "@/data/products";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Card variant="widget">
      <CardContent className="flex flex-col items-center gap-3 p-6">
        <span className="text-4xl">{product.emoji}</span>
        <div className="text-center">
          <h3 className="font-medium text-sm">{product.name}</h3>
          <p className="text-muted-foreground text-xs mt-1">{product.description}</p>
        </div>
        <p className="font-semibold text-lg">{formatCurrency(product.price)}</p>
        <Button variant="primary" size="sm" className="w-full">
          Add to Cart
        </Button>
      </CardContent>
    </Card>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind v3 `content` config | Tailwind v4 `@source` directive in CSS | Tailwind 4.x | Must use `@source` not `tailwind.config.js` content array |
| `tailwind.config.js` | `@theme inline` in CSS | Tailwind 4.x | Theme tokens defined in CSS, not JS config |
| Dynamic SDK `DynamicContextProvider` (React) | `@dynamic-labs-sdk/client` headless API | SDK 0.12.x | No React provider component from SDK -- build your own |
| `useEffect` for SDK init | `useRef` + module guard | React 19 Strict Mode | Double-effect protection required |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected in monorepo (no test config files found) |
| Config file | none -- see Wave 0 |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SHELL-01 | App builds without errors | smoke | `cd apps/shop && pnpm build` | N/A (build command) |
| SHELL-02 | SDK initializes without errors | manual-only | Start dev server, check console for SDK init logs | N/A |
| SHELL-03 | UI renders with @dynamic-demos/ui components | manual-only | Visual inspection of product grid | N/A |
| SHELL-04 | Theme CSS variables applied | manual-only | Inspect computed styles match checkouts app | N/A |
| SHELL-05 | Dark/light toggle works | manual-only | Click toggle, verify class changes on html element | N/A |
| CATL-01 | Products data file exists and is typed | smoke | `cd apps/shop && pnpm typecheck` | N/A (typecheck command) |
| CATL-02 | Product grid renders all items | manual-only | Count rendered cards matches products array length | N/A |
| CATL-03 | Add to Cart button visible on each card | manual-only | Visual inspection | N/A |

### Sampling Rate
- **Per task commit:** `cd apps/shop && pnpm typecheck && pnpm build`
- **Per wave merge:** `pnpm build` (monorepo-wide)
- **Phase gate:** `pnpm build` green + manual visual check of all 5 success criteria

### Wave 0 Gaps
No test framework setup needed for Phase 1. The existing monorepo has no test infrastructure. Validation relies on TypeScript compiler (`pnpm typecheck`), build success (`pnpm build`), and manual verification of the 5 success criteria. Adding a test framework is out of scope for this demo app.

## Open Questions

1. **SDK chain extensions scope**
   - What we know: Checkouts app uses EVM + Solana + WalletConnect. Reference checkout-demo also adds Bitcoin, Sui, Tron.
   - What's unclear: Requirements say "EVM, Solana, Bitcoin, Sui, Tron" but those extra extensions (Bitcoin/Sui/Tron) are not in the monorepo lockfile at the same version.
   - Recommendation: Start with EVM + Solana + WalletConnect (matching checkouts app). Add others in Phase 3 if checkout testing reveals they are needed. The extensions are additive and can be added without refactoring.

2. **`NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` value**
   - What we know: The checkouts app already has this configured in `.env`.
   - What's unclear: Whether the shop app should use the same environment ID or a separate one.
   - Recommendation: Use the same environment ID as checkouts (copy `.env` value). A single Dynamic environment can serve multiple apps.

## Sources

### Primary (HIGH confidence)
- `apps/checkouts/package.json` -- dependency versions, scripts, project structure
- `apps/checkouts/lib/dynamicClient.ts` -- SDK singleton pattern (production code)
- `apps/checkouts/lib/providers.tsx` -- Provider composition pattern
- `apps/checkouts/lib/env.ts` -- Environment validation pattern
- `apps/checkouts/globals.css` -- Tailwind 4 theme configuration with CSS custom properties
- `apps/checkouts/app/layout.tsx` -- Root layout pattern (fonts, hydration suppression)
- `apps/checkouts/tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs` -- Config files
- `/Users/etesenair/Projects/dynamic-sdk/apps/checkout-demo/src/app/constants/dynamicClient.ts` -- Module-level initialization guard pattern
- `/Users/etesenair/Projects/dynamic-sdk/apps/checkout-demo/src/app/components/DynamicClientProvider/DynamicClientProvider.tsx` -- useRef + useQuery initialization gate pattern
- `packages/ui/src/index.ts` -- Full component export inventory
- `packages/ui/src/card.tsx`, `button.tsx`, `widget-card.tsx`, `list-row.tsx`, `spinner.tsx` -- Component APIs
- `packages/utils/src/index.ts` -- `cn()`, `formatCurrency()` signatures
- `packages/theme/package.json` -- Theme package exports
- `turbo.json` -- Task pipeline (no changes needed)
- `pnpm-workspace.yaml` -- Workspace glob (already covers `apps/*`)

### Secondary (MEDIUM confidence)
- `apps/trade/components/theme-wrapper.tsx` -- `useTheme()` usage pattern from next-themes

### Tertiary (LOW confidence)
- None. All findings verified against source code in the monorepo.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all versions read directly from existing `package.json` and lockfile
- Architecture: HIGH -- all patterns sourced from working code in checkouts app and reference checkout-demo
- Pitfalls: HIGH -- all pitfalls observed in existing codebase patterns (Strict Mode guard, webpack externals, @source directive)

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable -- monorepo versions unlikely to change during project)
