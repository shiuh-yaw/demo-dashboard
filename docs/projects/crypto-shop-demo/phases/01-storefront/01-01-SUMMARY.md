---
phase: 01-storefront
plan: 01
subsystem: ui
tags: [next.js, dynamic-sdk, tailwind, next-themes, react-query]

# Dependency graph
requires: []
provides:
  - "apps/shop Next.js app shell with SDK initialization"
  - "Dark/light theme toggle with CSS custom properties"
  - "Provider composition (Theme + QueryClient + DynamicClient)"
  - "Zod-validated environment configuration"
affects: [01-storefront]

# Tech tracking
tech-stack:
  added: ["@dynamic-labs-sdk/client", "@dynamic-labs-sdk/evm", "@dynamic-labs-sdk/solana", "@dynamic-labs-sdk/wallet-connect", "@tanstack/react-query", "next-themes", "lucide-react"]
  patterns: ["SDK singleton with module-level guard", "useRef + useQuery initialization gate", "Provider composition (Theme > QueryClient > DynamicClient)"]

key-files:
  created:
    - apps/shop/package.json
    - apps/shop/tsconfig.json
    - apps/shop/next.config.ts
    - apps/shop/postcss.config.mjs
    - apps/shop/eslint.config.mjs
    - apps/shop/globals.css
    - apps/shop/lib/env.ts
    - apps/shop/lib/dynamic-client.ts
    - apps/shop/components/DynamicClientProvider.tsx
    - apps/shop/lib/providers.tsx
    - apps/shop/components/theme-toggle.tsx
    - apps/shop/app/layout.tsx
    - apps/shop/app/page.tsx
  modified: []

key-decisions:
  - "Passed client argument to SDK extension functions (addEvmExtension, addSolanaExtension, etc.) matching actual v0.12.1 API"
  - "Exposed waitForDynamicClientInitialized wrapper instead of re-exporting SDK function directly"

patterns-established:
  - "SDK singleton: module-level `let initialized = false` guard with createDynamicClient({autoInitialize: false})"
  - "Init gate: DynamicClientProvider uses useRef to prevent double-init in Strict Mode, useQuery to gate rendering"
  - "Theme: next-themes ThemeProvider with attribute='class' and suppressHydrationWarning on html element"

requirements-completed: [SHELL-01, SHELL-02, SHELL-03, SHELL-04, SHELL-05]

# Metrics
duration: 5min
completed: 2026-03-31
---

# Phase 1 Plan 1: App Shell & SDK Init Summary

**Next.js shop app shell with Dynamic SDK singleton init, themed CSS, dark/light toggle, and provider composition**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-31T07:08:06Z
- **Completed:** 2026-03-31T07:13:30Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Scaffolded apps/shop workspace with all config files cloned from checkouts pattern
- Created Dynamic SDK singleton with module-level guard, autoInitialize: false, and proper extension registration
- Composed ThemeProvider, QueryClientProvider, and DynamicClientProvider with Spinner loading gate
- Dark/light theme toggle functional using next-themes resolvedTheme

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold app config files and environment** - `2ca185e` (feat)
2. **Task 2: Create SDK init, providers, theme toggle, layout, and placeholder page** - `c4f52a9` (feat)

## Files Created/Modified
- `apps/shop/package.json` - App manifest with Dynamic SDK and React Query deps
- `apps/shop/tsconfig.json` - TypeScript config extending shared nextjs preset
- `apps/shop/next.config.ts` - Webpack externals for pino-pretty, lokijs, encoding
- `apps/shop/postcss.config.mjs` - Tailwind CSS v4 postcss plugin
- `apps/shop/eslint.config.mjs` - FlatCompat ESLint with next/core-web-vitals
- `apps/shop/globals.css` - Full Tailwind + CSS custom properties for light/dark theming
- `apps/shop/lib/env.ts` - Zod-validated env for NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID
- `apps/shop/lib/dynamic-client.ts` - SDK singleton with module-level guard
- `apps/shop/components/DynamicClientProvider.tsx` - useRef + useQuery init gate with Spinner
- `apps/shop/lib/providers.tsx` - ThemeProvider > QueryClientProvider > DynamicClientProvider
- `apps/shop/components/theme-toggle.tsx` - Dark/light toggle with lucide-react icons
- `apps/shop/app/layout.tsx` - Root layout with fonts, suppressHydrationWarning
- `apps/shop/app/page.tsx` - Placeholder page with header and theme toggle

## Decisions Made
- Adapted SDK function calls to pass `client` argument matching actual v0.12.1 API (plan omitted this parameter)
- Created `waitForDynamicClientInitialized` wrapper to encapsulate client reference

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed SDK extension function signatures**
- **Found during:** Task 2 (SDK init implementation)
- **Issue:** Plan called `addEvmExtension()`, `addSolanaExtension()`, `addWalletConnectEvmExtension()`, and `initializeClient()` without arguments. The actual @dynamic-labs-sdk v0.12.1 API requires passing the `client` instance as a parameter.
- **Fix:** Stored the created client in module scope, passed it to all extension and init functions
- **Files modified:** apps/shop/lib/dynamic-client.ts
- **Verification:** `pnpm --filter shop build` exits 0
- **Committed in:** c4f52a9 (Task 2 commit)

**2. [Rule 1 - Bug] Adapted DynamicClientProvider to use local wait wrapper**
- **Found during:** Task 2 (DynamicClientProvider implementation)
- **Issue:** Plan imported `waitForClientInitialized` directly from SDK, but the SDK version requires a client argument. The provider doesn't have access to the module-scoped client.
- **Fix:** Created `waitForDynamicClientInitialized` export from dynamic-client.ts that wraps the SDK call with the stored client reference
- **Files modified:** apps/shop/lib/dynamic-client.ts, apps/shop/components/DynamicClientProvider.tsx
- **Verification:** `pnpm --filter shop build` exits 0
- **Committed in:** c4f52a9 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for correctness -- plan's SDK call signatures didn't match the actual API. No scope creep.

## Issues Encountered
- Build initially failed due to missing NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID env var; created apps/shop/.env with the project's environment ID (file is gitignored)
- Pre-existing build failure in @dynamic-demos/trade app (TypeScript error in probability-time-chart.tsx) -- unrelated to shop app changes

## User Setup Required
None - the .env file uses the same Dynamic environment ID already configured in the project root.

## Next Phase Readiness
- App shell is complete and building, ready for Plan 02 (product catalog/grid)
- SDK initialization pattern established for all subsequent plans

---
*Phase: 01-storefront*
*Completed: 2026-03-31*
