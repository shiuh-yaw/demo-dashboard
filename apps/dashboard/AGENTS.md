---
name: "@dynamic-demos/dashboard"
kind: app
flow_role: utility
custody: mixed
status: stable
---

# @dynamic-demos/dashboard

The operator orchestrator for the Dynamic Demos monorepo (D-001). Demo creators sign in here to provision and manage demos; demo apps call dashboard `/api/orchestrate/*` endpoints for any non-Dynamic / non-Fireblocks provider operation; partner webhooks land here. Dashboard is the **single home** for Postgres access (D-015), commodity-provider secrets (D-003), and canonical persistence (D-011).

## Capabilities

- Operator UI for demo creators (per-demo-type forms under `/brands`, `/remittance`, `/checkouts`, `/earns`, `/trade`, `/visa-direct`, `/wallets`, `/widgets`).
- Orchestration API (`/api/orchestrate/*`) — quotes, onramp, offramp, swap, transactions, wallet verify (Phase 5B; partial today).
- Per-provider HTTP endpoints used by demo apps: `blindpay`, `iron`, `coinbase`, `checkouts`, `earns`, `remittance`, `trade`, `visa-direct`, `wallets`, `widgets`.
- Webhook receivers (per-provider, raw-body parsing + signature verification + dedup + DB persistence + optional QStash fan-out) — Phase 5A wires the framework.
- Cron jobs (`/api/cron/...`) for recurring tasks.
- Internal admin routes under `/api/internal/...`.
- Documentation surfaces under `/documentation`.

## Public surface

App routes (operator UI):

- `/` — landing.
- `/brands` — brand records (D-007 / Phase 2-brands).
- `/remittance`, `/checkouts`, `/earns`, `/trade`, `/visa-direct`, `/wallets`, `/widgets` — per-demo-type config + history.
- `/documentation` — runbooks and policy.

API namespaces (server):

- `/api/orchestrate/*` — orchestration endpoints called by demo apps (D-001).
- `/api/<provider>/*` — per-provider operator endpoints (`blindpay`, `iron`, `coinbase`, etc.).
- `/api/webhooks/<provider>` — provider webhook receivers (Phase 5A).
- `/api/cron/<job>` — Vercel Cron jobs.
- `/api/internal/<surface>` — internal admin endpoints.

## Required environment

- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` — dashboard's **own** Dynamic env (D-004) — required.
- `DATABASE_URL` — Supabase pooler URL — required (D-013).
- `DIRECT_URL` — Supabase direct URL for migrations — required.
- Provider keys (D-003): `IRON_API_KEY`, `BLINDPAY_API_KEY` + `BLINDPAY_INSTANCE_ID`, `COINBASE_ONRAMP_API_KEY` + `COINBASE_ONRAMP_API_SECRET`, `LIFI_API_KEY`, `ALFREDPAY_API_KEY`. Sandbox-by-default (D-005).
- Webhook secrets per provider (`*_WEBHOOK_SECRET`) — required when wiring receivers in Phase 5A.
- `FIREBLOCKS_API_KEY` / `FIREBLOCKS_API_SECRET` — for Trading Orders + DVP flows.
- `NEXT_PUBLIC_APP_ENV` — `production` flips sandbox flags off across all wired providers.

## Theming

Dashboard uses its own internal styling — it is the operator UI, not a customer-facing demo. The `--brand-*` SSR pattern (D-008) does not apply.

## Credentials

- **Dashboard's Dynamic env is distinct** from demo-app envs (D-004). When demo apps call `/api/orchestrate/...`, they pass `x-dynamic-environment-id: <demo-app-env>` header; dashboard verifies the JWT against THAT env's JWKS. The dashboard is JWT-multi-tenant.
- **All non-Dynamic / non-Fireblocks provider secrets live here**. Demo apps don't see Iron / BlindPay / alfredPay / Coinbase / LI.FI keys (D-003).
- **Fireblocks**: dashboard owns the Trading Orders client + DVP flows for partners that wrap into Fireblocks Network listings (D-009).

## Slots vs invariants

**Slots:** demo-type list (per-route additions), brand records (D-007), per-instance config records, supported corridors per provider.

**Invariants:**

- Dashboard is the **only** consumer of `@dynamic-demos/db` (D-015). Demo apps fetch via HTTP.
- Webhooks land **only here** (D-011). Demo apps poll `GET /api/orchestrate/transactions/:id`.
- All provider state mappings go through `@dynamic-demos/transactions` helpers when persisting (D-010). No raw `state` assignment.
- Sandbox-by-default (D-005). Production opt-in requires `[prod-creds]` PR title.
- Dashboard's Dynamic env stays distinct from any demo app's env (D-004). Never collapse contexts.
- Mock-mode data lives in **Dynamic user metadata** at the demo-app side, not in dashboard (the canonical state-tracking shouldn't see mock writes — see `apps/trade`, `apps/earn`).

## Data boundaries

- **Postgres (Supabase) via `@dynamic-demos/db`** — the only Postgres consumer in the monorepo (D-015).
- **Redis (QStash)** — webhook fan-out + cron tasks (Phase 5A).
- **Provider event log** — `WebhookEvent` table (Phase 2-transactions + Phase 5A).
- **Canonical transactions** — `transactions` table referenced by `demoInstanceId`, `brandId`, `parentTransactionId` (Phase 2-transactions).

## Deployment

- **Vercel project:** `dynamic-demos-dashboard`.
- **Root dir:** `apps/dashboard`.
- **Required env:** see above. All commodity-provider keys + webhook secrets are server-only.
- **Custom domain:** TBD (preview URL stable for operators today).
- **Owner:** demos team.
- **Dev port:** 4000 (`pnpm dev:dashboard`).

## Integration map

**Imports:** `@dynamic-demos/dynamic`, `@dynamic-demos/ui`, `@dynamic-demos/utils`, `@dynamic-demos/theme`, `@dynamic-demos/types`, `@dynamic-demos/transactions`, `@dynamic-demos/db` (only consumer), `@dynamic-demos/blindpay`, `@dynamic-demos/coinbase-onramp`, `@dynamic-demos/iron`, `@dynamic-demos/lifi`, `@dynamic-demos/fireblocks`.
**Imported by:** none.

## Examples

```ts
// apps/dashboard/src/app/api/orchestrate/transactions/[id]/route.ts (sketch)
import { prisma } from "@dynamic-demos/db";
import { TransactionState } from "@dynamic-demos/transactions";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const tx = await prisma.transaction.findUniqueOrThrow({ where: { id: params.id } });
  return Response.json({ id: tx.id, state: tx.state as TransactionState });
}
```

## Do / Don't

- Do: keep all commodity-provider secrets in dashboard env (D-003). Apps should never see them.
- Do: route every state change through `@dynamic-demos/transactions` helpers (D-010).
- Do: keep webhook receivers per-provider (not dynamic `[provider]`) so each gets its own raw-body parsing + IP allowlist (D-011).
- Don't: collapse the dashboard's Dynamic env with a demo app's (D-004). Verify each demo's JWT against its own JWKS.
- Don't: import `@dynamic-demos/db` from any app other than this one (D-015).
- Don't: bypass `@dynamic-demos/transactions` helpers when updating state — direct assignment breaks invariants.

## Open questions / known gaps

- Phase 5A wires the webhook framework against the verifiers + normalisers exposed by every provider package. Receivers are stubs today.
- Phase 5B fills out the `/api/orchestrate/*` namespace beyond the partial coverage shipped to date.
- Phase 5C lands dashboard scaffolding templates that auto-generate per-demo-type sections from the demo registry.
- Phase 2-brands lands the `Brand` Prisma model; Phase 2-transactions lands `Transaction` + `WebhookEvent`.
- Mock-mode-aware orchestration: when demo apps emit "this was a mock action" events, dashboard should ignore them rather than persist a real transaction. Pattern needs codifying once a third app adopts mock mode.
