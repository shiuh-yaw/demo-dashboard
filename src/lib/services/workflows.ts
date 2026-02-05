/**
 * Service Workflows
 *
 * Reusable operations that combine multiple services.
 * These workflows handle cleanup operations that span multiple services.
 */

import { transactionService, checkoutService } from "./index";
import { Status, type TransactionStatus } from "@/lib/types/dashboard";

/**
 * Mark a transaction as stale (abandoned/expired) with all side effects.
 * Used by background cleanup jobs.
 */
export async function markTransactionStaleWithEffects(params: {
  transactionId: string;
  checkoutId: string;
  previousStatus: TransactionStatus;
  newStatus: typeof Status.ABANDONED | typeof Status.EXPIRED;
}): Promise<void> {
  const { transactionId, checkoutId, newStatus } = params;

  // Use explicit transition methods
  if (newStatus === Status.ABANDONED) {
    await transactionService.markAbandoned(transactionId);
  } else {
    await transactionService.markExpired(transactionId);
  }

  // Invalidate checkout stats
  await checkoutService.invalidateStats(checkoutId);
}
