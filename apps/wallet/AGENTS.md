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

Consumes `@dynamic-demos/theme/defaults.css` (D-007 / D-020). The shared `--brand-*` token contract is the canonical source; wallet overrides token *values* in `app/globals.css` (`:root`) — its design language is charcoal-on-light with a blue accent and tighter radii — but never adds new namespaces. Wallet has no `middleware.ts` and no per-config theme overlay today, so the SSR `<ThemeStyleTag>` pattern (D-008) is not wired; it would land if wallet ever gains per-tenant theming. The class-based dark-mode `@variant dark` rule lives in wallet's `globals.css` since the app opts out of Tailwind v4's media-query default; it is not part of the shared theme.

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

- Phase 4-app wallet completed: `globals.css` is now thin, importing `@dynamic-demos/theme/defaults.css` and overriding only the `--brand-*` token values that encode wallet's brand. All component refs use the `--brand-*` namespace (D-007). SSR `<ThemeStyleTag>` is intentionally not wired — wallet has no `middleware.ts` and no per-config theme overlay today; it would land if wallet ever gains per-tenant theming.
- Multi-chain support today is whatever Dynamic env allows; Solana extension landed in Phase 1D.
- No tests in CI today. Add at least smoke coverage for the JWT-protected route in a follow-up.
