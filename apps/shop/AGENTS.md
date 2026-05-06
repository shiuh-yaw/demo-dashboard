---
name: "@dynamic-demos/shop"
kind: app
flow_role: checkout
custody: non-custodial
status: experimental
---

# @dynamic-demos/shop

Etsy/Shopify-style storefront demo. End users browse a curated product list, add to cart, and check out by paying with USDC via the user's Dynamic wallet. Demonstrates the embedded-wallet checkout pattern when paired with off-the-shelf "shop UX" — the merchant side of the equation versus `apps/checkouts` (which is more developer-focused).

## Capabilities

- Browse products + product detail.
- Cart state (client-side, persisted in `localStorage` for the demo).
- Checkout with Dynamic-signed USDC transfer to the merchant address.
- Email-OTP login (Dynamic) only at checkout — browse is unauthenticated.
- Token balance display gating "Buy" CTA.

## Public surface

App routes:

- `/` — storefront landing.
- `/cart` — cart + checkout.
- `/api/...` — server-only routes (price fetch, order recording — tomorrow's work).

This app uses the `autoInitialize: false` + explicit `initializeClient()` flow with a `<DynamicClientProvider>` wrapper — the lazy `createDynamicClientSingleton` factory does not model that flow today, so the bespoke `initializeDynamicClient()` stays. Phase 1D landed env-id resolution via `resolveCredentials` (D-003); the rest waits on a third app needing the `autoInitialize: false` pattern.

## Required environment

- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` — per-app Dynamic env — optional.
- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID_DEFAULT` — workspace default.
- `MERCHANT_USDC_ADDRESS` — destination wallet for checkouts — required.
- `NEXT_PUBLIC_APP_ENV` — `production` flips sandbox off (D-005).

## Theming

Uses `next-themes` for dark-mode toggle and `@dynamic-demos/theme` types. Phase 4 migrates to the visa-direct cookie + `<ThemeStyleTag>` pattern (D-008) once the canonical `--brand-*` overlay lands.

## Credentials

- **Dynamic:** per-app or workspace-default (D-003); `autoInitialize: false` pattern.
- **Fireblocks:** none.
- **Other providers:** none.

## Slots vs invariants

**Slots:** brand, product list (curated), supported chains for checkout, merchant address.

**Invariants:**

- Non-custodial: the user signs the USDC transfer themselves; the app never holds keys.
- Cart state is **client-side only** (demo simplification). Production-grade carts would live in dashboard or a per-app DB; this is intentionally not that.
- Apps don't access Postgres (D-002). Order history (when added) goes through dashboard.
- Sandbox-by-default (D-005). Production checkouts require explicit env opt-in.

## Data boundaries

- No Postgres.
- Redis: not used.
- User state → Dynamic user metadata + `localStorage` (cart only).
- Order history (future) → dashboard via orchestration.

## Deployment

- **Vercel project:** `dynamic-demos-shop`.
- **Root dir:** `apps/shop`.
- **Required env:** see above.
- **Owner:** demos team.
- **Dev port:** 4007.

## Integration map

**Imports:** `@dynamic-demos/dynamic`, `@dynamic-demos/ui`, `@dynamic-demos/theme`, `@dynamic-demos/utils`.
**Imported by:** none.

## Examples

```tsx
// providers.tsx
"use client";
import { DynamicClientProvider } from "./dynamic-client-provider"; // bespoke; see open questions
export function Providers({ children }) {
  return <DynamicClientProvider>{children}</DynamicClientProvider>;
}
```

## Do / Don't

- Do: keep cart state local to this app — the demo simplification matters.
- Do: gate the "Buy" CTA on a balance check before signing.
- Don't: reach for Postgres or a backend cart store. If a customer needs that, fork the demo or grow it via dashboard orchestration.
- Don't: enable the `autoInitialize: true` flow without re-architecting the loading UX — the spinner sequence depends on explicit init.

## Open questions / known gaps

- Phase 4 migrates dark-mode + brand overlay onto the visa-direct cookie + SSR theme pattern (D-008).
- Future work: extend `createDynamicClientSingleton` with an explicit-initialize knob and migrate this app off the bespoke `initializeDynamicClient()`. Until a third app needs `autoInitialize: false`, the bespoke initializer is correct.
- Order history is not persisted today; would require either local store or dashboard event emission.
