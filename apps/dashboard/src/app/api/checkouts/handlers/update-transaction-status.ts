/**
 * Update Transaction Status Handler
 *
 * Updates the status of a transaction with side effects.
 *
 * This handler is limited to UI-initiated status changes:
 * - cancelled: User wants to cancel the transaction
 * - failed: Transaction execution failed
 *
 * Backend-only statuses (submitted, pending, confirmed) are managed
 * by their respective handlers/workers with explicit methods.
 */

import { transactionService, checkoutService } from "@/lib/services";
import { NotFoundError, ConflictError } from "@/lib/errors";
import { Status } from "@/lib/types/dashboard";
import {
  updateTransactionStatusSchema,
  parseWithSchema,
  type UpdateTransactionStatusInput,
  type TransactionStatusResponse,
} from "@/lib/validation";

export async function handleUpdateTransactionStatus(
  rawInput: unknown,
): Promise<TransactionStatusResponse> {
  // Validate input with Zod
  const { checkoutId, txId, status, errorMessage } = parseWithSchema(
    updateTransactionStatusSchema,
    rawInput,
  );

  // Verify transaction exists and belongs to checkout
  const existing = await transactionService.get(txId);
  if (!existing || existing.checkoutId !== checkoutId) {
    throw new NotFoundError("Transaction not found");
  }

  // Only allow cancelled and failed from UI
  // All other status changes go through their specific handlers
  let transaction;

  switch (status) {
    case Status.CANCELLED:
      transaction = await transactionService.cancel(txId);
      break;

    case Status.FAILED:
      if (!errorMessage) {
        throw new ConflictError(
          "errorMessage is required when setting failed status",
        );
      }
      transaction = await transactionService.fail(txId, errorMessage);
      break;

    default:
      throw new ConflictError(
        `Cannot set status to "${status}" - use the appropriate endpoint`,
      );
  }

  // Invalidate checkout stats cache
  await checkoutService.invalidateStats(checkoutId);

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
