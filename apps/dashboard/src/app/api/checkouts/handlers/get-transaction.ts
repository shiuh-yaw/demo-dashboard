/**
 * Get Transaction Handler
 *
 * Returns a single transaction by ID.
 */

import { transactionService } from "@/lib/services";
import { NotFoundError } from "@/lib/errors";
import {
  getTransactionSchema,
  parseWithSchema,
  type GetTransactionInput,
} from "@/lib/validation";
import type { Transaction } from "@/lib/types/dashboard";

export async function handleGetTransaction(
  rawInput: unknown
): Promise<{ transaction: Transaction }> {
  const { checkoutId, txId } = parseWithSchema(getTransactionSchema, rawInput);

  const transaction = await transactionService.get(txId);

  if (!transaction || transaction.checkoutId !== checkoutId) {
    throw new NotFoundError("Transaction not found");
  }

  return { transaction };
}

// Re-export types for route usage
export type { GetTransactionInput };
