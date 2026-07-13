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
- Connected wallet balance + asset transfer history (Alchemy).
- Recipient + corridor selection screen.
- Offramp execution via dashboard `/api/orchestrate/offramp` (alfredPay or BlindPay depending on corridor).
- Status polling + history (D-011: webhooks land at dashboard, this app polls).
- Admin surface under `/admin` for demo operators to inspect recent transactions.
- Branded short-link entry (`/r/<id>`) for dashboard-launched links.

## Public surface

App routes:

- `/(auth)/login` — auth.
- `/(app)/...` — main authenticated surface (send, history).
- `/admin` — operator inspector.
- `/api/handlers/transactions-history` — server-only Alchemy proxy.

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

Sandbox-by-default (D-005).

## Theming

Consumes `@dynamic-demos/theme/defaults.css` (D-007 / D-020) — `app/globals.css` is now thin: it imports the shared defaults, declares the remittance-only `overflow-hidden` rule, the dark-variant override, and a small set of `--widget-*` → `--brand-*` compat aliases for shared `packages/ui` components (e.g. `AuthLayout`) that haven't migrated yet. The aliases retire when the brand cutover phase migrates `packages/ui` to read `--brand-*` directly. `globals.css` pins the pre-D-030 default palette (Apple-ish tone) so the D-030 canonical-token change doesn't restyle this app; removing the pin is a deliberate future restyle.

Per-config theming is wired SSR via `<ThemeStyleTag>` (D-008): `createDemoMiddleware` (factory defaults — `configIdSource: "query"`, `stickyConfigCookie: true`) forwards `x-remittance-config-id` resolved from `?theme=` or the `remittance_config_id` cookie, the root layout fetches the config from the dashboard, projects it through `themeToBrandTheme(...)` (which derives `primaryHover`, `accent`, and the card gradient via HSL math from `primaryColor` + optional `secondaryColor`), and emits an `overridesOnly` `<style>` block in `<head>` so the operator's brand colors paint on first byte — zero FOUC, zero hydration mismatch. `ThemeWrapper` (client `useEffect` reapplying the same vars) remains as a safety net during client navigations.

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

**Imports:** `@dynamic-demos/dynamic`, `@dynamic-demos/ui`, `@dynamic-demos/utils`, `@dynamic-demos/theme`, `@dynamic-demos/types`, `@dynamic-demos/alchemy`, `@dynamic-demos/fireblocks`.
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
- Path-based config routing (`/r/[id]/*`) was removed in the Phase-4-app middleware-simplification follow-up — middleware uses cookie + query only. Legacy URLs redirect via `next.config.ts`.
- The `/admin` surface predates the dashboard's operator UI; folds into dashboard once Phase 5C lands.
- No real-network E2E tests in CI (D-023).
