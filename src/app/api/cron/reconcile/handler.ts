/**
 * Reconciliation Handler
 *
 * Business logic for transaction reconciliation:
 * 1. Re-enqueue stale pending transactions
 * 2. Mark old draft transactions as abandoned
 * 3. Mark old initialized transactions as expired
 */

import { transactionService } from "@/lib/services";
import { markTransactionStaleWithEffects } from "@/lib/services/workflows";
import { enqueueTransactionMonitor } from "@/lib/upstash/qstash";
import { Status, type Transaction } from "@/lib/types/dashboard";

// Configuration - could be moved to env vars for flexibility
const CONFIG = {
  /** Re-enqueue pending transactions older than this (ms) */
  stalePendingMs: 5 * 60 * 1000, // 5 minutes
  /** Mark drafts as abandoned after this (ms) */
  abandonedDraftMs: 60 * 60 * 1000, // 1 hour
  /** Mark initialized as expired after this (ms) */
  expiredInitializedMs: 24 * 60 * 60 * 1000, // 24 hours
};

export interface ReconcileResult {
  success: boolean;
  results: {
    reenqueued: number;
    abandoned: number;
    expired: number;
    errors: string[];
  };
  timestamp: string;
  error?: string;
}

/**
 * Re-enqueue stale pending transactions for status monitoring
 */
async function reenqueueStalePending(
  pendingTxs: Transaction[],
  now: number
): Promise<{ count: number; errors: string[] }> {
  let count = 0;
  const errors: string[] = [];

  for (const tx of pendingTxs) {
    const age = now - new Date(tx.updatedAt).getTime();

    if (age > CONFIG.stalePendingMs && tx.txHash) {
      try {
        await enqueueTransactionMonitor(tx.id, tx.txHash, tx.retryCount || 0);
        count++;
      } catch (error) {
        errors.push(`Failed to re-enqueue ${tx.id}: ${error}`);
      }
    }
  }

  return { count, errors };
}

/**
 * Mark old drafts as abandoned and old initialized as expired
 */
async function markStaleTransactions(
  checkoutIds: Set<string>,
  now: number
): Promise<{ abandoned: number; expired: number; errors: string[] }> {
  let abandoned = 0;
  let expired = 0;
  const errors: string[] = [];

  for (const checkoutId of checkoutIds) {
    const { items: transactions } = await transactionService.list(checkoutId, {
      status: [Status.DRAFT, Status.INITIALIZED],
      pageSize: 100,
    });

    for (const tx of transactions) {
      const age = now - new Date(tx.createdAt).getTime();

      if (tx.status === Status.DRAFT && age > CONFIG.abandonedDraftMs) {
        try {
          await markTransactionStaleWithEffects({
            transactionId: tx.id,
            checkoutId: tx.checkoutId,
            previousStatus: tx.status,
            newStatus: Status.ABANDONED,
          });
          abandoned++;
        } catch (error) {
          errors.push(`Failed to mark ${tx.id} as abandoned: ${error}`);
        }
      }

      if (
        tx.status === Status.INITIALIZED &&
        age > CONFIG.expiredInitializedMs
      ) {
        try {
          await markTransactionStaleWithEffects({
            transactionId: tx.id,
            checkoutId: tx.checkoutId,
            previousStatus: tx.status,
            newStatus: Status.EXPIRED,
          });
          expired++;
        } catch (error) {
          errors.push(`Failed to mark ${tx.id} as expired: ${error}`);
        }
      }
    }
  }

  return { abandoned, expired, errors };
}

/**
 * Main reconciliation handler
 */
export async function handleReconcile(): Promise<ReconcileResult> {
  const now = Date.now();
  const results = {
    reenqueued: 0,
    abandoned: 0,
    expired: 0,
    errors: [] as string[],
  };

  try {
    // 1. Get all pending transactions
    const pendingTxs = await transactionService.getPending();

    // 2. Re-enqueue stale pending transactions
    const reenqueueResult = await reenqueueStalePending(pendingTxs, now);
    results.reenqueued = reenqueueResult.count;
    results.errors.push(...reenqueueResult.errors);

    // 3. Get checkout IDs from pending transactions
    const checkoutIds = new Set(pendingTxs.map((tx) => tx.checkoutId));

    // 4. Mark stale drafts/initialized transactions
    const staleResult = await markStaleTransactions(checkoutIds, now);
    results.abandoned = staleResult.abandoned;
    results.expired = staleResult.expired;
    results.errors.push(...staleResult.errors);

    console.log(
      `[Reconcile] Complete: ${results.reenqueued} reenqueued, ${results.abandoned} abandoned, ${results.expired} expired, ${results.errors.length} errors`
    );

    return { success: true, results, timestamp: new Date().toISOString() };
  } catch (error) {
    console.error("[Reconcile] Fatal error:", error);
    return {
      success: false,
      results,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
