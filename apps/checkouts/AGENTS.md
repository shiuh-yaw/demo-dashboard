---
name: "@dynamic-demos/checkouts"
kind: app
flow_role: checkout
custody: non-custodial
status: stable
---

# @dynamic-demos/checkouts

Stablecoin checkout / pay-with-crypto demo. End users authenticate via Dynamic, view a multichain balance summary, and complete a checkout that may bridge/swap across chains via LI.FI. Showcases the Dynamic embedded wallet + LI.FI bridge SDK pattern when paired with a CeFi balance source (Kraken via Dynamic CeFi connector).

## Capabilities

- Email-OTP + social login (Dynamic).
- Multichain balance fetch via dashboard orchestration (the 30+ inline SSR-safe wrappers cover Kraken accounts, multichain balances, etc.).
- LI.FI bridge / swap setup via `configureLifi` + `executeRoute` (browser-side `@lifi/sdk`).
- Checkout flow: select asset/chain → quote → execute → confirm.
- Fiat-display + per-chain price formatting via dashboard prices proxy.

## Public surface

App routes:

- `/(widget)/...` — embedded checkout widget.
- `/...` — top-level pages.
- `/api/...` — server-only routes (mostly thin proxies to dashboard `/api/orchestrate/*`).

This app is a **partial consumer** of `@dynamic-demos/dynamic` Phase 1D primitives — Phase 1D migrated the env-id resolution and singleton bootstrap; the 30+ bespoke SSR-safe wrappers (`getKrakenAccounts`, `getMultichainBalances`, etc.) keep their hand-rolled shapes for now (see `packages/dynamic/AGENTS.md` open questions).

## Required environment

- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` — per-app Dynamic env — optional.
- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID_DEFAULT` — workspace default.
- `NEXT_PUBLIC_DASHBOARD_URL` — dashboard origin for orchestration / quote calls.
- `NEXT_PUBLIC_APP_ENV` — `production` flips sandbox off.
- `LIFI_INTEGRATOR` — integrator string forwarded to LI.FI SDK — optional but recommended.

LI.FI API key + Coinbase + Iron credentials live at the **dashboard** (D-003) — never in this app.

## Theming

Currently uses `next-themes` for dark-mode toggle plus `@dynamic-demos/theme` types. Phase 4 migrates the brand-color overlay onto the visa-direct cookie + `<ThemeStyleTag>` pattern (D-008).

## Credentials

- **Dynamic:** per-app or workspace-default (D-003).
- **Fireblocks:** none.
- **Other providers:** none — LI.FI / Coinbase / Iron go through dashboard orchestration.

## Slots vs invariants

**Slots:** brand, supported chains/tokens (constrained by dashboard config + LI.FI chain table), checkout flow copy.

**Invariants:**

- All bridge / swap quotes go through dashboard `/api/orchestrate/swap` — never call LI.FI's REST API from the browser.
- Browser-side LI.FI SDK setup goes through `configureLifi` from `@dynamic-demos/lifi/sdk-config` — call once at app boot.
- Sandbox-by-default for the LI.FI environment seam (D-005), even though LI.FI sandbox/prod resolve to the same host today.
- Apps don't access Postgres (D-002).
- The user signs and submits the bridge tx — the app never holds keys.

## Data boundaries

- No Postgres.
- Redis: not used.
- User state → Dynamic user metadata.
- Canonical transactions → dashboard via orchestration; this app polls `/api/orchestrate/transactions/:id`.

## Deployment

- **Vercel project:** `dynamic-demos-checkouts`.
- **Root dir:** `apps/checkouts`.
- **Required env:** see above.
- **Owner:** demos team.
- **Dev port:** 4001.

## Integration map

**Imports:** `@dynamic-demos/dynamic`, `@dynamic-demos/ui`, `@dynamic-demos/utils`, `@dynamic-demos/theme`, `@dynamic-demos/types`, `@dynamic-demos/lifi`.
**Imported by:** none.

## Examples

```ts
// hooks/use-lifi/setup.ts
import { configureLifi } from "@dynamic-demos/lifi";
configureLifi(/* providers */, { integrator: process.env.LIFI_INTEGRATOR ?? "demo-checkouts" });
```

## Do / Don't

- Do: route quote + status reads through `/api/orchestrate/swap`. The dashboard owns LI.FI's API key (D-003).
- Do: call `configureLifi` once at app boot; the SDK self-registers.
- Don't: import `@dynamic-demos/lifi/client` (REST quote/status) from a browser bundle.
- Don't: wire LI.FI key directly into this app — the dashboard owns commodity-provider secrets (D-003).

## Open questions / known gaps

- Phase 4 migrates dark-mode + brand overlay onto the visa-direct cookie + SSR theme pattern (D-008).
- 30+ inline SSR-safe wrappers (`getKrakenAccounts`, etc.) retain bespoke shapes; consolidate when a third app needs the same wrappers.
- No real-network E2E in CI (D-023).
