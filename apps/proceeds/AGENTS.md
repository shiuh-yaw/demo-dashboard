---
name: "@dynamic-demos/proceeds"
kind: app
flow_role: offramp
custody: non-custodial
status: stable
regions:
  - country: US
    currency: USD
    rails: [ach, wire]
  - country: DE
    currency: EUR
    rails: [sepa]
  - country: FR
    currency: EUR
    rails: [sepa]
  - country: ES
    currency: EUR
    rails: [sepa]
  - country: IT
    currency: EUR
    rails: [sepa]
  - country: NL
    currency: EUR
    rails: [sepa]
  - country: GB
    currency: GBP
    rails: [faster_payments]
---

# @dynamic-demos/proceeds

Operator-facing onchain proceeds-to-bank demo. A merchant connects their Dynamic wallet, views balances + transaction history sourced from Alchemy, and offramps USDC to fiat via Iron (US ACH/wire, EU SEPA, GB Faster Payments). The app is the **historical source of the canonical theme** — its `globals.css` was promoted to `packages/theme/src/defaults.css` in Phase 4-defaults (D-020).

## Capabilities

- Email-OTP login (Dynamic).
- Wallet balance display via Alchemy Prices API + asset transfers.
- Transaction history (Alchemy `getAssetTransfers`) with status badges.
- Iron offramp flow — quote, beneficiary entry, sign + submit transfer, poll status.
- Per-app brand theming via `--brand-*` CSS variables (D-007).

## Public surface

App routes:

- `/` — dashboard / balances landing (after auth).
- `/(auth)/login` — email OTP.
- `/(app)/...` — main authenticated surface (balances, history, offramp).
- `/api/balance` — server-only Alchemy balance proxy.
- `/api/...` — additional Iron + Alchemy server routes.

Cookie / header contract (D-008):

- Query `?id=<configId>` → cookie `proceeds_config_id` → header `x-proceeds-config-id` → dashboard config fetch.

## Required environment

- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` — per-app Dynamic env id — optional (falls back to default).
- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID_DEFAULT` — workspace default — required if no per-app id.
- `ALCHEMY_API_KEY` — server-only Alchemy key — required.
- `IRON_API_KEY` — server-only Iron key — required (D-003: this app holds Iron creds today; Phase 5B routes via dashboard).
- `IRON_ENVIRONMENT` — `sandbox` | `production` — defaults to sandbox (D-005).
- `NEXT_PUBLIC_APP_ENV` — `production` flips sandbox flags off.

## Theming

Consumes `@dynamic-demos/theme/defaults.css` (D-007 / D-020). The shared `--brand-*` token contract is the canonical source; proceeds-specific tokens (`--proceeds-navy`, `--proceeds-blue`, `--proceeds-grey*`, `--proceeds-gold`, `--proceeds-teal`, `--max-width-content`) remain in `app/globals.css` since they're consumed by app-only chrome (`dashboard-header`, `app-shell`). The app uses `createDemoMiddleware` with `configIdSource: 'none'` — there's no per-config theme overlay, so the SSR `<ThemeStyleTag>` pattern (D-008) is not wired today; it would land if proceeds ever gains per-tenant theming.

## Credentials

- **Dynamic:** per-app or workspace-default env (D-003).
- **Fireblocks:** none today.
- **Iron:** per-app today; will move to dashboard orchestration in Phase 5B.
- **Alchemy:** per-app today; read-only data, low risk to surface here.

## Slots vs invariants

**Slots:** brand colors (per dashboard config), supported corridors (Iron offramp regions), default wallet address.

**Invariants:**

- All Iron + Alchemy calls go through `app/api/*` server routes — keys never reach the client.
- User wallet selection persists in Dynamic user metadata (D-002).
- Sandbox-by-default (D-005). Real Iron money requires `IRON_ENVIRONMENT=production` + `[prod-creds]` PR title.
- Apps don't access Postgres (D-002). Persistence happens at dashboard via events (Phase 5A).

## Data boundaries

- No Postgres.
- Redis: not currently used.
- User state (selected wallet, defaults) → Dynamic user metadata.
- Transaction lifecycle (Iron offramp) → today persisted via Iron's status; canonical persistence lands in Phase 5A via dashboard webhook framework.

## Deployment

- **Vercel project:** `dynamic-demos-proceeds`.
- **Root dir:** `apps/proceeds`.
- **Required env:** see "Required environment". Iron + Alchemy keys are server-only.
- **Custom domain:** TBD; preview URL stable.
- **Owner:** demos team.
- **Dev port:** 4010 (`pnpm dev:proceeds`).

## Integration map

**Imports:** `@dynamic-demos/dynamic`, `@dynamic-demos/ui`, `@dynamic-demos/utils`, `@dynamic-demos/alchemy`, `@dynamic-demos/iron`, `@dynamic-demos/fireblocks`.
**Imported by:** none.

## Examples

```ts
// middleware.ts
import { createDemoMiddleware } from "@dynamic-demos/dynamic/demo-middleware";

export const middleware = createDemoMiddleware({
  demoType: "proceeds",
  defaultReturnPath: "/",
});
```

## Do / Don't

- Do: keep Iron + Alchemy calls behind `app/api/*` server routes.
- Do: surface offramp status by polling — webhooks land at dashboard (D-011), not here.
- Do: use `--brand-*` CSS variables, not hardcoded hex.
- Don't: expose Iron / Alchemy keys with `NEXT_PUBLIC_`.
- Don't: persist transactions in this app — emit events to dashboard once Phase 5B lands.

## Open questions / known gaps

- Phase 4-app proceeds completed: `globals.css` is now thin, importing `@dynamic-demos/theme/defaults.css` and keeping only `--proceeds-*` chrome tokens. All component refs use the `--brand-*` namespace (D-007).
- Phase 5B routes Iron through dashboard `/api/orchestrate/offramp`; per-app `IRON_API_KEY` retires then.
- No real-network E2E tests in CI (D-023). Manual sandbox runs cover offramp flow.
