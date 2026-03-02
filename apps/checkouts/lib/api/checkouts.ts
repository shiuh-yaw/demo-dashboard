/**
 * Checkout API Client
 *
 * Fetches checkout configurations from the dashboard API.
 * This runs server-side for SSR/SSG checkout pages.
 */

import {
  Status,
  type StoredCheckoutConfig,
  type Transaction,
} from "@/lib/types";
import { env } from "@/lib/env";
import { serverPost } from "./server-client";

const DASHBOARD_API_URL = env.NEXT_PUBLIC_DASHBOARD_API_URL;

/**
 * Fetch a checkout configuration by ID from the dashboard API
 */
export async function getCheckoutConfig(
  id: string,
): Promise<StoredCheckoutConfig | null> {
  try {
    const response = await fetch(`${DASHBOARD_API_URL}/api/checkouts/${id}`, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      if (response.status === 404) return null;

      // Error responses are standardized to { error: string, code?: string }
      try {
        const errorData = await response.json();
        const errorMessage =
          (errorData as { error?: string }).error || `HTTP ${response.status}`;
        console.error(`API error fetching checkout ${id}:`, errorMessage);
      } catch {
        console.error(`Failed to fetch checkout ${id}: ${response.status}`);
      }
      return null;
    }

    const data = await response.json();

    // All responses are now standardized to { success: true, data: T }
    if ("success" in data && data.success === true && "data" in data) {
      return (data as { success: true; data: StoredCheckoutConfig }).data;
    }

    // If response.ok is true but format is unexpected, log and return null
    console.error(`Unexpected response format for checkout ${id}:`, data);
    return null;
  } catch (error) {
    console.error(`Error fetching checkout ${id}:`, error);
    return null;
  }
}

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
