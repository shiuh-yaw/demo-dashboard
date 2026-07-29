/**
 * Milestone-wrapped async flows - GTM instrumentation.
 *
 * Pure wrappers so "fires on success, not on failure" is unit-testable
 * without rendering the screen components that call them. `milestone` is
 * `useTrack().milestone` - fire-and-forget, never awaited.
 */

import type { CardMilestone } from "./milestones";

type MilestoneFn = (name: CardMilestone, props?: Record<string, unknown>) => void;

/**
 * Emits `deposit_initiated` before `depositFn`, and `deposit_completed` only
 * after `depositFn` resolves. A rejection propagates without emitting
 * `deposit_completed`.
 */
export async function trackedDeposit<T>(
  milestone: MilestoneFn,
  amount: string,
  depositFn: () => Promise<T>,
): Promise<T> {
  milestone("deposit_initiated", { amount });
  const result = await depositFn();
  milestone("deposit_completed", { amount });
  return result;
}
