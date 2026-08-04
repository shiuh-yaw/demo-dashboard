---
name: "@dynamic-demos/remittance"
kind: app
flow_role: offramp
custody: non-custodial
status: stable
regions:
  - country: US
    currency: USD
    rails: [ach]
  - country: BR
    currency: BRL
    rails: [pix]
  - country: MX
    currency: MXN
    rails: [spei]
  - country: CO
    currency: COP
    rails: [pse]
  - country: AR
    currency: ARS
    rails: [cbu]
---

# @dynamic-demos/remittance

Cross-border remittance demo. A US sender authenticates via Dynamic, receives onchain funds (USDC), and sends a fiat payout to a recipient in BR/MX/CO/AR via the dashboard's offramp orchestration. This app is the **gold-standard reference for monorepo demo apps** — file structure, hooks, screen state machines, layout shell, and `app.config.ts` shape are mirrored by `apps/visa-direct` and (in Phase 4) the rest of the demos.

## Capabilities

- Email-OTP + social-provider login (Dynamic).
- Scenario front door - `/` is a flow-style scenario page inside the shared Dynamic site chrome (`SiteHeader` with a "Remittance" chip, `SiteFooter`, `ScenarioHero`/`ScenarioLayout`/`CodePanel` from packages/ui): the live login card (same `AuthScreen`/`OtpVerifyScreen` the retired `/login` rendered, via `components/login-page.tsx`) sits beside an SDK integration panel (wallet creation, auth, sponsored sends); snippets are Shiki-highlighted server-side (shared `@dynamic-demos/code-highlight`) from remittance-owned content (`lib/code-steps.ts`). `/` IS the login surface: it sits first in `publicRoutes` (the derived loginPath), so unauthenticated users on protected routes land here with `?returnTo=` (flows into the login card) and authenticated visitors bounce to `/overview`; `/login` 307s here with its query preserved. The OTP screen drives the panel via `contexts/panel-section-context.tsx` (Q-017 pattern, sections `default | otp-verify`). Branded configs (`?theme=`) hide the Dynamic site header - the brand logo and a Book a call CTA render in the hero row instead (`ScenarioBrandRow`/`ScenarioBrandLogo`) - the `SiteFooter` stays under every theme. Post-auth (`AppShell`) follows the merged-header rule (matches trade/earn): unbranded, the shared `SiteHeader` (`fullWidth`, "Remittance" chip, nav in the center slot, `UserMenu` in `trailing`) IS the app bar; branded drops the Dynamic chrome and keeps remittance's own `DashboardHeader` brand bar (also used unconditionally by `/admin`, independent of theming). `UserMenu` rides the shared `HeaderMenu` shell (trigger = address + copy, rows = Book a call / Clear theme when branded / Sign out). The `SiteFooter`'s marketing CTAs show only when unbranded (`showCtas`) - a themed demo must not advertise sign-up.
- Connected wallet balance + asset transfer history (Alchemy).
- Recipient + corridor selection screen.
- Offramp execution via dashboard `/api/orchestrate/offramp` (alfredPay or BlindPay depending on corridor).
- Status polling + history (D-011: webhooks land at dashboard, this app polls).
- Admin surface under `/admin` for demo operators to inspect recent transactions.
- Branded short-link entry (`/r/<id>`) for dashboard-launched links.

## Public surface

App routes:

- `/` - scenario page: Dynamic site chrome + live login card + SDK code panel (the login surface; authenticated visitors bounce to `/overview`; OAuth callbacks complete here).
- `/(auth)/login` - legacy; 307s to `/` preserving the query string.
- `/(app)/overview` - main dashboard (balance, send/receive/deposit/withdraw actions, recent activity).
- `/(app)/history` - full transfer history.
- `/(app)/settings` - account + recipient settings.
- `/admin` (+ `/admin/vaults`, `/admin/assets`) - operator inspector.
- `/api/transactions/history` - server-only Alchemy proxy.
- `/api/...` - server-only handlers (Fireblocks vault ops, KYC, deposits, recipients, cards, webhooks, admin).

URL contract (post-Phase-4-app simplification):

- Routes are flat. There are no path-based config routes. Branded entry is via
  `?theme=<configId>` on any URL.
