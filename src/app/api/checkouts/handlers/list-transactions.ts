/**
 * List Transactions Handler
 *
 * Lists transactions for a checkout with optional filters.
 */

import { transactionService } from "@/lib/services";
import {
  listTransactionsSchema,
  parseWithSchema,
  type ListTransactionsInput,
} from "@/lib/validation";
import type { PaginatedResponse, Transaction } from "@/lib/types/dashboard";

export async function handleListTransactions(
  rawInput: unknown
): Promise<PaginatedResponse<Transaction>> {
  const { checkoutId, page, pageSize, status, walletAddress, externalId } =
    parseWithSchema(listTransactionsSchema, rawInput);

  return transactionService.list(checkoutId, {
    page,
    pageSize,
    status,
    walletAddress,
    externalId,
  });
}

// Re-export types for route usage
export type { ListTransactionsInput };
