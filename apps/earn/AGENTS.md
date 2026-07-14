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
- Wallet creation / connection (Dynamic embedded + WAAS pattern — bespoke today, future Phase 4 work to consolidate).
- Vault listing per config id, deposit + withdraw flows.
- Mock mode (wallet dropdown toggle) — vault deposits stored under `metadata.earn.deposits` in Dynamic user metadata. "My Vaults" surface above the vault list shows mocked positions.
- "Positions" tab on a portfolio dashboard surfaces mocked positions when mock mode is on.

## Public surface

App routes (flat — no path-based config segments):

- `/(auth)/login` — auth.
- `/(dashboard)/earn` — main dashboard.
- `/api/balance?address=0x...` - auth-required; Dynamic USDC balance on Base Sepolia via Alchemy (backs the creator-balance card + Add funds context).
- `/api/...` — server-only.

Cookie / header contract (D-008): query `?theme=<configId>` → cookie `earn_config_id` (sticky) → header `x-earn-config-id` → dashboard config fetch. Subsequent navigations carry the cookie; the query param can be dropped from the URL once set.

Legacy `/e/<id>/...` deep-links 307-redirect to `/?theme=<id>` via `next.config.ts` `redirects()` for back-compat — first hit sets the cookie, then everything is flat.

## Required environment

- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` — per-app Dynamic env — optional.
- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID_DEFAULT` — workspace default.
- `NEXT_PUBLIC_DASHBOARD_URL` — dashboard origin for config fetch.
- `NEXT_PUBLIC_APP_ENV` — `production` flips sandbox off.
- `ALCHEMY_API_KEY` - server-only; `/api/balance` reads the Dynamic USDC balance on Base Sepolia via Alchemy (Dynamic's balances API doesn't cover Base Sepolia). Alchemy is D-003-exempt like proceeds/remittance/trade - see `packages/alchemy/AGENTS.md`.

No other provider keys — vault contracts are onchain; deposits are user-signed.

## Theming

Unified theme injection per D-008:

- `middleware.ts` uses `createDemoMiddleware({ demoType: "earn", publicRoutes: ["/login"], defaultReturnPath: "/earn", authenticatedRootRedirect: "/earn" })`. Defaults: `configIdSource: "query"`, `stickyConfigCookie: true`. Forwards `x-earn-config-id` from `?theme=` query or sticky cookie.
- Root `app/layout.tsx` reads the header server-side, fetches the config via `getEarnConfig`, projects `EarnTheme` onto `Partial<BrandTheme>` (`lib/earn-brand.ts`), and emits the override block via `<ThemeStyleTag overridesOnly>` in `<head>`. Zero FOUC, zero hydration mismatch.
- `app/globals.css` declares earn's static `--brand-*` values; `--widget-*` and `--color-earn-*` namespaces are compat aliases pointing at `--brand-*` so per-config overrides cascade through `packages/ui` consumers and earn's existing utility classes (`bg-earn-light`, `text-earn-text-primary`, etc.) without per-component sweeps. `globals.css` pins the pre-D-030 default palette (Apple-ish tone) so the D-030 canonical-token change doesn't restyle this app; removing the pin is a deliberate future restyle.
- `EarnConfigProvider` (in the root layout) hydrates `useEarnConfig()` for branding/layout/title.

## Credentials

- **Dynamic:** per-app or workspace-default (D-003); external-JWT enabled.
- **Fireblocks:** none.
- **Other providers:** Alchemy (`ALCHEMY_API_KEY`, server-only, read-only balance data - D-003-exempt per `packages/alchemy/AGENTS.md`).

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

**Imports:** `@dynamic-demos/dynamic`, `@dynamic-demos/ui`, `@dynamic-demos/utils`, `@dynamic-demos/theme`, `@dynamic-demos/types`, `@dynamic-demos/alchemy`.
**Imported by:** none.

## Examples

```ts
// middleware.ts — simplified D-008 pattern, cookie + query only
export const middleware = createDemoMiddleware({
  demoType: "earn",
  publicRoutes: ["/login"],
  defaultReturnPath: "/earn",
  authenticatedRootRedirect: "/earn",
});
```

## Do / Don't

- Do: persist mock-mode state in Dynamic user metadata (`metadata.earn.deposits`) — never `localStorage`.
- Do: keep deposit signatures user-side. The app never sees keys.
- Don't: read mock state from anywhere other than Dynamic metadata; the source-of-truth pattern matters.
- Don't: branch real-vs-mock logic in many places — funnel through `useMockMode()`.

## Open questions / known gaps

- WAAS / wallet-creation logic here is bespoke; Phase 4 considers extending `@dynamic-demos/dynamic` to model that pattern.
- Mock-mode pattern in this app is the reference for trade + future demos.
