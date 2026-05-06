---
name: "@dynamic-demos/earn"
kind: app
flow_role: wallet
custody: non-custodial
status: stable
---

# @dynamic-demos/earn

Vault-deposit / yield demo. End users sign in via Dynamic, deposit USDC into curated yield vaults, and view positions. Uses a per-config-id route shape (`/e/[id]/...`) so a single app deployment can serve many branded vault demos. Includes a "mock mode" toggle so demos work without on-chain transactions.

## Capabilities

- Email-OTP + Google SSO + external-JWT login (Dynamic).
- Wallet creation / connection (Dynamic embedded + WAAS pattern — bespoke today, future Phase 4 work to consolidate).
- Vault listing per config id, deposit + withdraw flows.
- Mock mode (wallet dropdown toggle) — vault deposits stored under `metadata.earn.deposits` in Dynamic user metadata. "My Vaults" surface above the vault list shows mocked positions.
- "Positions" tab on a portfolio dashboard surfaces mocked positions when mock mode is on.

## Public surface

App routes:

- `/(auth)/login` — auth.
- `/(dashboard)/...` — main dashboard.
- `/e/[id]/...` — per-config branded vault surface.
- `/api/...` — server-only.

Cookie / header contract (D-008): query `?id=<configId>` → cookie `earn_config_id` → header `x-earn-config-id` → dashboard config fetch. Route pattern uses `configParam: "id"` (see `app.config.ts`) so the id rides in the URL too.

## Required environment

- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` — per-app Dynamic env — optional.
- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID_DEFAULT` — workspace default.
- `NEXT_PUBLIC_DASHBOARD_URL` — dashboard origin for config fetch.
- `NEXT_PUBLIC_APP_ENV` — `production` flips sandbox off.

No provider keys — vault contracts are onchain; deposits are user-signed.

## Theming

`createDemoMiddleware` + `<ThemeStyleTag>` per D-008. Phase 4 promotes the per-config theme overlay onto the canonical `--brand-*` contract.

## Credentials

- **Dynamic:** per-app or workspace-default (D-003); external-JWT enabled.
- **Fireblocks:** none.
- **Other providers:** none.

## Slots vs invariants

**Slots:** vault list per config id, brand, mock-mode default state.

**Invariants:**

- Mock mode is **per-user via Dynamic user metadata** — never `localStorage`. Cross-device consistency is the point.
- Real deposits are user-signed onchain transactions; the app never holds keys.
- Apps don't access Postgres (D-002) — vault list comes from dashboard config; positions live in Dynamic metadata (mock) or onchain.
- Sandbox-by-default for any future provider integration (D-005).

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

**Imports:** `@dynamic-demos/dynamic`, `@dynamic-demos/ui`, `@dynamic-demos/utils`, `@dynamic-demos/theme`, `@dynamic-demos/types`.
**Imported by:** none.

## Examples

```ts
// middleware.ts — config-aware
import { createDemoMiddleware } from "@dynamic-demos/dynamic/demo-middleware";

export const middleware = createDemoMiddleware({
  demoType: "earn",
  defaultReturnPath: (configId) => `/e/${configId}/earn`,
});
```

## Do / Don't

- Do: persist mock-mode state in Dynamic user metadata (`metadata.earn.deposits`) — never `localStorage`.
- Do: keep deposit signatures user-side. The app never sees keys.
- Don't: read mock state from anywhere other than Dynamic metadata; the source-of-truth pattern matters.
- Don't: branch real-vs-mock logic in many places — funnel through `useMockMode()`.

## Open questions / known gaps

- WAAS / wallet-creation logic here is bespoke; Phase 4 considers extending `@dynamic-demos/dynamic` to model that pattern.
- Phase 4 migrates color variables to the canonical `--brand-*` contract.
- Mock-mode pattern in this app is the reference for trade + future demos.
