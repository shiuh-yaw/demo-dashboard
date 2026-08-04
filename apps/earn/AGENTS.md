---
name: "@dynamic-demos/earn"
kind: app
flow_role: wallet
custody: non-custodial
status: stable
---

# @dynamic-demos/earn

Vault-deposit / yield demo. End users sign in via Dynamic, deposit USDC into curated yield vaults, and view positions. Per-config branding rides on `?theme=<configId>` (sticky cookie + header forward) so a single app deployment can serve many branded vault demos from flat top-level routes. Includes a "mock mode" toggle so demos work without onchain transactions.

## Capabilities

- Email-OTP + Google SSO + external-JWT login (Dynamic).
- Wallet creation / connection (Dynamic embedded + WAAS pattern - bespoke today, future Phase 4 work to consolidate).
- Vault listing per config id, deposit + withdraw flows.
- Mock mode (wallet dropdown toggle) - vault deposits stored under `metadata.earn.deposits` in Dynamic user metadata. "My Vaults" surface above the vault list shows mocked positions.
- "Positions" tab on a portfolio dashboard surfaces mocked positions when mock mode is on.
- Scenario front door - `/` is a flow-style scenario page inside the shared Dynamic site chrome (`SiteHeader` with an "Earn" chip, `SiteFooter`, `ScenarioHero`/`ScenarioLayout`/`CodePanel` from packages/ui): the live login card (same `LoginContent` as `/login`) sits beside an SDK integration panel; snippets are Shiki-highlighted server-side (shared `@dynamic-demos/code-highlight`) from earn-owned content (`lib/code-steps.ts`). `/` IS the login surface: it sits first in `publicRoutes` (becoming the derived loginPath), so unauthenticated users on protected routes land here and authenticated visitors bounce to `/earn`; the legacy `/login` route 307s here with its query preserved (OAuth callbacks complete on `/` - social `redirectUrl` is the initiating page). The OTP screen drives the panel via `contexts/panel-section-context.tsx` (Q-017 pattern, sections `default | otp-verify`). Post-auth, the `(dashboard)` layout renders ONE merged bar: the shared `SiteHeader` in its `fullWidth` variant with earn's `UserMenu` in the `trailing` slot (which displaces the marketing CTAs - those move to the shared `SiteFooter` with `showCtas` at the bottom of the layout); earn's own `Header` renders only for branded configs. UserMenu rides the shared `HeaderMenu` shell from `@dynamic-demos/ui` (trigger = UserAvatar, rows = Book a call / demo resets / Clear theme / Logout); only the rows' handlers live here. Branded configs (`?theme=`) hide the Dynamic HEADER on both surfaces (brand logo + Book a call CTA in the scenario hero instead) - but the shared `SiteFooter` stays under every theme, branded or not.

## Public surface

App routes (flat - no path-based config segments):

- `/` - scenario page: Dynamic site chrome + live login card + SDK code panel. This IS the login surface (the derived loginPath): unauthenticated users on protected routes land here; authenticated visitors bounce straight to `/earn`; OAuth callbacks complete here.
- `/(auth)/login` - legacy; 307s to `/` preserving the query string (OAuth callbacks, `sessionExpired`, `loggedOut`).
- `/(dashboard)/earn` - main dashboard.
- `/api/balance?address=0x...` - auth-required; Dynamic USDC balance on Base Sepolia via Alchemy (backs the creator-balance card + Add funds context).
- `/api/...` - server-only.

Cookie / header contract (D-008): query `?theme=<configId>` → cookie `earn_config_id` (sticky) → header `x-earn-config-id` → dashboard config fetch. Subsequent navigations carry the cookie; the query param can be dropped from the URL once set.

Legacy `/e/<id>/...` deep-links 307-redirect to `/?theme=<id>` via `next.config.ts` `redirects()` for back-compat - first hit sets the cookie, then everything is flat.

## Required environment

- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` - per-app Dynamic env - optional.
- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID_DEFAULT` - workspace default.
- `NEXT_PUBLIC_DASHBOARD_URL` - dashboard origin for config fetch.
- `NEXT_PUBLIC_APP_ENV` - `production` flips sandbox off.
- `ALCHEMY_API_KEY` - server-only; `/api/balance` reads the Dynamic USDC balance on Base Sepolia via Alchemy (Dynamic's balances API doesn't cover Base Sepolia). Alchemy is D-003-exempt like proceeds/remittance/trade - see `packages/alchemy/AGENTS.md`.
- `NEXT_PUBLIC_TRACK_URL` - dashboard GTM ingest base URL (`@dynamic-demos/analytics`, Phase 09) - optional. Unset → `<GtmTracker>`/`useTrack()` are total no-ops; the app builds and runs unchanged.

No other provider keys - vault contracts are onchain; deposits are user-signed.

- `shiki` (pinned 1.24.0, same as flow/wallet) - server-side code highlighting for the scenario page.

## Analytics

`<GtmTracker demoSlug="earn">` wraps the tree in `app/layout.tsx` and no-ops with `NEXT_PUBLIC_TRACK_URL` unset. Pageviews/heartbeats are automatic (package-owned). `authenticated` - the shared fleet-wide milestone (`useIdentify`, `@dynamic-demos/analytics`) - is mounted via `<IdentityBridge />` (`components/analytics/identity-bridge.tsx`, alongside `<DynamicInit />` in the layout since earn is multi-page: `(auth)` login group → `(dashboard)` app group), fed by the existing `useDynamicUser()`/`useInitStatus()` hooks. Fires once per page load with `{ dynamicUserId, email? }` on any auth method; no other per-app `useTrack()` milestones wired up yet.

