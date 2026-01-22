/**
 * Get Transaction Status Handler
 *
 * Returns the current status of a transaction.
 */

import { transactionService } from "@/lib/services";
import { NotFoundError } from "@/lib/errors";
import {
  getTransactionSchema,
  parseWithSchema,
  type GetTransactionInput,
  type TransactionStatusResponse,
} from "@/lib/validation";

export async function handleGetTransactionStatus(
  rawInput: unknown
): Promise<TransactionStatusResponse> {
  const { checkoutId, txId } = parseWithSchema(getTransactionSchema, rawInput);

  const transaction = await transactionService.get(txId);

  if (!transaction || transaction.checkoutId !== checkoutId) {
    throw new NotFoundError("Transaction not found");
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
export type { GetTransactionInput };
