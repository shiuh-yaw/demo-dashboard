/**
 * Service Layer Types
 *
 * Interface definitions for the service abstraction layer.
 * This allows swapping between Redis and Prisma implementations.
 */

import type {
  Transaction,
  TransactionStatus,
  InitializeTransactionInput,
  AddRouteDataInput,
  User,
  UserWallet,
  Stats,
  StoredCheckoutConfig,
  PaginatedResponse,
} from "@/lib/types/dashboard";

// =============================================================================
// Transaction Service
// =============================================================================

export interface TransactionListOptions {
  page?: number;
  pageSize?: number;
  status?: TransactionStatus | TransactionStatus[];
  userId?: string;
  walletAddress?: string;
  externalId?: string;
}

export interface TransactionService {
  // ===========================================================================
  // Lifecycle Methods (explicit state transitions)
  // ===========================================================================

  /**
   * Initialize a new transaction (server-side only)
   * Creates a transaction with externalId/metadata before user interaction
   * Transition: [none] → initialized
   */
  initialize(input: InitializeTransactionInput): Promise<Transaction>;

  /**
   * Add route data to an initialized transaction
   * Called when user selects a swap route
   * Transition: initialized/draft/cancelled/failed → draft
   */
  addRouteData(id: string, data: AddRouteDataInput): Promise<Transaction>;

  /**
   * Submit a transaction (mark as submitted with txHash)
   * Transition: draft/initialized → submitted
   */
  submit(id: string, txHash: string): Promise<Transaction>;

  // ===========================================================================
  // Status Transition Methods (explicit, validated)
  // ===========================================================================

  /**
   * Cancel a transaction (user-initiated)
   * Transition: initialized/draft/failed → cancelled
   */
  cancel(id: string): Promise<Transaction>;

  /**
   * Mark a transaction as failed
   * Transition: draft/submitted/pending → failed
   */
  fail(id: string, errorMessage: string): Promise<Transaction>;

  /**
   * Mark transaction as pending (source chain confirmed, awaiting destination)
   * Internal use only (worker)
   * Transition: submitted → pending
   */
  markPending(id: string): Promise<Transaction>;

  /**
   * Confirm a transaction (completed successfully)
   * Internal use only (worker)
   * Transition: submitted/pending → confirmed
   */
  confirm(id: string, explorerUrl?: string): Promise<Transaction>;

  /**
   * Mark transaction as expired (route/TTL expired)
   * Internal use only (system/worker)
   * Transition: initialized/draft/submitted/pending → expired
   */
  markExpired(id: string): Promise<Transaction>;

  /**
   * Mark transaction as abandoned (user left)
   * Internal use only (system/worker)
   * Transition: initialized/draft → abandoned
   */
  markAbandoned(id: string): Promise<Transaction>;

  // ===========================================================================
  // Query Methods
  // ===========================================================================

  /**
   * Get transaction by ID
   */
  get(id: string): Promise<Transaction | null>;

  /**
   * Find transaction by external ID within a checkout
   */
  findByExternalId(
    checkoutId: string,
    externalId: string,
  ): Promise<Transaction | null>;

  /**
   * List transactions for a checkout
   */
  list(
    checkoutId: string,
    options?: TransactionListOptions,
  ): Promise<PaginatedResponse<Transaction>>;

  /**
   * Get all pending transactions (for reconciliation)
   */
  getPending(): Promise<Transaction[]>;

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Increment retry count (for monitoring)
   */
  incrementRetry(id: string): Promise<number>;
}

// =============================================================================
// User Service
// =============================================================================

export interface UserListOptions {
  page?: number;
  pageSize?: number;
}

export interface UserService {
  /**
   * Get or create user by wallet address
   */
  getOrCreateByWallet(
    checkoutId: string,
    walletAddress: string,
    chainId?: number,
  ): Promise<User>;

  /**
   * Get user by ID
   */
  get(id: string): Promise<User | null>;

  /**
   * Find user by wallet address
   */
  findByWallet(walletAddress: string): Promise<User | null>;

  /**
   * List users for a checkout
   */
  list(
    checkoutId: string,
    options?: UserListOptions,
  ): Promise<PaginatedResponse<User>>;

  /**
   * Add wallet to user
   */
  addWallet(userId: string, wallet: UserWallet): Promise<User>;

  /**
   * Update user stats after transaction completion
   */
  updateStats(
    userId: string,
    stats: {
      transactionCount?: number;
      successfulTransactionCount?: number;
      totalVolumeUsd?: string;
    },
  ): Promise<User>;
}

// =============================================================================
// Checkout Service
// =============================================================================

export interface CheckoutListOptions {
  page?: number;
  pageSize?: number;
}

export interface CheckoutService {
  /**
   * Get checkout by ID
   */
  get(id: string): Promise<StoredCheckoutConfig | null>;

  /**
   * Get stats for a checkout
   */
  getStats(checkoutId: string): Promise<Stats>;

  /**
   * Invalidate cached stats (after transaction updates)
   */
  invalidateStats(checkoutId: string): Promise<void>;
}

// =============================================================================
// Service Factory
// =============================================================================

export interface Services {
  transactions: TransactionService;
  users: UserService;
  checkouts: CheckoutService;
}