## Theming

Unified theme injection per D-008:

- `middleware.ts` uses `createDemoMiddleware({ demoType: "earn", publicRoutes: ["/", "/login"], defaultReturnPath: "/earn" })`. Defaults: `configIdSource: "query"`, `stickyConfigCookie: true`. Forwards `x-earn-config-id` from `?theme=` query or sticky cookie. `/` first in publicRoutes makes it the derived loginPath (scenario front door is the login surface).
- Root `app/layout.tsx` reads the header server-side, fetches the config via `getEarnConfig`, projects `EarnTheme` onto `Partial<BrandTheme>` (`lib/earn-brand.ts`), and emits the override block via `<ThemeStyleTag overridesOnly>` in `<head>`. Zero FOUC, zero hydration mismatch.
- `app/globals.css` carries no local `--brand-*` value pins - earn rides the canonical D-030 defaults from `@dynamic-demos/theme/defaults.css` (restyled 2026-07; the pre-D-030 Apple-ish pin and the earn-grey overrides were removed together). Only the alias wiring remains: `--widget-*` and `--color-earn-*` namespaces point at `--brand-*` so per-config overrides cascade through `packages/ui` consumers and earn's existing utility classes (`bg-earn-light`, `text-earn-text-primary`, etc.) without per-component sweeps.
- `EarnConfigProvider` (in the root layout) hydrates `useEarnConfig()` for branding/layout/title.
- Browser-tab title is branded via `generateMetadata` in `app/layout.tsx`: a `React.cache`-wrapped `getEarnConfig()` getter dedupes the dashboard fetch across `generateMetadata` and `RootLayout` within one request, then `buildDemoMetadata({ appName: config.branding?.appName })` (`@dynamic-demos/theme`) renders `"<appName> - Earn"` when set, else the generic default. Replaces the previous static `metadata` export (which had no per-config field to title with).

## Credentials

- **Dynamic:** per-app or workspace-default (D-003); external-JWT enabled.
- **Fireblocks:** none.
- **Other providers:** Alchemy (`ALCHEMY_API_KEY`, server-only, read-only balance data - D-003-exempt per `packages/alchemy/AGENTS.md`).

## Slots vs invariants

**Slots:** vault list per config id, brand, mock-mode default state.

**Invariants:**

- Mock mode is **per-user via Dynamic user metadata** - never `localStorage`. Cross-device consistency is the point.
- Real deposits are user-signed onchain transactions; the app never holds keys.
- Apps don't access Postgres (D-002) - vault list comes from dashboard config; positions live in Dynamic metadata (mock) or onchain.
- Sandbox-by-default for any future provider integration (D-005).
- Branded demo URLs (`?share=` and/or `?theme=` present) get `X-Robots-Tag: noindex, nofollow` via the shared `createDemoMiddleware` (`applyBrandedNoIndex`/`isBrandedSearch` in `@dynamic-demos/dynamic/noindex`); the bare URL stays indexable.
- `src/app/opengraph-image.tsx` renders the OG/Twitter unfurl via the shared `renderDemoOgImage` (`@dynamic-demos/dynamic/og-image`) - generic "Earn" preview, identical for branded and bare URLs (no prospect/theme data read).

## Mock mode

- Toggle lives in the wallet dropdown.
- When enabled, deposits/withdrawals skip the real onchain call and merge into `metadata.earn.deposits`.
- The "My Vaults" section reads from `metadata.earn.deposits`; the portfolio "Positions" tab also surfaces these with an "Earn" badge.
- Mock metadata key constants live in `lib/mock-metadata.ts`.

## Data boundaries

- No Postgres.
- Redis: not used.
- User state (mock positions, default vault) → Dynamic user metadata.

## Deployment

- **Vercel project:** `dynamic-demos-earn`.
- **Root dir:** `apps/earn`.
- **Required env:** see above.
- **Owner:** demos team.
- **Dev port:** 4002.

## Integration map

**Imports:** `@dynamic-demos/dynamic`, `@dynamic-demos/ui`, `@dynamic-demos/utils`, `@dynamic-demos/theme`, `@dynamic-demos/types`, `@dynamic-demos/alchemy`, `@dynamic-demos/analytics` (Phase 09).
**Imported by:** none.

## Examples

```ts
// middleware.ts - simplified D-008 pattern, cookie + query only
export const middleware = createDemoMiddleware({
  demoType: "earn",
  // "/" first: the scenario front door IS the login surface (derived
  // loginPath). Authed visitors on "/" bounce to defaultReturnPath.
  publicRoutes: ["/", "/login"],
  defaultReturnPath: "/earn",
});
```

## Do / Don't

- Do: persist mock-mode state in Dynamic user metadata (`metadata.earn.deposits`) - never `localStorage`.
- Do: keep deposit signatures user-side. The app never sees keys.
- Don't: read mock state from anywhere other than Dynamic metadata; the source-of-truth pattern matters.
- Don't: branch real-vs-mock logic in many places - funnel through `useMockMode()`.

## Open questions / known gaps

- WAAS / wallet-creation logic here is bespoke; Phase 4 considers extending `@dynamic-demos/dynamic` to model that pattern.
- Mock-mode pattern in this app is the reference for trade + future demos.
- Panel snippets in `lib/code-steps.ts` teach the current docs APIs (`@dynamic-labs-sdk` 1.x + react-hooks) while the app internals remain on the catalog 0.25.0 SDK - migrating earn to 1.x (wallet's direct-pin precedent) is a tracked follow-up. Every TypeScript snippet must open with its import line (test-enforced in `src/__tests__/code-steps.test.ts`).
