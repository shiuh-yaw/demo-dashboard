---
name: "@dynamic-demos/types"
kind: package
flow_role: utility
custody: n/a
status: stable
---

# @dynamic-demos/types

Shared TypeScript primitives consumed by every demo app and most other workspace packages. Pure types and small enums — no runtime code, no side effects.

## Capabilities

- Theme primitives: `BorderRadiusSize` (`xs | sm | md | lg`), `Brand` (`"dynamic" | "custom"`).
- Chain primitives: `Chain` (`"EVM" | "SOL"`), `SettlementConfig`.
- Branding primitive: `BaseBranding`.
- API envelopes: `ApiResponse<T>`, `PaginatedResponse<T>`.
- Timestamp helpers: `Timestamped`, `Completable`.

## Public surface

All exports are stable and live at `@dynamic-demos/types` (single barrel).

- `BorderRadiusSize`, `Brand` (theme tokens — stable).
- `Chain`, `SettlementConfig` (chain + token references — stable).
- `BaseBranding` (logo + name + `showPoweredBy` — stable).
- `ApiResponse<T>`, `PaginatedResponse<T>` (HTTP response envelopes — stable).
- `Timestamped`, `Completable` (record timestamps — stable).

There are no internal exports today; the package contains exactly what the index re-exports.

## Required environment

None. Types-only package.

## Slots vs invariants

**Slots:**

- New shared types added in PRs that introduce them. Add the type, add JSDoc, ship in the same PR.

**Invariants:**

- No runtime code. The package compiles to types-only. Adding any executable code is a cross-package contract violation.
- Public types must remain backward-compatible inside a major version. Renames or removals break dozens of consumers; favour additive change.
- Cross-package types only; per-package types live in the consuming package.

## Integration map

**Imports:** none.
**Imported by:** `@dynamic-demos/theme`, `@dynamic-demos/ui`, most `apps/*` demos (checkouts, dashboard, earn, remittance, spark26, trade, wallet — varies per app).

## Examples

```ts
import type { ApiResponse, SettlementConfig } from "@dynamic-demos/types";

export async function fetchQuote(): Promise<ApiResponse<{ quoteId: string }>> {
  const res = await fetch("/api/orchestrate/quotes", { method: "POST" });
  return res.json();
}

const settlement: SettlementConfig = {
  chain: "EVM",
  chainId: 8453,
  chainName: "Base",
  tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  tokenSymbol: "USDC",
  decimals: 6,
};
```

## Do / Don't

- Do: add cross-package types here when more than one app needs them.
- Do: keep types primitive — no class types, no namespaces, no decorators.
- Don't: add runtime code, even a constant. If a value is needed at runtime, ship it from `@dynamic-demos/utils` and re-export the type alone.
- Don't: import provider-specific types here. Per-provider types live in `packages/<provider>/`.

## Open questions / known gaps

- Once `packages/db` exposes Brand / Transaction Prisma models (Phase 2), some of the in-flight types here may move there. Evaluate after 2-brands and 2-transactions merge.
- `SettlementConfig` does not yet capture LI.FI's chain-id encoding for non-EVM (Solana). Consider widening when checkouts adds another non-EVM chain.
