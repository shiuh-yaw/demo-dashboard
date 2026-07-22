/**
 * Milestone-wrapped async flows - GTM Phase 09.
 *
 * Pure wrappers so "fires on success, not on failure" is unit-testable
 * without rendering the (heavy) screen components that call them. `milestone`
 * is `useTrack().milestone` - fire-and-forget, never awaited.
 */

import type { WalletMilestone } from "./milestones";

type MilestoneFn = (name: WalletMilestone, props?: Record<string, unknown>) => void;

/**
 * Emits `send_initiated` before `sendFn`, and `send_completed` only after
 * `sendFn` resolves. A rejection propagates without emitting
 * `send_completed`.
 */
export async function trackedSend<T>(
  milestone: MilestoneFn,
  asset: string,
  amount: string,
  sendFn: () => Promise<T>,
): Promise<T> {
  milestone("send_initiated", { asset, amount });
  const result = await sendFn();
  milestone("send_completed", { asset, amount });
  return result;
}

/**
 * Emits `backup_completed` only after `backupFn` resolves. A rejection
 * propagates without emitting `backup_completed`.
 */
export async function trackedBackup<T>(
  milestone: MilestoneFn,
  backupFn: () => Promise<T>,
): Promise<T> {
  const result = await backupFn();
  milestone("backup_completed");
  return result;
}