- Cookie / header contract (D-008): `?theme=<configId>` → cookie
  `remittance_config_id` → header `x-remittance-config-id` → dashboard config
  fetch. Subsequent visits without `?theme=` reuse the cookie. `?theme=` (empty)
  clears the cookie.
- Legacy `/r/[id]/*` URLs redirect to `/?theme=[id]` (and subpath equivalents) via
  `next.config.ts` for back-compat with bookmarked links.

## Required environment

- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` — per-app Dynamic env — optional (workspace default fallback).
- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID_DEFAULT` — workspace default.
- `ALCHEMY_API_KEY` — server-only Alchemy key — required.
- `FIREBLOCKS_API_KEY` / `FIREBLOCKS_API_SECRET` / `FIREBLOCKS_VAULT_ACCOUNT_ID` — required for the prefund vault.
- `NEXT_PUBLIC_DASHBOARD_URL` — dashboard origin for orchestration calls.
- `NEXT_PUBLIC_APP_ENV` — `production` flips sandbox off.
- `NEXT_PUBLIC_TRACK_URL` - dashboard GTM ingest base URL (`@dynamic-demos/analytics`) - optional. Unset → `<GtmTracker>`/`useTrack()` are total no-ops; the app builds and runs unchanged.

Sandbox-by-default (D-005).

## Analytics

`<GtmTracker demoSlug="remittance">` wraps the tree in `app/layout.tsx`; no-ops with `NEXT_PUBLIC_TRACK_URL` unset. Pageviews/heartbeats are automatic (package-owned). `authenticated` - the shared fleet-wide milestone (`useIdentify`, `@dynamic-demos/analytics`) - is mounted via `<IdentityBridge />` (`components/analytics/identity-bridge.tsx`, in the layout inside `<Providers>`), fed by `hooks/use-authenticated-user.ts` (gated on `hooks/use-client-initialized.ts`). Fires once per page load with `{ dynamicUserId, email? }` on any auth method; no other per-app milestones wired yet.

## Theming

Consumes `@dynamic-demos/theme/defaults.css` (D-007 / D-020) - `app/globals.css` carries no local `--brand-*` value pins: remittance rides the canonical D-030 defaults (restyled 2026-07 alongside trade/earn; the pre-D-030 Apple-ish pin and the cool blue-grey overrides were removed together). `globals.css` is thin: it imports the shared defaults, declares the remittance-only `overflow-hidden` rule (with the `data-scenario-page` escape for the scroll front door), the dark-variant override, and a small set of `--widget-*` → `--brand-*` compat aliases for shared `packages/ui` components (e.g. `AuthLayout`) that haven't migrated yet. The aliases retire when the brand cutover phase migrates `packages/ui` to read `--brand-*` directly.

Per-config theming is wired SSR via `<ThemeStyleTag>` (D-008): `createDemoMiddleware` (factory defaults - `configIdSource: "query"`, `stickyConfigCookie: true`) forwards `x-remittance-config-id` resolved from `?theme=` or the `remittance_config_id` cookie, the root layout fetches the config from the dashboard, projects it through `widgetThemeToBrandTheme(..., { deriveCardGradient: true })` from `@dynamic-demos/theme` (which derives `primaryHover`, `accent`, and the card gradient via HSL math from `primaryColor` + optional `secondaryColor`), and emits an `overridesOnly` `<style>` block in `<head>` so the operator's brand colors paint on first byte - zero FOUC, zero hydration mismatch. `ThemeWrapper` (client `useEffect` reapplying the same vars) remains as a safety net during client navigations.

Browser-tab title is branded via `generateMetadata` in `app/layout.tsx`: a `React.cache`-wrapped config getter dedupes the dashboard fetch across `generateMetadata` and `RootLayout` within one request, then `buildDemoMetadata({ appName: config.branding?.appName })` (`@dynamic-demos/theme`) renders `"<appName> - Remittance"` when set, else the generic default.

## Credentials

- **Dynamic:** per-app or workspace-default (D-003).
- **Fireblocks:** per-app credentials for the merchant prefund vault.
- **Other providers:** none — alfredPay + BlindPay live in dashboard (D-003).

## Slots vs invariants

**Slots:** brand, corridors enabled (constrained by alfredPay/BlindPay region tables), recipient form fields.

**Invariants:**

