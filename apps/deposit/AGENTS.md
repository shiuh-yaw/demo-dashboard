---
name: "@dynamic-demos/deposit"
kind: app
flow_role: wallet
custody: mixed
status: experimental
---

# @dynamic-demos/deposit

Multi-network deposit demo. End users sign in via Dynamic, are auto-assigned (or pick) a Fireblocks-backed deposit address, and fund their wallet by sending USDC/native assets. Demonstrates the Fireblocks vault sub-account → user-deposit-address pattern with per-network selection.

## Capabilities

- Email-OTP + social login (Dynamic).
- Network selector (`network-bar.tsx`) for picking which chain the user wants to deposit on.
- Per-user Fireblocks deposit address creation/lookup (server-only) — backed by the vault helpers in `@dynamic-demos/fireblocks`.
- Live balance polling.
- JWT-protected API access via `verifyDynamicJWT`.

## Public surface

App routes:

- `/` — landing + network selector + deposit address card.
- `/api/...` — server-only deposit-address allocation, balance reads.

Phase 1D consolidated client-singleton helpers; Phase 4 added `middleware.ts` (minimal config-id forwarder) for theme-config forwarding. Authentication remains client-side via the Dynamic SDK widget — there are no JWT-protected SSR routes; deposit's `app/api/*` routes verify JWTs themselves via `requireUserId`.

## Required environment

- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` — per-app Dynamic env — optional.
- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID_DEFAULT` — workspace default.
- `FIREBLOCKS_API_KEY` — server-only — required.
- `FIREBLOCKS_API_SECRET` — server-only PEM — required.
- `FIREBLOCKS_API_BASE_URL` — defaults to sandbox (D-005).
- `FIREBLOCKS_VAULT_ACCOUNT_ID` — root vault id used for sub-account allocation.
- `NEXT_PUBLIC_DASHBOARD_API_URL` — base URL for dashboard wallet config API (defaults to `http://localhost:4000` in dev).

## Theming

Adopts the unified theme injection pattern (D-008). `middleware.ts` forwards `?theme=<configId>` as the `x-deposit-config-id` header; `app/layout.tsx` reads it server-side, fetches the wallet config from the dashboard `/api/wallets/[id]` endpoint (deposit shares the wallet flow_role), projects `WidgetTheme` → `Partial<BrandTheme>` via `lib/deposit-brand.ts`, and emits the per-brand `--brand-*` overrides via `<ThemeStyleTag overridesOnly>` in `<head>`. Static deposit defaults live in `app/globals.css` (with `--widget-*` compat aliases for shared `packages/ui` components). Header-only forwarding — no `Set-Cookie` (deep-links honor URL state). `globals.css` pins the pre-D-030 default palette (Apple-ish tone) so the D-030 canonical-token change doesn't restyle this app; removing the pin is a deliberate future restyle.

## Credentials

- **Dynamic:** per-app or workspace-default (D-003).
- **Fireblocks:** per-app credentials for the deposit-address vault (D-003).
- **Other providers:** none.

## Slots vs invariants

**Slots:** supported networks, brand, default network.

**Invariants:**

- Mixed custody: the user controls the destination wallet, but Fireblocks holds vault sub-accounts that allocate the deposit address. Surface this in copy.
- All Fireblocks calls go through `app/api/*` server routes — keys never reach the client.
- Sandbox-by-default (D-005). Production opt-in requires `[prod-creds]` PR title.
- Apps don't access Postgres (D-002). Deposit-address-to-user mapping lives in Dynamic user metadata.

## Data boundaries

- No Postgres.
- Redis: not used.
- User state (assigned deposit addresses per network) → Dynamic user metadata.

## Deployment

- **Vercel project:** `dynamic-demos-deposit`.
- **Root dir:** `apps/deposit`.
- **Required env:** see above.
- **Owner:** demos team.
- **Dev port:** 4006.

## Integration map

**Imports:** `@dynamic-demos/dynamic`, `@dynamic-demos/ui`, `@dynamic-demos/utils`, `@dynamic-demos/fireblocks`.
**Imported by:** none.

## Examples

```ts
// app/api/deposit-address/route.ts
import { getOrCreateDepositAddressForVault, createFireblocksClient } from "@dynamic-demos/fireblocks";
import { getAuthenticatedUserFromCookies } from "@dynamic-demos/dynamic";

export async function POST(req: Request) {
  const user = await getAuthenticatedUserFromCookies();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const fb = createFireblocksClient({ /* env-fallback */ });
  const addr = await getOrCreateDepositAddressForVault(fb, { vaultId: process.env.FIREBLOCKS_VAULT_ACCOUNT_ID!, asset: "USDC_BSC" });
  return Response.json(addr);
}
```

## Do / Don't

- Do: keep Fireblocks calls behind `app/api/*` server routes.
- Do: use the lazy `createDynamicClientSingleton` from `@dynamic-demos/dynamic/client-singleton` (Phase 1D landed full migration here).
- Don't: expose Fireblocks creds with `NEXT_PUBLIC_*`.
- Don't: store deposit-address mapping anywhere outside Dynamic user metadata.

## Open questions / known gaps

- `--widget-*` compat aliases in `globals.css` retire when shared `packages/ui` components migrate to `--brand-*`.
- The 12 existing characterization tests cover the Phase 1D client-singleton migration; expand with deposit-address fixtures next.
- Fireblocks deposit-address creation takes a few seconds first time; consider an inline status state machine.
