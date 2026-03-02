/**
 * Update Transaction Handler
 *
 * Updates a transaction with route data (initialized -> draft).
 */

import { transactionService } from "@/lib/services";
import { NotFoundError, ConflictError } from "@/lib/errors";
import { Status, type TransactionStatus } from "@/lib/types/dashboard";
import {
  updateTransactionSchema,
  parseWithSchema,
  type UpdateTransactionInput,
} from "@/lib/validation";
import type { Transaction } from "@/lib/types/dashboard";

export async function handleUpdateTransaction(
  rawInput: unknown
): Promise<{ transaction: Transaction }> {
  const {
    checkoutId,
    txId,
    walletAddress,
    fromToken,
    toToken,
    fromAmount,
    toAmount,
    tool,
  } = parseWithSchema(updateTransactionSchema, rawInput);

  // Verify transaction exists and belongs to checkout
  const existing = await transactionService.get(txId);
  if (!existing || existing.checkoutId !== checkoutId) {
    throw new NotFoundError("Transaction not found");
  }

  // Prevent updates to transactions that are already submitted, pending, or confirmed
  const immutableStatuses: TransactionStatus[] = [
    Status.SUBMITTED,
    Status.PENDING,
    Status.CONFIRMED,
  ];
  if (immutableStatuses.includes(existing.status)) {
    throw new ConflictError(
      `Cannot update transaction with status "${existing.status}". Transaction is already in progress or completed.`
    );
  }

  const transaction = await transactionService.addRouteData(txId, {
    walletAddress,
    fromToken,
    toToken,
    fromAmount,
    toAmount,
    tool,
  });

  return { transaction };
}

// Re-export types for route usage
export type { UpdateTransactionInput };
