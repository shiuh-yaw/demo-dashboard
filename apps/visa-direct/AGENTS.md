---
name: "@dynamic-demos/visa-direct"
kind: app
flow_role: payouts
custody: mixed
status: experimental
---

# @dynamic-demos/visa-direct

Airbnb-style branded host portal demonstrating Visa Direct stablecoin payouts to crypto wallets. Hosts log in, configure their preferred payout method, and receive USDC payouts via Visa Direct Push-to-Wallet API — Fireblocks orchestrates and custodies, MTLco onramps (USD → USDC). Sales demo for Visa + financial-institution partners; the demo is the **authoritative reference** for the visa-direct cookie + SSR theme pattern (D-008).

## Capabilities

- Email-OTP + Google SSO login (Dynamic).
- Payment Methods page: bank, crypto wallet (BYO Kraken / embedded Fireblocks), and debit card cards. Phase 1 lands cards; Phase 2 lands wallet flows; Phase 3 wires payout; Phase 4 adds history.
- Demo payout modal — POST `/api/payout` → Visa Direct API (stubbed) → Fireblocks `createTransaction` mapping. Polls for status.
- Wallet verification + AML + sanctions inline checks before execution.
- Transaction history with side-by-side Visa Direct + Fireblocks payload drawer (Phase 4).
- Default payment method state machine persisted in Dynamic user metadata.

## Public surface

App routes:

- `/login` — auth (email OTP + Google SSO).
- `/payment-methods` — primary surface (Phase 1+).
- `/transactions` — payout history (Phase 4).
- `/api/payout` — server-only payout trigger (Phase 3).
- `/api/transactions` — history (Phase 4).

Cookie / header contract (D-008):

- Query `?id=<configId>` on entry → cookie `visa-direct_config_id` → forwarded as header `x-visa-direct-config-id` to dashboard config fetch.

## Required environment

Validated in `lib/env.ts` via `@t3-oss/env-nextjs` + Zod.

- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` — Dynamic env id — required.
- `DYNAMIC_API_KEY` — enables Dynamic user metadata persistence — optional.
- `FIREBLOCKS_API_KEY` — server-only — required (Phase 3).
- `FIREBLOCKS_API_SECRET` — server-only, base64 PEM — required (Phase 3).
- `FIREBLOCKS_VAULT_ACCOUNT_ID` — MTLco connected sub-account id — required (Phase 3).
- `VISA_DIRECT_API_KEY` — server-only, stubbed Phase 1-2 — required.
- `VISA_DIRECT_BASE_URL` — per-environment base URL — required.

Sandbox-by-default (D-005): `NEXT_PUBLIC_APP_ENV=production` is the only flip; absent or anything else stays sandbox.

## Theming

This app **owns the SSR cookie + `<ThemeStyleTag>` pattern** that the rest of the monorepo migrates to in Phase 4 (D-008). `createDemoMiddleware` from `@dynamic-demos/dynamic` reads `?id=<configId>` on entry, sets the `visa-direct_config_id` cookie, and forwards `x-visa-direct-config-id` to the server layout. The layout reads the header, calls dashboard for the brand config, and injects the `--brand-*` overlay via an inline `<style>` tag. Zero FOUC, sticky brand across navigation, no client-side theme fetch.

## Credentials

- **Dynamic:** per-app `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` (D-003). Falls back to the workspace default if unset.
- **Fireblocks:** per-app credentials live in this app's env (D-003). MTLco vault sub-account id is required.
- **Other providers:** none — Visa Direct credentials live here for now (Phase 5B will route this through dashboard orchestration).

## Slots vs invariants

**Slots:** brand colors (Airbnb coral default, swappable per dashboard config), payout method labels + icons, default-method state.

**Invariants:**

- All Fireblocks + Visa Direct calls go through Next.js API routes — credentials never leave the server.
- Wallet selection + default preference persist to **Dynamic user metadata**, not a per-app DB (D-002).
- Default payment method state machine is single-default — only one card holds the badge at a time.
- The visa-direct cookie pattern is canonical (D-008). Don't fork it.
- Apps don't access Postgres directly (D-002).

## Data boundaries

- No Postgres access. The dashboard owns the canonical persistence (D-002).
- Redis isn't currently used — payout history will land in Dynamic metadata until Phase 5A wires events to dashboard.
- User state (default method, wallet selections) → Dynamic user metadata.
- Canonical transactions → events emitted to dashboard `/api/orchestrate/...` once Phase 5B lands.

## Deployment

- **Vercel project:** `dynamic-demos-visa-direct`.
- **Root dir:** `apps/visa-direct`.
- **Required env:** see "Required environment" above. All Fireblocks + Visa Direct vars are server-only (no `NEXT_PUBLIC_` prefix).
- **Custom domain:** TBD (Vercel preview URL stable for sales demos).
- **Owner:** demos team.
- **Dev port:** 4006 (`pnpm dev`).

## Integration map

**Imports:** `@dynamic-demos/dynamic`, `@dynamic-demos/ui`, `@dynamic-demos/utils`, `@dynamic-demos/fireblocks` (Phase 3+).
**Imported by:** none (apps are leaves).

## Examples

```ts
// middleware.ts
import { createDemoMiddleware } from "@dynamic-demos/dynamic/demo-middleware";

export const middleware = createDemoMiddleware({
  demoType: "visa-direct",
  defaultReturnPath: "/payment-methods",
});
```

```tsx
// app/(app)/(vd)/layout.tsx — server layout reads x-visa-direct-config-id and injects theme
import { headers } from "next/headers";
import { ThemeStyleTag, fetchDemoConfig } from "@dynamic-demos/theme"; // Phase 4
const configId = (await headers()).get("x-visa-direct-config-id");
const config = configId ? await fetchDemoConfig(configId) : DEFAULT_CONFIG;
return <><ThemeStyleTag theme={config.theme} />{children}</>;
```

## Do / Don't

- Do: keep Fireblocks + Visa Direct calls behind server-only `app/api/*` routes.
- Do: persist user preferences (default method, wallet) in Dynamic user metadata.
- Do: use `--brand-*` CSS variables from `@dynamic-demos/theme`. Old `--widget-*` names migrate during Phase 4.
- Do: mirror `apps/remittance` patterns for layout, hooks, and screen state machines — that's the gold-standard reference.
- Don't: expose Fireblocks or Visa Direct keys with `NEXT_PUBLIC_` prefix.
- Don't: persist canonical transactions in this app — emit events to dashboard once Phase 5B lands.
- Don't: store wallet selection in `localStorage` — Dynamic user metadata is the cross-device source of truth.

## Open questions / known gaps

- Phase 2-4 product work tracked in the previous CLAUDE.md content (folded into git history). The dev plan ships per-phase MVPs.
- Theme variables still reference `--widget-*` in some screens; migrate to `--brand-*` during Phase 4 per D-007 / D-020.
- Visa Direct API is stubbed in Phase 1-2; real integration begins Phase 3.
- Phase 5B will route Fireblocks orchestration through dashboard `/api/orchestrate/*` instead of the per-app server route. When that lands, drop the per-app Fireblocks env vars.