- All offramp calls go through dashboard orchestration (D-001/D-003) — no provider keys other than Dynamic + Fireblocks here.
- Recipient + KYC data persists to dashboard via orchestration events (Phase 5A); not in this app.
- The visa-direct cookie pattern is canonical (D-008).
- Sandbox-by-default (D-005).
- Branded demo URLs (`?share=` and/or `?theme=` present) get `X-Robots-Tag: noindex, nofollow` via the shared `createDemoMiddleware` (`applyBrandedNoIndex`/`isBrandedSearch` in `@dynamic-demos/dynamic/noindex`); the bare URL stays indexable.
- `app/opengraph-image.tsx` renders the OG/Twitter unfurl via the shared `renderDemoOgImage` (`@dynamic-demos/dynamic/og-image`) - generic "Remittance" preview, identical for branded and bare URLs (no prospect/theme data read).

## Data boundaries

- No Postgres.
- Redis: not currently used here.
- User state → Dynamic metadata.
- Canonical transactions → dashboard via orchestration; this app polls `/api/orchestrate/transactions/:id`.

## Deployment

- **Vercel project:** `dynamic-demos-remittance`.
- **Root dir:** `apps/remittance`.
- **Required env:** see above.
- **Owner:** demos team.
- **Dev port:** 4004.

## Integration map

**Imports:** `@dynamic-demos/dynamic`, `@dynamic-demos/ui`, `@dynamic-demos/utils`, `@dynamic-demos/theme`, `@dynamic-demos/types`, `@dynamic-demos/alchemy`, `@dynamic-demos/fireblocks`, `@dynamic-demos/analytics`.
**Imported by:** none.

## Examples

```ts
// middleware.ts
import { createDemoMiddleware } from "@dynamic-demos/dynamic/demo-middleware";
export const middleware = createDemoMiddleware({ demoType: "remittance" });
```

## Do / Don't

- Do: route offramp flows through dashboard `/api/orchestrate/offramp` — never call alfredPay/BlindPay directly.
- Do: mirror this app's patterns when authoring a new demo. It's the reference.
- Don't: expose Fireblocks creds with `NEXT_PUBLIC_*`.
- Don't: persist transactions client-side beyond optimistic UI — dashboard is canonical.

## Open questions / known gaps

- Phase 4-app remittance completed: components consume `--brand-*`; `app/globals.css` keeps remittance-only chrome (overflow rule, dark override) plus `--widget-*` shims for shared `packages/ui` consumers. Shims retire in the brand cutover phase.
- D-030 restyle completed (2026-07): the pre-D-030 Apple-ish pin and the cool blue-grey override were dropped from `app/globals.css`; remittance now rides the canonical D-030 tokens with no local `--brand-*` value pins, matching trade/earn. The dead `--widget-primary-hover` alias (zero remaining `packages/ui` consumers) was dropped in the same change; the other 8 `--widget-*` aliases stay - still read by `packages/ui` components used by remittance (`AuthLayout`, `WidgetCard`, `Button`, `LoginForm`, `Input`, `Select`, `Card`, `Dialog`, `ListRow`, `Spinner`, `CopyButton`, `PoweredByFooter`, `Skeleton`, `Tooltip`, `ScrollableWithFade`). Known pre-existing gap (not introduced by this change, not fixed by it): `packages/ui/src/kyc-gate.tsx` and `packages/ui/src/stable-coin-card.tsx` (both rendered by remittance) reference `--widget-radius`, `--widget-row-bg`, and `--widget-card-gradient-end`, which remittance has never aliased - those resolve to nothing here today.
- Path-based config routing (`/r/[id]/*`) was removed in the Phase-4-app middleware-simplification follow-up — middleware uses cookie + query only. Legacy URLs redirect via `next.config.ts`.
- The `/admin` surface predates the dashboard's operator UI; folds into dashboard once Phase 5C lands.
- No real-network E2E tests in CI (D-023).
- Panel snippets in `lib/code-steps.ts` teach the current docs APIs (`@dynamic-labs-sdk` 1.x + react-hooks + native EIP-7702 gas sponsorship) while the app internals remain on the catalog SDK plus ZeroDev for gas sponsorship - migrating this app to native EIP-7702 sponsorship is a tracked follow-up. Every TypeScript snippet must open with its import line (test-enforced in `__tests__/code-steps.test.ts`).
