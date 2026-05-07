---
name: "@dynamic-demos/spark26"
kind: app
flow_role: checkout
custody: mixed
status: stable
---

# @dynamic-demos/spark26

Production sales-tools demo. Customer-facing storefront + admin surface backed by Redis order state and a local Dynamic auth shim. **This app is production-grade and zero-touch** — see the next section.

## Important: spark26 zero-touch

Spark26 is production. Source files under `apps/spark26/` must not be modified except via PRs explicitly titled `[spark26]` (CI-enforced). This applies to all Phase 1–7 work in the demo meta-system project.

Spark26 uses local primitives that diverge from monorepo conventions:

- Local Dynamic helpers in `lib/dynamic/server.ts` (not `@dynamic-demos/dynamic`).
- Local `lib/types/order-state.ts` state machine (not `@dynamic-demos/transactions`).
- Local `lib/store/order-store.ts` (Redis, not Postgres).
- Local theme in `app/globals.css` (not the `--brand-*` contract).

These are preserved by exception (D-006). To converge, schedule a separate planned project with its own QA gate.

## Capabilities

- Storefront product listing + checkout.
- Admin order management surface.
- Redis-backed order state machine (local, not the canonical `@dynamic-demos/transactions`).
- Custom font loading (`fonts.ts`, `fonts/`).
- Local Dynamic auth helpers + JWT verification.

## Public surface

App routes:

- `/` — storefront landing.
- `/admin` — operator surface.
- `/api/...` — server-only order/checkout/webhook routes.
- `/actions/...` — server actions.

The package itself imports from `@dynamic-demos/theme`, `@dynamic-demos/types`, `@dynamic-demos/ui`, but the auth + state-machine + storage layers stay local by design.

## Required environment

Spark26 documents its own env in its own runbooks; the AGENTS.md does not enumerate the full list because:

1. It's production — env values ship from Vercel, not committed examples.
2. Modifying env-related code requires a `[spark26]` PR.

The shape includes Dynamic env id, Redis URL, Fireblocks credentials, and per-product configuration. See `apps/spark26/lib/env.ts` for the canonical schema.

## Theming

**Local theme**, in `app/globals.css`. Does not use the `--brand-*` contract or `<ThemeStyleTag>` pattern. By exception (D-006). Future-converging spark26 onto `--brand-*` would be a separate planned project.

## Credentials

- **Dynamic:** per-app env id (production environment — not workspace default).
- **Fireblocks:** per-app credentials.
- **Other providers:** spark26 manages its own provider keys via local helpers.

## Slots vs invariants

**Slots:** product list, copy, brand-adjacent visual choices that don't require code changes.

**Invariants:**

- Zero-touch source per D-006. Modifications require an explicit `[spark26]` PR title.
- Order-state machine is local — the canonical `@dynamic-demos/transactions` package does not apply here.
- Redis is the persistence layer; no Postgres.
- Theme variables are local; `--brand-*` migration is out of scope.

## Data boundaries

- No Postgres.
- **Redis** is the canonical store for order state.
- User state → Dynamic user metadata.
- Webhook events → local handlers; not the dashboard webhook framework.

## Deployment

- **Vercel project:** spark26 production project (`dynamic-xyz/spark26`).
- **Auto-deploy:** GitHub integration on `main` — every merge that lands a `[spark26]`-titled commit triggers a Production deployment.
- **Root dir:** `apps/spark26`.
- **Required env:** managed in Vercel; see local runbooks.
- **Custom domain:** production domain — managed by spark26 ops.
- **Owner:** spark26 team.
- **Dev port:** see `pnpm dev:spark26` in repo root `package.json`.

## Integration map

**Imports:** `@dynamic-demos/theme`, `@dynamic-demos/types`, `@dynamic-demos/ui` (only — no `@dynamic-demos/dynamic`, no `@dynamic-demos/transactions`).
**Imported by:** none.

## Examples

Out of scope for this AGENTS.md — spark26 internal code is the source of truth and modifying it requires a `[spark26]` PR.

## Do / Don't

- Do: route any spark26 source change through a `[spark26]`-titled PR with explicit owner sign-off.
- Do: keep the local Dynamic / order-state / Redis / theme primitives as-is until a separate planned convergence project starts.
- Don't: migrate spark26 to `@dynamic-demos/dynamic`, `@dynamic-demos/transactions`, or the `--brand-*` theme contract during any Phase 1–7 work.
- Don't: wire spark26 into the dashboard webhook framework (Phase 5A) without an `[spark26]` PR.

## Open questions / known gaps

- Convergence to the canonical primitives (auth, transactions, theme) is a separate planned project; not in scope for the demo meta-system Phases 1–7.
- This PR is the only Phase 3 work touching `apps/spark26/`. The PR title carries `[spark26]` per D-006 / CI gate.
