/**
 * Type Definitions
 *
 * App-level type definitions for the checkouts dashboard integration.
 * Widget-only types (Token, ReviewQuote, ExecutionStatus, ExecutionUpdate)
 * are re-exported from @dynamic-demos/checkouts-widget.
 */

import type { WidgetConfig } from "./widget-config";

export type {
  Token,
  ExecutionStatus,
  ExecutionUpdate,
  ReviewQuote,
} from "@dynamic-demos/checkouts-widget";

import type { Token } from "@dynamic-demos/checkouts-widget";

// =============================================================================
// CHECKOUT TYPES
// =============================================================================

/** Checkout mode - determines the UI flow */
export type CheckoutMode = "payment" | "deposit";

/**
 * Stored checkout configuration with metadata
 */
export interface StoredCheckoutConfig {
  /** Unique identifier */
  id: string;
  /** Display name for the config */
  name: string;
  /** Optional description */
  description?: string;
  /** Checkout mode */
  mode: CheckoutMode;
  /** The actual widget configuration */
  config: WidgetConfig;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Owner ID who owns this config */
  ownerId?: string;
}

/** @deprecated Use StoredCheckoutConfig instead */
export type StoredWidgetConfig = StoredCheckoutConfig;

// =============================================================================
// TRANSACTION TYPES
// =============================================================================

/** Transaction status constants */
export const Status = {
  INITIALIZED: "initialized",
  DRAFT: "draft",
  SUBMITTED: "submitted",
  PENDING: "pending",
  CONFIRMED: "confirmed",
  FAILED: "failed",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
  ABANDONED: "abandoned",
} as const;

/** Transaction status type */
export type TransactionStatus = (typeof Status)[keyof typeof Status];

/**
 * Transaction record for tracking checkout transactions
 */
export interface Transaction {
  id: string;
  checkoutId: string;
  /** External ID for linking to external systems */
  externalId?: string;
  /** Additional metadata from the integrator */
  metadata?: Record<string, unknown>;
  status: TransactionStatus;
  /** Wallet address that initiated the transaction */
  walletAddress?: string;
  /** Source token information */
  fromToken?: Token;
  /** Destination token information */
  toToken?: Token;
  /** Amount in smallest unit (e.g., wei) */
  fromAmount?: string;
  /** Expected output amount */
  toAmount?: string;
  /** Blockchain transaction hash */
  txHash?: string;
  /** LI.FI explorer URL for the transaction */
  explorerUrl?: string;
  /** Error message if failed */
  errorMessage?: string;
  /** Number of status check retries */
  retryCount: number;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Parameters for initializing a transaction
 */
export interface InitializeTransactionParams {
  externalId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Parameters for updating transaction with route data
 */
export interface UpdateTransactionParams {
  walletAddress: string;
  fromToken: Token;
  toToken: Token;
  fromAmount: string;
  toAmount: string;
}

// =============================================================================
// API TYPES
// =============================================================================

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
