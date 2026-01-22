/**
 * Create Transaction Handler
 *
 * Initializes a new transaction with optional externalId and metadata.
 */

import { transactionService, checkoutService } from "@/lib/services";
import { NotFoundError } from "@/lib/errors";
import {
  createTransactionSchema,
  parseWithSchema,
  type CreateTransactionInput,
} from "@/lib/validation";
import type { Transaction } from "@/lib/types/dashboard";

export interface CreateTransactionResult {
  transaction: Transaction;
  created: boolean;
  message?: string;
}

export async function handleCreateTransaction(
  rawInput: unknown
): Promise<CreateTransactionResult> {
  const { checkoutId, externalId, metadata } = parseWithSchema(
    createTransactionSchema,
    rawInput
  );

  // Verify checkout exists
  const checkout = await checkoutService.get(checkoutId);
  if (!checkout) throw new NotFoundError("Checkout not found");

  // Check for duplicate externalId
  if (externalId) {
    const existing = await transactionService.findByExternalId(
      checkoutId,
      externalId
    );
    if (existing) {
      return {
        transaction: existing,
        created: false,
        message: "Transaction with this externalId already exists",
      };
    }
  }

  const transaction = await transactionService.initialize({
    checkoutId,
    externalId,
    metadata,
  });

  return { transaction, created: true };
}

// Re-export types for route usage
export type { CreateTransactionInput };
