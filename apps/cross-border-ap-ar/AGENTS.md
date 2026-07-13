---
name: "@dynamic-demos/cross-border-ap-ar"
kind: app
flow_role: payouts
custody: custodial
status: experimental
---

# @dynamic-demos/cross-border-ap-ar

Cross-border accounts payable / accounts receivable demo for treasury teams. A finance operator dashboards inbound receivables and outbound disbursements across corridors, executing payouts via Fireblocks-mediated rails. Custodial — the merchant's funds live in a Fireblocks vault throughout, not in a user wallet.

## Capabilities

- Disbursement listing + execution (`/disbursements`).
- Per-disbursement payment screen (`/payment`).
- Transaction history dashboard (`/transactions`).
- Direct Fireblocks integration today (will move behind dashboard orchestration in Phase 5B).

## Public surface

App routes:

- `/` — landing / dashboard.
- `/disbursements` — list + execute.
- `/payment` — single-disbursement payment surface.
- `/transactions` — history.
- `/api/...` — server-only routes for Fireblocks operations.

This app **does not use the Dynamic SDK** today — it's an internal-style operator surface with no end-user authentication. Phase 4+ may add Dynamic auth gating; until then, this app is one of the non-consumers of `@dynamic-demos/dynamic` middleware/init primitives.

## Required environment

- `FIREBLOCKS_API_KEY` — server-only — required.
- `FIREBLOCKS_API_SECRET` — server-only PEM — required.
- `FIREBLOCKS_API_BASE_URL` — defaults to sandbox (D-005).
- `FIREBLOCKS_VAULT_ACCOUNT_ID` — corporate treasury vault id.
- `NEXT_PUBLIC_APP_ENV` — `production` flips sandbox off.

Sandbox-by-default (D-005). Production opt-in requires `[prod-creds]` PR title.

## Theming

Consumes `@dynamic-demos/theme/defaults.css` (D-007 / D-020). The shared `--brand-*` token contract is the canonical source. App-local overrides in `app/globals.css` reset `--brand-page-bg` (`#f9fafb`) and `--brand-fg` (`#222222`) to preserve the existing Etsy operator surface byte-for-byte; `--etsy-orange` / `--etsy-dark` remain as app-local identity tokens (top-bar chrome + accent), outside the `--brand-*` contract by design. The app has no Dynamic middleware and no per-config theme overlay, so the SSR `<ThemeStyleTag>` pattern (D-008) is not wired today; it would land if cross-border-ap-ar gains per-tenant theming via dashboard config. `globals.css` pins the pre-D-030 default palette (Apple-ish tone) so the D-030 canonical-token change doesn't restyle this app; removing the pin is a deliberate future restyle.

## Credentials

- **Dynamic:** none today.
- **Fireblocks:** per-app credentials for the corporate treasury vault (D-003).
- **Other providers:** none — payout providers are Fireblocks Network listings (DVP) accessed via `@dynamic-demos/fireblocks/providers/*`.

## Slots vs invariants

**Slots:** brand, supported corridors, treasury vault id, AP / AR labels.

**Invariants:**

- **Custodial**: the operator's USDC stays in the Fireblocks vault until disbursement; surface this in copy.
- All Fireblocks calls go through `app/api/*` server routes — keys never reach the client.
- Sandbox-by-default (D-005).
- No Postgres (D-002). Disbursement history persisted in Fireblocks transaction memo / dashboard.

## Data boundaries

- No Postgres in this app.
- Redis: not used.
- No user state today (no Dynamic auth).
- Canonical transactions → today managed in Fireblocks; canonical persistence lands when Phase 5B routes this app through dashboard orchestration.

## Deployment

- **Vercel project:** `dynamic-demos-cross-border-ap-ar`.
- **Root dir:** `apps/cross-border-ap-ar`.
- **Required env:** see above.
- **Owner:** demos team.
- **Dev port:** 4009.

## Integration map

**Imports:** `@dynamic-demos/fireblocks`.
**Imported by:** none.

## Examples

```ts
// app/api/disbursements/route.ts
import { createFireblocksClient } from "@dynamic-demos/fireblocks";

export async function POST() {
  const fb = createFireblocksClient({ /* env-fallback */ });
  // create transaction etc.
}
```

## Do / Don't

- Do: keep all Fireblocks calls on the server; expose only summary data to the client.
- Do: surface "custodial" status in operator copy — funds sit in the vault until disbursement.
- Don't: expose Fireblocks creds with `NEXT_PUBLIC_*`.
- Don't: add end-user auth (Dynamic) without first deciding whether this app is operator-only or two-sided. Operator-only is the current premise.

## Open questions / known gaps

- Phase 4-app cross-border-ap-ar completed: `globals.css` is now thin, importing `@dynamic-demos/theme/defaults.css` and keeping only the `--brand-page-bg` / `--brand-fg` overrides plus the `--etsy-*` identity tokens. No `<ThemeStyleTag>` is wired — the app has no middleware / per-config theming today; that lands when the operator surface becomes themable per dashboard config.
- Phase 5B routes payout creation through dashboard `/api/orchestrate/payouts` — drop the per-app `FIREBLOCKS_*` env vars then.
- No real-network E2E tests in CI (D-023).
