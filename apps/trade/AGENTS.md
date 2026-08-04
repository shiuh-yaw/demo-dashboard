---
name: "@dynamic-demos/trade"
kind: app
flow_role: wallet
custody: non-custodial
status: stable
---

# @dynamic-demos/trade

Multi-surface trading + prediction-market demo. End users sign in via Dynamic, browse markets sourced from CoinGecko (spot tokens) and Polymarket (event markets), execute swaps, and view a unified portfolio. The app's mock-mode pattern (Dynamic-metadata-backed) is the reference implementation for in-flight earn-style demos.

## Capabilities

- Email-OTP + social login (Dynamic).
- Scenario front door - `/` is a flow-style scenario page inside the shared Dynamic site chrome (`SiteHeader` with a "Trade" chip, `SiteFooter`, `ScenarioHero`/`ScenarioLayout`/`CodePanel` from packages/ui): the live login card (same `AuthScreen`/`OtpVerifyScreen` the retired `/login` rendered, via `components/login-page.tsx`) sits beside an SDK integration panel; snippets are Shiki-highlighted server-side (shared `@dynamic-demos/code-highlight`) from trade-owned content (`lib/code-steps.ts`). `/` IS the login surface: it sits first in `publicRoutes` (becoming the derived loginPath), so unauthenticated users on protected routes land here with `?returnTo=` (flows into the login card) and authenticated visitors bounce to `/portfolio`; the legacy `/login` route 307s here with its query preserved (OAuth completes on `/` - social `redirectUrl` is the initiating page). The OTP screen drives the panel via `contexts/panel-section-context.tsx` (Q-017, sections `default | otp-verify`). Dark mode is FORCED LIGHT on `/` (`app/providers.tsx` passes next-themes `forcedTheme` for that route) because the site chrome is light-only; the user's theme resumes in-app. Branded configs (`?theme=`) hide the Dynamic header (brand logo + Book a call CTA in the hero row instead; "Clear theme" below the widget) - the `SiteFooter` stays under every theme. **Post-auth (AppShell)** follows earn's merged-header rule: unbranded, the shared `SiteHeader` (fullWidth, "Trade" chip) IS the app bar with trade's controls (theme toggle / network switcher / connect button) in the `trailing` slot; branded keeps trade's own brand bar. No `SiteFooter` post-auth (unlike earn): the floating bottom NavBar owns the bottom edge and a marketing footer collides with it - the scenario front door carries the Dynamic footer instead. The site chrome carries `dark:` variants (class-gated), so trade's dark toggle works with the merged header. The connect button (`components/ui/connect-button.tsx`) rides the shared `HeaderMenu` shell (trigger + an `AddressHeader` header slot for the address/copy/explorer row, then network switcher / Book a call / Settings / Sign out rows) - the old fixed-inset backdrop dropdown is gone.
- Token market list + per-token detail page (`/trade/...`).
- Prediction markets - Polymarket events + per-event detail (`/predictions/...`).
- Token swaps + spot trades (planned: dashboard `/api/orchestrate/swap` integration).
- Portfolio dashboard with "Positions" tab spanning trade / earn / predict mock positions.
- Mock mode (wallet dropdown toggle) - actions persist into Dynamic user metadata, gated by `useMockMode()`.

## Public surface

App routes:

- `/` - scenario page: Dynamic site chrome + live login card + SDK code panel (the login surface; authed visitors bounce to `/portfolio`).
- `/(auth)/login` - legacy; 307s to `/` preserving the query string.
- `/(app)/trade/...` - token list + detail.
- `/(app)/predictions/...` - Polymarket event list + detail.
- `/(app)/portfolio` - unified positions across earn/trade/predict (mock + real).
- `/api/trade/{historical,market,metadata,prices,token-stats}/...` - server-only Alchemy/CoinGecko/Polymarket proxies.

Cookie / header contract (D-008): `?theme=<configId>` → cookie `trade_config_id` → header `x-trade-config-id` → dashboard config fetch. URLs are flat - there is no `/t/[id]/<rest>` prefix. Legacy `/t/[id]/<rest>` deep links are handled by a `next.config.ts` redirect that rewrites them to `/<rest>?theme=[id]`.

