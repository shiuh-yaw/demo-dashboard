# Extend Mock Mode to Other Actions

## Context

This app has a **mock mode** toggle (wallet dropdown). When enabled, actions are mocked instead of executed on-chain. Mock data is stored in localStorage under key `trade-mock-metadata` with top-level keys: `balances`, `trade`, `earn`, `predict`.

**Single source of truth for balances:**
- `balances` holds per-token amounts (`{ [symbol]: { amount: number } }`), initialized once when mock mode is first enabled
- Portfolio, Trade/Swap, Predict, and Earn all read from and update these balances
- Use `useMockBalances()` for `getBalance`, `deductBalance`, `addBalance`, `totalUsd`

**Already implemented for Earn:**
- Vault deposits are mocked and stored under `earn.deposits`
- "My Vaults" section above the vault list shows positions from metadata
- My Vault modal supports deposit and withdraw on mocked positions
- Portfolio dashboard "Positions" tab lists mock earn positions (when mock mode is on), each with an "Earn" badge

## Task

Apply the same pattern to other actions in the app. For each action area:

1. **Identify the action** (e.g. trade/swap, prediction market bet)
2. **Define the metadata shape** under the right key (`trade`, `predict`) in `apps/trade/lib/mock-metadata.ts`
3. **Mock the action** so that when `useMockMode().isMockMode` is true, it:
   - Skips the real transaction/API call
   - Calls `useMockMetadata().updateMetadata.mutateAsync()` with the new data merged into the correct metadata key
   - Returns a mock success value (e.g. `"mock-tx"`)
4. **Add a "My X" section** that:
   - Renders only when `isMockMode` is true and there is data
   - Reads from `metadata[MOCK_METADATA_KEYS.TRADE]` or `metadata[MOCK_METADATA_KEYS.PREDICT]` via `useMockMetadata()`
   - Shows enough fields to display the mocked items
5. **Support the same actions** as the real flow (e.g. if real allows buy/sell, mock should allow buy/sell on mocked positions)
6. **List mock positions on the Portfolio dashboard** – The "Positions" tab on the Portfolio page (`apps/trade/app/(app)/portfolio/page.tsx`) must display all mock positions for that action type. When mock mode is on and there is data, show the positions; otherwise show "No open positions". Each position should link to the relevant page (e.g. earn positions → `/earn`). **Include a type indicator** (e.g. "Earn", "Trade", "Predict" badge) so users can tell what kind of position it is.

## Reference Implementation

- **Mock metadata storage:** localStorage under key `trade-mock-metadata` (no API calls)
- **Mock context:** `useMockMode()` from `@/contexts/mock-mode-context`
- **Metadata hook:** `useMockMetadata()` from `@/hooks/use-mock-metadata` – returns `{ metadata, updateMetadata }`
- **Balances hook:** `useMockBalances()` from `@/hooks/use-mock-balances` – returns `{ getBalance, deductBalance, addBalance, totalUsd }`; initializes balances once when mock mode is on and empty
- **Metadata merge:** Top-level keys are merged; nested objects (e.g. `earn.deposits`) are replaced when you send them
- **Metadata types:** `apps/trade/lib/mock-metadata.ts` – extend `MockTradeMetadata` and `MockPredictMetadata` with the needed shapes

## Example Pattern (from Earn)

```ts
// 1. In use-deposit-vault or similar: check isMockMode first
if (isMockMode) {
  const { metadata, updateMetadata } = useMockMetadata();
  const existing = metadata.earn?.deposits ?? [];
  const updated = [...existing, newPosition];
  await updateMetadata.mutateAsync({
    earn: { deposits: updated },
  });
  return "mock-tx";
}
// else: real on-chain logic
```

```ts
// 2. My Vaults section: only when mock mode + has data
const { metadata } = useMockMetadata();
const deposits = metadata.earn?.deposits ?? [];
if (!isMockMode || deposits.length === 0) return null;
```

## Areas to Extend

- **Trade:** Swaps, limit orders, or other trade actions
- **Predict:** Prediction market positions (bets, positions, outcomes)

For each area, follow the same flow: mock the action, store under the right metadata key, add a "My X" section, support the same actions in mock mode, and list positions on the Portfolio dashboard.
