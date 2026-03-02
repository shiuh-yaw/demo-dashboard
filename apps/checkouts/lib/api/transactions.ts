/**
 * Transaction API Client
 *
 * Client-side functions for managing transaction lifecycle.
 * All requests are authenticated via Dynamic JWT.
 */

"use client";

import { get, post, patch } from "./client";
import {
  Status,
  type Transaction,
  type InitializeTransactionParams,
  type UpdateTransactionParams,
} from "@/lib/types";

/**
 * Initialize a new transaction for a checkout
 *
 * Called when the checkout page loads to capture externalId and metadata.
 * Creates a transaction with Status.INITIALIZED.
 *
 * Returns the transaction and whether it was newly created or already existed.
 */
export interface InitializeTransactionResult {
  data?: Transaction;
  error?: string;
  created?: boolean;
  message?: string;
}

export async function initializeTransaction(
  checkoutId: string,
  params: InitializeTransactionParams = {},
): Promise<InitializeTransactionResult> {
  if (!checkoutId || checkoutId === "undefined") {
    const error = `Invalid checkoutId: ${checkoutId}`;
    return { error };
  }

  // Use post helper - client now preserves full response with created/message fields
  // Response format: { transaction: Transaction, created: boolean, message?: string }

  const result = await post<{
    transaction: Transaction;
    created?: boolean;
    message?: string;
  }>(`/api/checkouts/${checkoutId}/transactions`, params);

  if (result.error) return { error: result.error };
  if (!result.data) return { error: "No data in response" };

  // Extract fields from special response format
  const transaction = result.data.transaction;
  // API may omit `created`; treat as true unless explicitly false (e.g. when reusing existing transaction).
  const created = result.data.created !== false;
  const message = result.data.message;

  if (!transaction) {
    return { error: "No transaction in response" };
  }

  return {
    data: transaction,
    created,
    message,
  };
}

/**
 * Update a transaction with route/quote data
 *
 * Called when the user selects a swap route.
 * Updates transaction to Status.DRAFT with route details.
 */
export async function updateTransaction(
  checkoutId: string,
  transactionId: string,
  params: UpdateTransactionParams,
) {
  // Pass token objects directly to API
  // Derive chain IDs from tokens since backend still expects them
  const apiParams = {
    walletAddress: params.walletAddress,
    fromChainId: params.fromToken.chainId,
    toChainId: params.toToken.chainId,
    fromToken: params.fromToken,
    toToken: params.toToken,
    fromAmount: params.fromAmount,
    toAmount: params.toAmount,
    // tool is optional and not provided by widget
  };

  return patch<Transaction>(
    `/api/checkouts/${checkoutId}/transactions/${transactionId}`,
    apiParams,
  );
}

/**
 * Submit a transaction with the blockchain tx hash
 *
 * Called after the user confirms and the transaction is sent.
 * Updates transaction to Status.SUBMITTED and triggers background monitoring.
 */
export async function submitTransaction(
  checkoutId: string,
  transactionId: string,
  txHash: string,
) {
  const result = await post<{
    transaction: Transaction;
    monitorId?: string;
  }>(`/api/checkouts/${checkoutId}/transactions/${transactionId}/submit`, {
    txHash,
  });

  if (result.error) return { error: result.error };
  if (!result.data) return { error: "No data in response" };

  // Extract transaction from response: { transaction: Transaction, monitorId?: string }
  return { data: result.data.transaction };
}

/**
 * Cancel a transaction
 *
 * Called when user cancels, goes back, or closes the payment flow.
 * A cancelled transaction can be retried via a new quote call.
 */
export async function cancelTransaction(
  checkoutId: string,
  transactionId: string,
) {
  return patch<{
    id: string;
    status: string;
  }>(`/api/checkouts/${checkoutId}/transactions/${transactionId}/status`, {
    status: Status.CANCELLED,
  });
}

/**
 * Mark a transaction as failed
 *
 * Called when a transaction fails (e.g., on-chain failure, bundle expired).
 * A failed transaction can be retried via a new quote call.
 */
export async function failTransaction(
  checkoutId: string,
  transactionId: string,
  errorMessage: string,
) {
  return patch<{
    id: string;
    status: string;
    errorMessage?: string;
  }>(`/api/checkouts/${checkoutId}/transactions/${transactionId}/status`, {
    status: Status.FAILED,
    errorMessage,
  });
}

/**
 * Get transaction status
 *
 * Used for polling status updates.
 * Returns minimal transaction status information (id, status, txHash, errorMessage, timestamps).
 */
export async function getTransactionStatus(
  checkoutId: string,
  transactionId: string,
) {
  return get<{
    id: string;
    status: string;
    txHash?: string;
    errorMessage?: string;
    completedAt?: string;
    updatedAt: string;
  }>(`/api/checkouts/${checkoutId}/transactions/${transactionId}/status`, {
    cache: "no-store",
  });
}
