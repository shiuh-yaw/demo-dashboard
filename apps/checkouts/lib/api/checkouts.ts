/**
 * Checkout API Client
 *
 * Server-side helpers for checkout-scoped operations. The config fetch
 * (`getCheckoutConfig`) was retired in favour of
 * `@dynamic-demos/theme/fetch-demo-config` against the unified
 * `/api/demo-configs/checkout/[id]` endpoint; this file now holds only
 * the transaction-side helper.
 */

import { Status, type Transaction } from "@/lib/types";
import { serverPost } from "./server-client";

/**
 * Check for existing transaction by externalId
 *
 * This calls the POST endpoint which will return the existing transaction
 * if one exists with the given externalId, or create a new one.
 *
 * The endpoint is public (no auth required) to allow server-side rendering.
 * IDs are obfuscated and not easily guessable, providing sufficient security.
 */
export async function checkExistingTransaction(
  checkoutId: string,
  externalId: string,
): Promise<Transaction | null> {
  if (!externalId) return null;

  try {
    // Use POST endpoint which handles existing transactions gracefully
    // The endpoint is public (no auth required) to allow server-side rendering.
    // API returns: { success: true, data: { transaction: Transaction, created: boolean, message?: string } }
    // serverPost extracts data, so result.data = { transaction, created, message }
    const result = await serverPost<{
      transaction: Transaction;
      created: boolean;
      message?: string;
    }>(
      `/api/checkouts/${checkoutId}/transactions`,
      { externalId },
      {
        cache: "no-store",
      },
    );

    // Silently fail - client will handle initialization
    if (result.error) return null;

    // Extract transaction from the response data
    const transaction = result.data?.transaction;
    if (!transaction) return null;

    // Return if transaction is confirmed or pending (show appropriate screen)
    if (
      transaction.status === Status.CONFIRMED ||
      transaction.status === Status.PENDING
    ) {
      return transaction;
    }

    return null;
  } catch (error) {
    // Silently fail - client will handle initialization
    console.error(`Error checking existing transaction:`, error);
    return null;
  }
}
