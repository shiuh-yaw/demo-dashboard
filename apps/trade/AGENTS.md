---
name: "@dynamic-demos/trade"
kind: app
flow_role: wallet
custody: non-custodial
status: stable
---

# @dynamic-demos/trade

Multi-surface trading + prediction-market demo. End users sign in via Dynamic, browse markets sourced from CoinGecko (spot tokens) and Polymarket (event markets), execute swaps, and view a unified portfolio. The app's mock-mode pattern (Dynamic-metadata-backed) is the reference implementation for in-flight earn-style demos.

## Capabilities

- Email-OTP + social login (Dynamic).
- Token market list + per-token detail page (`/trade/...`).
- Prediction markets — Polymarket events + per-event detail (`/predictions/...`).
- Token swaps + spot trades (planned: dashboard `/api/orchestrate/swap` integration).
- Portfolio dashboard with "Positions" tab spanning trade / earn / predict mock positions.
- Mock mode (wallet dropdown toggle) — actions persist into Dynamic user metadata, gated by `useMockMode()`.

## Public surface

App routes:

- `/(auth)/login`.
- `/(app)/trade/...` — token list + detail.
- `/(app)/predictions/...` — Polymarket event list + detail.
- `/(app)/portfolio` — unified positions across earn/trade/predict (mock + real).
- `/api/trade/{historical,market,metadata,prices,token-stats}/...` — server-only Alchemy/CoinGecko/Polymarket proxies.

Cookie / header contract (D-008): `?id=<configId>` → cookie `trade_config_id` → header `x-trade-config-id` → dashboard config fetch.

## Required environment

- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` — per-app Dynamic env — optional.
- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID_DEFAULT` — workspace default.
- `ALCHEMY_API_KEY` — server-only — required.
- `COIN_GECKO_API_KEY` — server-only — optional but recommended.
- `NEXT_PUBLIC_DASHBOARD_URL` — dashboard origin (for swap orchestration).
- `NEXT_PUBLIC_APP_ENV` — `production` flips sandbox off.

Polymarket public API needs no key.

## Theming

`createDemoMiddleware` + SSR `<ThemeStyleTag>` per D-008.

## Credentials

- **Dynamic:** per-app or workspace-default (D-003).
- **Fireblocks:** none.
- **Other providers:** none — LI.FI swap orchestration runs through dashboard (D-003).

## Mock mode

Trade extends the canonical mock-mode pattern (originated in `apps/earn`, see D-022 mock-data). When `useMockMode().isMockMode` is true:

- Real transactions are skipped; the action calls `useUpdateMetadata().mutateAsync()` with the new data merged into the appropriate Dynamic user-metadata key.
- Mock metadata keys live in `apps/trade/lib/mock-metadata.ts` — `MockTradeMetadata` and `MockPredictMetadata` shapes mirror the action surface.
- A "My X" section renders only when mock mode is on and there's data; reads from `metadata[MOCK_METADATA_KEYS.TRADE]` / `metadata[MOCK_METADATA_KEYS.PREDICT]`.
- The Portfolio "Positions" tab surfaces mock positions per type with a labeled badge ("Earn", "Trade", "Predict").

This pattern is **the reference** for any future demo that needs a metadata-backed mock mode. Don't `localStorage` it — cross-device consistency is the point.

## Slots vs invariants

**Slots:** brand, token list (CoinGecko cohort), Polymarket tag set (curated `POLYMARKET_TAG_SLUGS`).

**Invariants:**

- Mock-mode state lives in Dynamic user metadata. Never `localStorage`.
- Real swaps go through dashboard `/api/orchestrate/swap` — never call LI.FI directly from this app.
- Apps don't access Postgres (D-002). Polymarket / CoinGecko data is read-only and fetched server-side.
- Read-only provider data (CoinGecko / Polymarket) flows through `app/api/*` proxies so cache control + key handling stay server-side.
- Sandbox-by-default (D-005).

## Data boundaries

- No Postgres.
- Redis: not used.
- User state (mock positions, defaults) → Dynamic user metadata.
- Read-only market data → CoinGecko + Polymarket via server-only proxies.

## Deployment

- **Vercel project:** `dynamic-demos-trade`.
- **Root dir:** `apps/trade`.
- **Required env:** see above.
- **Owner:** demos team.
- **Dev port:** 4005.

## Integration map

**Imports:** `@dynamic-demos/dynamic`, `@dynamic-demos/ui`, `@dynamic-demos/utils`, `@dynamic-demos/theme`, `@dynamic-demos/types`, `@dynamic-demos/alchemy`, `@dynamic-demos/coingecko`, `@dynamic-demos/polymarket`, `@dynamic-demos/fireblocks`.
**Imported by:** none.

## Examples

```ts
// Mock-mode action gating (canonical pattern)
import { useMockMode } from "@/contexts/mock-mode-context";
import { useUpdateMetadata, useUserMetadata } from "@/hooks";
import { MOCK_METADATA_KEYS } from "@/lib/mock-metadata";

const { isMockMode } = useMockMode();
const updateMetadata = useUpdateMetadata();

if (isMockMode) {
  const existing = (metadata[MOCK_METADATA_KEYS.TRADE]?.positions ?? []) as MockPosition[];
  await updateMetadata.mutateAsync({ trade: { positions: [...existing, newPosition] } });
  return "mock-tx";
}
// else: real swap via dashboard /api/orchestrate/swap
```

## Do / Don't

- Do: persist mock state in Dynamic user metadata (`metadata.trade`, `metadata.predict`) — never `localStorage`.
- Do: keep Polymarket + CoinGecko reads server-side via `app/api/trade/*`.
- Do: surface a clear "mock" badge in any UI showing mocked positions.
- Don't: branch real-vs-mock logic ad-hoc; funnel through `useMockMode()` per the earn-style pattern.
- Don't: call LI.FI's REST API directly — go through dashboard orchestration.

## Open questions / known gaps

- Real swap execution still needs Phase 5B's dashboard `/api/orchestrate/swap` to land. Until then, swap actions are mock-mode only.
- `MockTradeMetadata` and `MockPredictMetadata` shapes are still maturing as new actions land; expect minor additive changes per PR.
- Phase 4 migrates leftover `--widget-*` to `--brand-*`.
