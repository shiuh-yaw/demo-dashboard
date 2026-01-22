/**
 * Service Workflows
 *
 * Reusable operations that combine multiple services.
 * These handle common patterns like "update status + publish + invalidate".
 */

import { transactionService, checkoutService, userService } from "./index";
import {
  Status,
  type TransactionStatus,
  type Transaction,
} from "@/lib/types/dashboard";

/**
 * Update transaction status with all side effects:
 * 1. Update the transaction status in database
 * 2. Invalidate checkout stats cache (for meaningful status changes)
 * 3. Optionally update user stats on completion
 */
export async function updateTransactionStatusWithEffects(params: {
  transactionId: string;
  checkoutId: string;
  status: TransactionStatus;
  previousStatus: TransactionStatus;
  txHash?: string;
  errorMessage?: string;
  /** LI.FI explorer URL for the transaction */
  explorerUrl?: string;
  /** Update user success stats (for confirmed status) */
  updateUserStats?: boolean;
  /** Existing transaction (optional, to avoid redundant fetch) */
  existingTransaction?: Transaction;
}): Promise<Transaction> {
  const {
    transactionId,
    checkoutId,
    status,
    previousStatus,
    txHash,
    errorMessage,
    explorerUrl,
    updateUserStats = false,
    existingTransaction,
  } = params;

  // 1. Get existing transaction if not provided (avoids redundant fetch)
  const transactionToUpdate =
    existingTransaction || (await transactionService.get(transactionId));
  if (!transactionToUpdate) {
    throw new Error(`Transaction ${transactionId} not found`);
  }

  // 2. Update transaction status (pass existing transaction to avoid redundant fetch)
  const transaction = await transactionService.updateStatus(
    transactionId,
    status,
    errorMessage,
    transactionToUpdate,
    explorerUrl
  );

  // 3. Invalidate checkout stats (only for status changes that affect stats)
  // Skip for initialized status as it's a reset operation, not a meaningful status change
  // Also skip if status hasn't actually changed (idempotent calls)
  if (status !== Status.INITIALIZED && status !== previousStatus) {
    // Fire and forget - don't block the response on cache invalidation
    checkoutService.invalidateStats(checkoutId).catch((err) => {
      console.error("[Workflow] Failed to invalidate stats:", err);
    });
  }

  // 4. Update user stats on successful completion
  if (
    updateUserStats &&
    status === Status.CONFIRMED &&
    transaction.walletAddress
  ) {
    try {
      const user = await userService.findByWallet(transaction.walletAddress);
      if (user) {
        await userService.updateStats(user.id, {
          successfulTransactionCount: 1,
        });
      }
    } catch (err) {
      console.error("[Workflow] Failed to update user stats:", err);
      // Don't throw - user stats are non-critical
    }
  }

  // Return the updated transaction so callers don't need to fetch again
  return transaction;
}

/**
 * Mark a transaction as stale (abandoned/expired) with all side effects
 */
export async function markTransactionStaleWithEffects(params: {
  transactionId: string;
  checkoutId: string;
  previousStatus: TransactionStatus;
  newStatus: typeof Status.ABANDONED | typeof Status.EXPIRED;
}): Promise<void> {
  const { transactionId, checkoutId, previousStatus, newStatus } = params;

  // 1. Mark as stale
  await transactionService.markStale(transactionId, newStatus);

  // 2. Invalidate checkout stats
  await checkoutService.invalidateStats(checkoutId);
}
