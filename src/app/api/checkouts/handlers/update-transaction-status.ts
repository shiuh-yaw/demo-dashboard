/**
 * Update Transaction Status Handler
 *
 * Updates the status of a transaction with side effects.
 */

import { transactionService } from "@/lib/services";
import { updateTransactionStatusWithEffects } from "@/lib/services/workflows";
import { NotFoundError } from "@/lib/errors";
import { Status } from "@/lib/types/dashboard";
import {
  updateTransactionStatusSchema,
  parseWithSchema,
  type UpdateTransactionStatusInput,
  type TransactionStatusResponse,
} from "@/lib/validation";

export async function handleUpdateTransactionStatus(
  rawInput: unknown
): Promise<TransactionStatusResponse> {
  // Validate input with Zod
  const { checkoutId, txId, status, errorMessage } = parseWithSchema(
    updateTransactionStatusSchema,
    rawInput
  );

  // Verify transaction exists and belongs to checkout
  const existing = await transactionService.get(txId);
  if (!existing || existing.checkoutId !== checkoutId) {
    throw new NotFoundError("Transaction not found");
  }

  // Use workflow for consistent side effects
  // Pass existing transaction to avoid redundant fetches
  const transaction = await updateTransactionStatusWithEffects({
    transactionId: txId,
    checkoutId,
    status,
    previousStatus: existing.status,
    errorMessage,
    updateUserStats: status === Status.CONFIRMED,
    existingTransaction: existing,
  });
  if (!transaction) {
    throw new NotFoundError("Transaction not found after update");
  }

  return {
    id: transaction.id,
    status: transaction.status,
    txHash: transaction.txHash,
    errorMessage: transaction.errorMessage,
    completedAt: transaction.completedAt,
    updatedAt: transaction.updatedAt,
  };
}

// Re-export types for route usage
export type { UpdateTransactionStatusInput, TransactionStatusResponse };
