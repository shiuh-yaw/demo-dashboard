/**
 * Dashboard Types
 *
 * Types for the demo dashboard configurations.
 */

import type { WidgetConfig } from "../widget-config";

// =============================================================================
// Checkout Configuration
// =============================================================================

/**
 * Checkout mode - deposit or payment
 */
export type CheckoutMode = "deposit" | "payment";

/**
 * Stored checkout configuration with metadata
 * @alias StoredWidgetConfig for backwards compatibility
 */
export interface StoredCheckoutConfig {
  /** Unique identifier */
  id: string;
  /** Display name for the config */
  name: string;
  /** Optional description */
  description?: string;
  /** Checkout mode - deposit or payment */
  mode?: CheckoutMode;
  /** The actual widget configuration */
  config: WidgetConfig;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Owner ID who owns this config */
  ownerId?: string;
}

/**
 * @deprecated Use StoredCheckoutConfig instead
 */
export type StoredWidgetConfig = StoredCheckoutConfig;

/**
 * Request to create a new checkout config
 */
export interface CreateCheckoutConfigRequest {
  name: string;
  description?: string;
  mode?: CheckoutMode;
  config: Partial<WidgetConfig>;
}

/**
 * @deprecated Use CreateCheckoutConfigRequest instead
 */
export type CreateWidgetConfigRequest = CreateCheckoutConfigRequest;

/**
 * Request to update a checkout config
 */
export interface UpdateCheckoutConfigRequest {
  name?: string;
  description?: string;
  mode?: CheckoutMode;
  config?: Partial<WidgetConfig>;
}

/**
 * @deprecated Use UpdateCheckoutConfigRequest instead
 */
export type UpdateWidgetConfigRequest = UpdateCheckoutConfigRequest;

// =============================================================================
// Token Types
// =============================================================================

/**
 * Token information from LI.FI route data
 */
export interface Token {
  /** Token contract address (0x0000...0000 for native tokens) */
  address: string;
  /** Chain ID where token exists */
  chainId: number;
  /** Token symbol (e.g., "USDC", "ETH") */
  symbol: string;
  /** Token decimals */
  decimals: number;
  /** Token name (e.g., "USD Coin", "Ethereum") */
  name: string;
  /** Token logo URI */
  logoURI?: string;
  /** Token price in USD */
  priceUSD?: string;
  /** Token coin key identifier */
  coinKey?: string;
  /** Token tags (e.g., ["stablecoin"]) */
  tags?: string[];
}

// =============================================================================
// Transaction Types
// =============================================================================

/**
 * Transaction status constants (single source of truth)
 *
 * Lifecycle:
 * - INITIALIZED: Server created with externalId/metadata (awaiting user action)
 * - DRAFT: Route selected, not yet submitted
 * - SUBMITTED: Transaction hash submitted to chain
 * - PENDING: Waiting for confirmation
 * - CONFIRMED: Successfully completed
 * - FAILED: Transaction failed
 * - EXPIRED: Initialized but never completed (after TTL)
 * - ABANDONED: Draft but never submitted (after TTL)
 */
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

/** Transaction status type (derived from Status const) */
export type TransactionStatus = (typeof Status)[keyof typeof Status];

/**
 * Transaction record
 */
export interface Transaction {
  /** Unique transaction ID */
  id: string;
  /** Parent checkout ID */
  checkoutId: string;
  /** Current status */
  status: TransactionStatus;
  /** External reference ID for linking to external systems */
  externalId?: string;
  /** Additional metadata from external systems */
  metadata?: Record<string, unknown>;
  /** User ID (if authenticated) */
  userId?: string;
  /** User wallet address */
  walletAddress?: string;
  /** Source chain ID */
  fromChainId?: number;
  /** Destination chain ID */
  toChainId?: number;
  /** Source token information */
  fromToken?: Token;
  /** Destination token information */
  toToken?: Token;
  /** Amount in source token (raw, in smallest unit) */
  fromAmount?: string;
  /** Expected amount in destination token (raw, in smallest unit) */
  toAmount?: string;
  /** Blockchain transaction hash */
  txHash?: string;
  /** LI.FI explorer URL for the transaction */
  explorerUrl?: string;
  /** LI.FI tool used */
  tool?: string;
  /** Error message if failed */
  errorMessage?: string;
  /** Number of status check retries */
  retryCount?: number;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Completion timestamp */
  completedAt?: string;
}

/**
 * Input for initializing a transaction (server-side only)
 */
export interface InitializeTransactionInput {
  checkoutId: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Input for adding route data to an initialized transaction
 */
export interface AddRouteDataInput {
  walletAddress: string;
  fromToken: Token;
  toToken: Token;
  fromAmount: string;
  toAmount: string;
  tool?: string;
}

// =============================================================================
// User Types
// =============================================================================

/**
 * User wallet record
 */
export interface UserWallet {
  /** Wallet address */
  address: string;
  /** Chain IDs this wallet has been seen on */
  chainIds: number[];
  /** First seen timestamp */
  firstSeen: string;
  /** Last active timestamp */
  lastActive: string;
}

/**
 * User record
 */
export interface User {
  /** Unique user ID */
  id: string;
  /** Associated checkout ID */
  checkoutId: string;
  /** Connected wallets */
  wallets: UserWallet[];
  /** Total transaction count */
  transactionCount: number;
  /** Successful transaction count */
  successfulTransactionCount: number;
  /** Total volume in USD */
  totalVolumeUsd?: string;
  /** First seen timestamp */
  createdAt: string;
  /** Last activity timestamp */
  lastActiveAt: string;
}

// =============================================================================
// Stats Types
// =============================================================================

/**
 * Checkout statistics
 */
export interface Stats {
  /** Total transaction count */
  totalTransactions: number;
  /** Transactions by status */
  transactionsByStatus: Record<TransactionStatus, number>;
  /** Total unique users */
  totalUsers: number;
  /** Total volume in USD */
  totalVolumeUsd?: string;
  /** Success rate (0-1) */
  successRate: number;
  /** Average completion time in seconds */
  avgCompletionTimeSeconds?: number;
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Paginated list response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
