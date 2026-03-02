/**
 * Submit Transaction Handler
 *
 * Submits a transaction with txHash, moves draft -> submitted.
 */

import {
  transactionService,
  checkoutService,
  userService,
} from "@/lib/services";
import { enqueueTransactionMonitor } from "@/lib/upstash/qstash";
import { NotFoundError } from "@/lib/errors";
import {
  submitTransactionSchema,
  parseWithSchema,
  type SubmitTransactionInput,
} from "@/lib/validation";
import type { Transaction } from "@/lib/types/dashboard";

export interface SubmitTransactionResult {
  transaction: Transaction;
  monitorId?: string;
}

export async function handleSubmitTransaction(
  rawInput: unknown
): Promise<SubmitTransactionResult> {
  const { checkoutId, txId, txHash } = parseWithSchema(
    submitTransactionSchema,
    rawInput
  );

  // Verify transaction exists and belongs to checkout
  const existing = await transactionService.get(txId);
  if (!existing || existing.checkoutId !== checkoutId) {
    throw new NotFoundError("Transaction not found");
  }

  // Submit the transaction
  const transaction = await transactionService.submit(txId, txHash);

  // Update or create user stats (non-critical)
  if (transaction.walletAddress) {
    try {
      const user = await userService.getOrCreateByWallet(
        checkoutId,
        transaction.walletAddress,
        transaction.fromChainId
      );
      await userService.updateStats(user.id, { transactionCount: 1 });
    } catch (err) {
      console.error("[submit-transaction] Failed to update user stats:", err);
    }
  }

  // Invalidate checkout stats cache
  await checkoutService.invalidateStats(checkoutId);

  // Enqueue background job to monitor transaction status
  const messageId = await enqueueTransactionMonitor(txId, txHash, 0);
  if (messageId) {
    console.log(`[submit-transaction] Enqueued monitor: ${messageId}`);
  }

  return { transaction, monitorId: messageId ?? undefined };
}

// Re-export types for route usage
export type { SubmitTransactionInput };