## Required environment

- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` - per-app Dynamic env - optional.
- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID_DEFAULT` - workspace default.
- `ALCHEMY_API_KEY` - server-only - required.
- `COIN_GECKO_API_KEY` - server-only - optional but recommended.
- `NEXT_PUBLIC_DASHBOARD_URL` - dashboard origin (for swap orchestration).
- `NEXT_PUBLIC_APP_ENV` - `production` flips sandbox off.
- `NEXT_PUBLIC_TRACK_URL` - dashboard base URL that `@dynamic-demos/analytics` posts session/step/milestone events to - optional, unset means `<GtmTracker>`/`useTrack()` are total no-ops.

Polymarket public API needs no key.

## Analytics

`<GtmTracker demoSlug="trade">` wraps the app tree in `app/layout.tsx`, giving automatic pageview + heartbeat tracking. `authenticated` - the shared fleet-wide milestone (`useIdentify`, `@dynamic-demos/analytics`) - is mounted via `<IdentityBridge />` (`components/analytics/identity-bridge.tsx`, in the layout inside `<Providers>`), fed by `hooks/use-authenticated-user.ts` (gated on `hooks/use-client-initialized.ts`). Fires once per page load with `{ dynamicUserId, email? }` on any auth method. No other per-app `useTrack()` milestones are wired yet.

## Theming

Unified D-008 pattern. `middleware.ts` (`createDemoMiddleware`) reads `?theme=<configId>` from the query, persists it as the `trade_config_id` cookie, and forwards it as `x-trade-config-id`. The root `app/layout.tsx` reads the header, fetches the brand config server-side, and injects per-brand `--brand-*` overrides via `<ThemeStyleTag overridesOnly>` in `<head>` - zero FOUC, zero hydration mismatch.

