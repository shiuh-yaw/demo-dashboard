/**
 * Transaction Zod Schemas
 *
 * Validation schemas for transaction-related operations.
 */

import { z } from "zod";
import {
  nonEmptyString,
  walletAddress,
  chainId,
  tokenAmount,
  externalId,
  metadata,
  coercedPageNumber,
  coercedPageSize,
  tokenSchema,
} from "./common";

// =============================================================================
// Enums
// =============================================================================

/**
 * Transaction status enum
 */
export const transactionStatusSchema = z.enum([
  "initialized",
  "draft",
  "submitted",
  "pending",
  "confirmed",
  "failed",
  "cancelled",
  "expired",
  "abandoned",
]);

export type TransactionStatusEnum = z.infer<typeof transactionStatusSchema>;

// =============================================================================
// Create Transaction (Initialize)
// =============================================================================

/**
 * Schema for creating/initializing a transaction
 */
export const createTransactionSchema = z.object({
  checkoutId: nonEmptyString.describe("Parent checkout ID"),
  externalId: externalId.describe("External reference ID for linking"),
  metadata: metadata.describe("Additional metadata from external systems"),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

// =============================================================================
// Update Transaction (Add Route Data)
// =============================================================================

/**
 * Schema for updating a transaction with route data
 */
export const updateTransactionSchema = z.object({
  checkoutId: nonEmptyString.describe("Parent checkout ID"),
  txId: nonEmptyString.describe("Transaction ID"),
  walletAddress: walletAddress.describe("User wallet address"),
  fromToken: tokenSchema.describe("Source token information"),
  toToken: tokenSchema.describe("Destination token information"),
  fromAmount: tokenAmount.describe("Amount in source token"),
  toAmount: tokenAmount.describe("Expected amount in destination token"),
  tool: z.string().optional().describe("LI.FI tool used"),
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

// =============================================================================
// Get Quote for Transaction
// =============================================================================

/**
 * Schema for getting a quote for a transaction
 * Fetches quote from LI.FI and stores route data in transaction atomically
 */
export const getTransactionQuoteSchema = z.object({
  checkoutId: nonEmptyString.describe("Parent checkout ID"),
  txId: nonEmptyString.describe("Transaction ID"),
  fromChainId: chainId.describe("Source chain ID"),
  toChainId: chainId.describe("Destination chain ID"),
  fromTokenAddress: nonEmptyString.describe("Source token address"),
  toTokenAddress: nonEmptyString.describe("Destination token address"),
  fromAmount: tokenAmount.describe("Amount in source token (raw, e.g., wei)"),
  fromAddress: walletAddress.describe("Source wallet address"),
  toAddress: walletAddress.describe("Destination wallet address"),
});

export type GetTransactionQuoteInput = z.infer<
  typeof getTransactionQuoteSchema
>;

// =============================================================================
// Update Transaction Status
// =============================================================================

/**
 * Schema for updating transaction status
 */
export const updateTransactionStatusSchema = z.object({
  checkoutId: nonEmptyString.describe("Parent checkout ID"),
  txId: nonEmptyString.describe("Transaction ID"),
  status: transactionStatusSchema.describe("New transaction status"),
  errorMessage: z
    .string()
    .optional()
    .describe("Error message if status is failed"),
});

export type UpdateTransactionStatusInput = z.infer<
  typeof updateTransactionStatusSchema
>;

// =============================================================================
// Get Transaction
// =============================================================================

/**
 * Schema for getting a single transaction
 */
export const getTransactionSchema = z.object({
  checkoutId: nonEmptyString.describe("Parent checkout ID"),
  txId: nonEmptyString.describe("Transaction ID"),
});

export type GetTransactionInput = z.infer<typeof getTransactionSchema>;

// =============================================================================
// List Transactions
// =============================================================================

/**
 * Schema for listing transactions with filters
 */
export const listTransactionsSchema = z.object({
  checkoutId: nonEmptyString.describe("Parent checkout ID"),
  page: coercedPageNumber.describe("Page number (1-indexed)"),
  pageSize: coercedPageSize.describe("Number of items per page"),
  status: z
    .union([transactionStatusSchema, z.array(transactionStatusSchema)])
    .optional()
    .describe("Filter by status(es)"),
  walletAddress: walletAddress.optional().describe("Filter by wallet address"),
  externalId: externalId.optional().describe("Filter by external ID"),
});

export type ListTransactionsInput = z.infer<typeof listTransactionsSchema>;

// =============================================================================
// Submit Transaction
// =============================================================================

/**
 * Schema for submitting a transaction with txHash
 */
export const submitTransactionSchema = z.object({
  checkoutId: nonEmptyString.describe("Parent checkout ID"),
  txId: nonEmptyString.describe("Transaction ID"),
  txHash: nonEmptyString
    .min(10, "Transaction hash is too short")
    .describe("Blockchain transaction hash"),
});

export type SubmitTransactionInput = z.infer<typeof submitTransactionSchema>;

// =============================================================================
// Transaction Status Response
// =============================================================================

/**
 * Schema for transaction status response
 */
export const transactionStatusResponseSchema = z.object({
  id: nonEmptyString,
  status: transactionStatusSchema,
  txHash: z.string().optional(),
  errorMessage: z.string().optional(),
  completedAt: z.string().optional(),
  updatedAt: nonEmptyString,
});

export type TransactionStatusResponse = z.infer<
  typeof transactionStatusResponseSchema
>;
