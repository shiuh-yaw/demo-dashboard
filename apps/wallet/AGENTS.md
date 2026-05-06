---
name: "@dynamic-demos/wallet"
kind: app
flow_role: wallet
custody: non-custodial
status: stable
---

# @dynamic-demos/wallet

Embedded-wallet demo. End users sign in via Dynamic, get a non-custodial wallet, and view balances + sign transactions. Used as the canonical wallet primitive when a partner wants to demo "Dynamic-as-the-wallet" without payments / offramp / bridging on top.

## Capabilities

- Login (Dynamic, email OTP + social providers configured per app config).
- Wallet creation — Dynamic embedded wallet (EVM by default).
- Balance display (multi-chain).
- Transaction signing + JWT-protected API access.
- `/jwt` route demonstrates JWT-bound API calls (showcase for sales team).

## Public surface

App routes:

- `/` — main wallet surface.
- `/jwt` — demo of JWT-authenticated API.
- `/api/...` — server-only routes for any private state.

This app is one of the **non-consumers** of `@dynamic-demos/dynamic`'s middleware/sync-cookie/`<DynamicInit />` primitives — it consumes the SDK as a client-side singleton without JWT cookie sync. See `packages/dynamic/AGENTS.md` "Open questions" for context.

## Required environment

- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` — per-app Dynamic env — optional.
- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID_DEFAULT` — workspace default.
- `NEXT_PUBLIC_APP_ENV` — `production` flips sandbox off (D-005).

No provider keys today — wallet is Dynamic-only.

## Theming

The app currently consumes `@dynamic-demos/theme` types but predates the visa-direct cookie + `<ThemeStyleTag>` pattern (D-008). Phase 4 migrates this app onto the SSR theme-injection flow with the rest of the demos.

## Credentials

- **Dynamic:** per-app or workspace-default (D-003).
- **Fireblocks:** none.
- **Other providers:** none.

## Slots vs invariants

**Slots:** brand, supported chains (Dynamic env decides), default chain.

**Invariants:**

- Non-custodial — the embedded wallet's keys live with Dynamic; no app-side custody.
- JWT verification on protected API routes uses `verifyDynamicJWT` from `@dynamic-demos/dynamic` (D-003).
- Apps don't access Postgres (D-002). Wallet metadata lives in Dynamic.

## Data boundaries

- No Postgres.
- Redis: not used.
- User state → Dynamic user metadata.
- No canonical transactions — this app doesn't move money through providers.

## Deployment

- **Vercel project:** `dynamic-demos-wallet`.
- **Root dir:** `apps/wallet`.
- **Required env:** see above.
- **Owner:** demos team.
- **Dev port:** 4003.

## Integration map

**Imports:** `@dynamic-demos/dynamic`, `@dynamic-demos/ui`, `@dynamic-demos/utils`, `@dynamic-demos/theme`, `@dynamic-demos/types`.
**Imported by:** none.

## Examples

```ts
// app/api/protected/route.ts
import { getAuthenticatedUserFromCookies } from "@dynamic-demos/dynamic";

export async function GET() {
  const user = await getAuthenticatedUserFromCookies();
  if (!user) return new Response("Unauthorized", { status: 401 });
  return Response.json({ wallet: user.wallets?.[0]?.address });
}
```

## Do / Don't

- Do: use `verifyDynamicJWT` for any new protected route. Never hand-roll JWT verification.
- Do: prefer `createDynamicClientSingleton` from `@dynamic-demos/dynamic/client-singleton` — this app fully migrated in Phase 1D.
- Don't: persist user state outside Dynamic metadata.
- Don't: add provider integrations here — keep this demo wallet-pure. Use a new app for payments/offramp/bridges.

## Open questions / known gaps

- Phase 4 migrates this app onto the visa-direct cookie + SSR theme pattern (D-008).
- Multi-chain support today is whatever Dynamic env allows; Solana extension landed in Phase 1D.
- No tests in CI today. Add at least smoke coverage for the JWT-protected route in a follow-up.