Token contract:
- `@dynamic-demos/theme/defaults.css` - canonical `--brand-*` defaults.
- `apps/trade/app/globals.css` - light mode carries NO local `--brand-*` value pins (restyled 2026-07 alongside wallet/earn: the pre-D-030 Apple pin and trade's near-canonical light overrides were removed together; canonical D-030 defaults apply). The `.dark` `--brand-*` block STAYS - the canonical contract has no dark story and trade's in-app surfaces support dark mode. `--widget-*` compat aliases remain for legacy `packages/ui` consumers; retire when `packages/ui` migrates.
- `--trade-*` namespace - trade's app-specific design language (chrome, surfaces, gradients). Distinct from the brand contract; not affected by per-config theme injection.

`themeToBrandTheme(theme)` in `lib/trade-brand.ts` projects the dashboard's stored `WidgetTheme` shape onto `Partial<BrandTheme>`. `TradeConfig.theme` is optional; an empty config emits an empty `:root {}` block, so default routes render trade's static palette.

## Credentials

- **Dynamic:** per-app or workspace-default (D-003).
- **Fireblocks:** none.
- **Other providers:** none - LI.FI swap orchestration runs through dashboard (D-003).

## Mock mode

Trade extends the canonical mock-mode pattern (originated in `apps/earn`, see D-022 mock-data). When `useMockMode().isMockMode` is true:

- Real transactions are skipped; the action calls `useUpdateMetadata().mutateAsync()` with the new data merged into the appropriate Dynamic user-metadata key.
- Mock metadata keys live in `apps/trade/lib/mock-metadata.ts` - `MockTradeMetadata` and `MockPredictMetadata` shapes mirror the action surface.
- A "My X" section renders only when mock mode is on and there's data; reads from `metadata[MOCK_METADATA_KEYS.TRADE]` / `metadata[MOCK_METADATA_KEYS.PREDICT]`.
- The Portfolio "Positions" tab surfaces mock positions per type with a labeled badge ("Earn", "Trade", "Predict").

This pattern is **the reference** for any future demo that needs a metadata-backed mock mode. Don't `localStorage` it - cross-device consistency is the point.

## Slots vs invariants

**Slots:** brand, token list (CoinGecko cohort), Polymarket tag set (curated `POLYMARKET_TAG_SLUGS`).

**Invariants:**

- Mock-mode state lives in Dynamic user metadata. Never `localStorage`.
- Real swaps go through dashboard `/api/orchestrate/swap` - never call LI.FI directly from this app.
- Apps don't access Postgres (D-002). Polymarket / CoinGecko data is read-only and fetched server-side.
- Read-only provider data (CoinGecko / Polymarket) flows through `app/api/*` proxies so cache control + key handling stay server-side.
- Sandbox-by-default (D-005).
- Branded demo URLs (`?share=` and/or `?theme=` present) get `X-Robots-Tag: noindex, nofollow` via the shared `createDemoMiddleware` (`applyBrandedNoIndex`/`isBrandedSearch` in `@dynamic-demos/dynamic/noindex`); the bare URL stays indexable.
- `app/opengraph-image.tsx` renders the OG/Twitter unfurl via the shared `renderDemoOgImage` (`@dynamic-demos/dynamic/og-image`) - generic "Trade" preview, identical for branded and bare URLs (no prospect/theme data read).

## Data boundaries

- No Postgres.
- Redis: not used.
- User state (mock positions, defaults) → Dynamic user metadata.
- Read-only market data → CoinGecko + Polymarket via server-only proxies.

## Deployment

- **Vercel project:** `dynamic-demos-trade`.
- **Root dir:** `apps/trade`.
- **Required env:** see above.
- **Owner:** demos team.
- **Dev port:** 4005.

## Integration map

**Imports:** `@dynamic-demos/dynamic`, `@dynamic-demos/ui`, `@dynamic-demos/utils`, `@dynamic-demos/theme`, `@dynamic-demos/types`, `@dynamic-demos/alchemy`, `@dynamic-demos/analytics`, `@dynamic-demos/coingecko`, `@dynamic-demos/polymarket`, `@dynamic-demos/fireblocks`.
**Imported by:** none.

## Examples

```ts
// Mock-mode action gating (canonical pattern)
import { useMockMode } from "@/contexts/mock-mode-context";
import { useUpdateMetadata, useUserMetadata } from "@/hooks";
import { MOCK_METADATA_KEYS } from "@/lib/mock-metadata";

const { isMockMode } = useMockMode();
const updateMetadata = useUpdateMetadata();

if (isMockMode) {
  const existing = (metadata[MOCK_METADATA_KEYS.TRADE]?.positions ?? []) as MockPosition[];
  await updateMetadata.mutateAsync({ trade: { positions: [...existing, newPosition] } });
  return "mock-tx";
}
// else: real swap via dashboard /api/orchestrate/swap
```

## Do / Don't

- Do: persist mock state in Dynamic user metadata (`metadata.trade`, `metadata.predict`) - never `localStorage`.
- Do: keep Polymarket + CoinGecko reads server-side via `app/api/trade/*`.
- Do: surface a clear "mock" badge in any UI showing mocked positions.
- Don't: branch real-vs-mock logic ad-hoc; funnel through `useMockMode()` per the earn-style pattern.
- Don't: call LI.FI's REST API directly - go through dashboard orchestration.

## Open questions / known gaps

- Panel snippets in `lib/code-steps.ts` teach the current docs APIs (`@dynamic-labs-sdk` 1.x + react-hooks) while the app internals remain on the catalog SDK - migrating trade to 1.x (wallet's direct-pin precedent) is a tracked follow-up. Every TypeScript snippet must open with its import line (test-enforced in `__tests__/code-steps.test.ts`). `shiki` pinned 1.24.0 (same as flow/wallet/earn).
- Real swap execution still needs Phase 5B's dashboard `/api/orchestrate/swap` to land. Until then, swap actions are mock-mode only.
- `MockTradeMetadata` and `MockPredictMetadata` shapes are still maturing as new actions land; expect minor additive changes per PR.
- `--widget-*` compat aliases in `globals.css` are temporary; retire when `packages/ui` (`AuthLayout`, `WalletSelectionScreen`, etc.) migrates to `--brand-*`.
