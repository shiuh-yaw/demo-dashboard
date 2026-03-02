/**
 * Type Definitions
 *
 * All type definitions for the payment widget project.
 */

import type { WidgetConfig } from "./widget-config";

// =============================================================================
// TOKEN & ROUTE TYPES
// =============================================================================

export interface Token {
  address: string;
  chainId: number;
  symbol: string;
  decimals: number;
  name: string;
  logoURI?: string;
}

export interface FeeCost {
  name: string;
  amountUSD: string;
  included: boolean;
}

export interface Step {
  id: string;
  type: string;
  tool: string;
  action: {
    fromChainId: number;
    toChainId: number;
    fromToken: Token;
    toToken: Token;
    fromAmount: string;
  };
  estimate: {
    fromAmount: string;
    toAmount: string;
    toAmountMin: string;
    gasCosts: { amountUSD: string }[];
    feeCosts?: FeeCost[];
  };
}

export interface Route {
  id: string;
  fromChainId: number;
  toChainId: number;
  fromToken: Token;
  toToken: Token;
  fromAmount: string;
  toAmount: string;
  fromAmountUSD: string;
  toAmountUSD: string;
  gasCostUSD: string;
  steps: Step[];
  /** Sender wallet address - required for LiFi SDK executeRoute validation */
  fromAddress: string;
  /** Recipient wallet address - required for LiFi SDK executeRoute validation */
  toAddress: string;
}

export interface RouteResponse {
  routes: Route[];
  integrator: string;
}

// =============================================================================
// QUOTE TYPES
// =============================================================================

export interface QuoteResult {
  route: Route;
  fromToken: Token;
  toToken: Token;
  /** Formatted from amount (human-readable, e.g., "0.5") */
  fromAmount: string;
  /** Formatted to amount (human-readable, e.g., "0.5") */
  toAmount: string;
  toAmountUsd: string;
  /** Total fees in USD (gas + bridge/DEX fees + integrator fee) */
  totalFeeUsd: string;
  /** Integrator fee in USD (if configured) */
  integratorFeeUsd?: string;
  /** Integrator identifier from dashboard (for SDK configuration) */
  integrator: string;
}

// =============================================================================
// TRANSFER STATUS TYPES
// =============================================================================

export type TransferStatus =
  | "NOT_FOUND"
  | "INVALID"
  | "PENDING"
  | "DONE"
  | "FAILED";

export type TransferSubstatus =
  | "WAIT_SOURCE_CONFIRMATIONS"
  | "WAIT_DESTINATION_TRANSACTION"
  | "BRIDGE_NOT_AVAILABLE"
  | "CHAIN_NOT_AVAILABLE"
  | "REFUND_IN_PROGRESS"
  | "UNKNOWN_ERROR"
  | "COMPLETED"
  | "PARTIAL"
  | "REFUNDED";

export interface TransferStatusResult {
  status: TransferStatus;
  substatus?: TransferSubstatus;
  substatusMessage?: string;
  sending?: {
    txHash: string;
    txLink?: string;
    amount: string;
    chainId: number;
  };
  receiving?: {
    txHash: string;
    txLink?: string;
    amount: string;
    chainId: number;
  };
  lifiExplorerLink?: string;
}

// =============================================================================
// REQUEST PARAMS
// =============================================================================

/**
 * Quote request params.
 * The widget always quotes by toAmount — "merchant wants to receive Y,
 * how much must the user send?"
 */
export interface GetRoutesParams {
  fromChainId: number;
  toChainId: number;
  fromTokenAddress: string;
  toTokenAddress: string;
  /** Desired amount in destination token (raw, e.g., wei) */
  toAmount: string;
  fromAddress: string;
  toAddress: string;
}

// =============================================================================
// EXECUTION TYPES
// =============================================================================

/** Status of a swap execution step */
export type ExecutionStatus =
  | "PENDING"
  | "ACTION_REQUIRED"
  | "RUNNING"
  | "DONE"
  | "FAILED";

/** Update emitted during swap execution */
export interface ExecutionUpdate {
  stepIndex: number;
  totalSteps: number;
  processType?: string;
  status: ExecutionStatus;
  txHash?: string;
  isBridging?: boolean;
  isCrossChain?: boolean;
  lifiExplorerLink?: string;
}

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
