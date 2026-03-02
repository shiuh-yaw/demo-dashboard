/**
 * Redis Transaction Service Implementation
 *
 * Implements explicit state transitions for transaction lifecycle.
 * Each transition method validates allowed source states.
 */

import { createId } from "@paralleldrive/cuid2";
import { getRedis, REDIS_KEYS } from "@/lib/redis";
import {
  Status,
  type Transaction,
  type TransactionStatus,
  type InitializeTransactionInput,
  type AddRouteDataInput,
  type PaginatedResponse,
} from "@/lib/types/dashboard";
import type { TransactionService, TransactionListOptions } from "../types";

/**
 * Helper to validate a state transition
 * Throws if the current state is not in the allowed list
 */
function assertValidTransition(
  transaction: Transaction,
  allowedFromStatuses: TransactionStatus[],
  targetStatus: TransactionStatus,
): void {
  if (!allowedFromStatuses.includes(transaction.status)) {
    throw new Error(
      `Cannot transition from "${transaction.status}" to "${targetStatus}"`,
    );
  }
}

export class RedisTransactionService implements TransactionService {
  async initialize(input: InitializeTransactionInput): Promise<Transaction> {
    const redis = getRedis();
    const id = createId();
    const now = new Date().toISOString();

    // Check for duplicate externalId if provided
    if (input.externalId) {
      const existing = await this.findByExternalId(
        input.checkoutId,
        input.externalId,
      );
      if (existing) {
        throw new Error(
          `Transaction with externalId "${input.externalId}" already exists`,
        );
      }
    }

    const transaction: Transaction = {
      id,
      checkoutId: input.checkoutId,
      status: Status.INITIALIZED,
      externalId: input.externalId,
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now,
    };

    // Save transaction
    await redis.set(REDIS_KEYS.transaction(id), transaction);

    // Add to checkout's transaction set
    await redis.sadd(REDIS_KEYS.checkoutTransactions(input.checkoutId), id);

    // Create externalId index if provided
    if (input.externalId) {
      await redis.set(
        REDIS_KEYS.externalIdIndex(input.checkoutId, input.externalId),
        id,
      );
    }

    return transaction;
  }

  async addRouteData(
    id: string,
    data: AddRouteDataInput,
  ): Promise<Transaction> {
    const redis = getRedis();
    const transaction = await this.get(id);

    if (!transaction) {
      throw new Error(`Transaction ${id} not found`);
    }

    // Allow updating transactions in INITIALIZED, DRAFT, CANCELLED, or FAILED status
    // DRAFT status allows users to retry with a new route/quote if they
    // previously abandoned the transaction (e.g., closed page, denied in wallet)
    // CANCELLED and FAILED statuses allow users to restart the transaction
    const allowedStatuses: TransactionStatus[] = [
      Status.INITIALIZED,
      Status.DRAFT,
      Status.CANCELLED,
      Status.FAILED,
    ];
    if (!allowedStatuses.includes(transaction.status)) {
      throw new Error(
        `Cannot add route data to transaction with status "${transaction.status}"`,
      );
    }

    // Derive chain IDs from tokens
    const fromChainId = data.fromToken.chainId;
    const toChainId = data.toToken.chainId;

    const updated: Transaction = {
      ...transaction,
      status: Status.DRAFT,
      walletAddress: data.walletAddress,
      fromChainId,
      toChainId,
      fromToken: data.fromToken,
      toToken: data.toToken,
      fromAmount: data.fromAmount,
      toAmount: data.toAmount,
      tool: data.tool,
      // Clear any previous error message when updating route data
      errorMessage: undefined,
      updatedAt: new Date().toISOString(),
    };

    await redis.set(REDIS_KEYS.transaction(id), updated);
    return updated;
  }

  async submit(id: string, txHash: string): Promise<Transaction> {
    const redis = getRedis();
    const transaction = await this.get(id);

    if (!transaction) throw new Error(`Transaction ${id} not found`);

    assertValidTransition(
      transaction,
      [Status.DRAFT, Status.INITIALIZED],
      Status.SUBMITTED,
    );

    const updated: Transaction = {
      ...transaction,
      status: Status.SUBMITTED,
      txHash,
      updatedAt: new Date().toISOString(),
    };

    await redis.set(REDIS_KEYS.transaction(id), updated);

    // Add to pending set for monitoring
    await redis.sadd(REDIS_KEYS.pendingTransactions, id);

    return updated;
  }

  // ===========================================================================
  // Explicit Status Transition Methods
  // ===========================================================================

  /**
   * Cancel a transaction (user-initiated)
   * Transition: initialized/draft/failed → cancelled
   * Idempotent: returns existing transaction if already cancelled
   */
  async cancel(id: string): Promise<Transaction> {
    const redis = getRedis();
    const transaction = await this.get(id);

    if (!transaction) {
      throw new Error(`Transaction ${id} not found`);
    }

    // Idempotent: if already cancelled, return as-is
    if (transaction.status === Status.CANCELLED) {
      return transaction;
    }

    assertValidTransition(
      transaction,
      [Status.INITIALIZED, Status.DRAFT, Status.FAILED],
      Status.CANCELLED,
    );

    const now = new Date().toISOString();
    const updated: Transaction = {
      ...transaction,
      status: Status.CANCELLED,
      updatedAt: now,
      completedAt: now,
    };

    await redis.set(REDIS_KEYS.transaction(id), updated);
    await redis.srem(REDIS_KEYS.pendingTransactions, id);

    return updated;
  }

  /**
   * Mark a transaction as failed
   * Transition: draft/submitted/pending → failed
   * Idempotent: returns existing transaction if already failed
   */
  async fail(id: string, errorMessage: string): Promise<Transaction> {
    const redis = getRedis();
    const transaction = await this.get(id);

    if (!transaction) {
      throw new Error(`Transaction ${id} not found`);
    }

    // Idempotent: if already failed, return as-is
    if (transaction.status === Status.FAILED) {
      return transaction;
    }

    assertValidTransition(
      transaction,
      [Status.DRAFT, Status.SUBMITTED, Status.PENDING],
      Status.FAILED,
    );

    const now = new Date().toISOString();
    const updated: Transaction = {
      ...transaction,
      status: Status.FAILED,
      errorMessage,
      updatedAt: now,
      completedAt: now,
    };

    await redis.set(REDIS_KEYS.transaction(id), updated);
    await redis.srem(REDIS_KEYS.pendingTransactions, id);

    return updated;
  }

  /**
   * Mark transaction as pending (source chain confirmed, awaiting destination)
   * Internal use only (worker)
   * Transition: submitted → pending
   * Idempotent: returns existing transaction if already pending
   */
  async markPending(id: string): Promise<Transaction> {
    const redis = getRedis();
    const transaction = await this.get(id);

    if (!transaction) {
      throw new Error(`Transaction ${id} not found`);
    }

    // Idempotent: if already pending, return as-is
    if (transaction.status === Status.PENDING) {
      return transaction;
    }

    assertValidTransition(transaction, [Status.SUBMITTED], Status.PENDING);

    const updated: Transaction = {
      ...transaction,
      status: Status.PENDING,
      updatedAt: new Date().toISOString(),
    };

    await redis.set(REDIS_KEYS.transaction(id), updated);

    return updated;
  }

  /**
   * Confirm a transaction (completed successfully)
   * Internal use only (worker)
   * Transition: submitted/pending → confirmed
   * Idempotent: returns existing transaction if already confirmed
   */
  async confirm(id: string, explorerUrl?: string): Promise<Transaction> {
    const redis = getRedis();
    const transaction = await this.get(id);

    if (!transaction) throw new Error(`Transaction ${id} not found`);

    // Idempotent: if already confirmed, return as-is
    if (transaction.status === Status.CONFIRMED) return transaction;

    assertValidTransition(
      transaction,
      [Status.SUBMITTED, Status.PENDING],
      Status.CONFIRMED,
    );

    const now = new Date().toISOString();
    const updated: Transaction = {
      ...transaction,
      status: Status.CONFIRMED,
      explorerUrl: explorerUrl ?? transaction.explorerUrl,
      updatedAt: now,
      completedAt: now,
    };

    await redis.set(REDIS_KEYS.transaction(id), updated);
    await redis.srem(REDIS_KEYS.pendingTransactions, id);

    return updated;
  }

  /**
   * Mark transaction as expired (route/TTL expired)
   * Internal use only (system/worker)
   * Transition: initialized/draft/submitted/pending → expired
   * Idempotent: returns existing transaction if already expired
   */
  async markExpired(id: string): Promise<Transaction> {
    const redis = getRedis();
    const transaction = await this.get(id);

    if (!transaction) throw new Error(`Transaction ${id} not found`);

    // Idempotent: if already expired, return as-is
    if (transaction.status === Status.EXPIRED) return transaction;

    assertValidTransition(
      transaction,
      [Status.INITIALIZED, Status.DRAFT, Status.SUBMITTED, Status.PENDING],
      Status.EXPIRED,
    );

    const now = new Date().toISOString();
    const updated: Transaction = {
      ...transaction,
      status: Status.EXPIRED,
      updatedAt: now,
      completedAt: now,
    };

    await redis.set(REDIS_KEYS.transaction(id), updated);
    await redis.srem(REDIS_KEYS.pendingTransactions, id);

    return updated;
  }

  /**
   * Mark transaction as abandoned (user left)
   * Internal use only (system/worker)
   * Transition: initialized/draft → abandoned
   * Idempotent: returns existing transaction if already abandoned
   */
  async markAbandoned(id: string): Promise<Transaction> {
    const redis = getRedis();
    const transaction = await this.get(id);

    if (!transaction) throw new Error(`Transaction ${id} not found`);

    // Idempotent: if already abandoned, return as-is
    if (transaction.status === Status.ABANDONED) return transaction;

    assertValidTransition(
      transaction,
      [Status.INITIALIZED, Status.DRAFT],
      Status.ABANDONED,
    );

    const now = new Date().toISOString();
    const updated: Transaction = {
      ...transaction,
      status: Status.ABANDONED,
      updatedAt: now,
      completedAt: now,
    };

    await redis.set(REDIS_KEYS.transaction(id), updated);

    return updated;
  }

  async get(id: string): Promise<Transaction | null> {
    const redis = getRedis();
    return redis.get<Transaction>(REDIS_KEYS.transaction(id));
  }

  async findByExternalId(
    checkoutId: string,
    externalId: string,
  ): Promise<Transaction | null> {
    const redis = getRedis();
    const txId = await redis.get<string>(
      REDIS_KEYS.externalIdIndex(checkoutId, externalId),
    );
    if (!txId) return null;
    return this.get(txId);
  }

  async list(
    checkoutId: string,
    options: TransactionListOptions = {},
  ): Promise<PaginatedResponse<Transaction>> {
    const redis = getRedis();
    const {
      page = 1,
      pageSize = 20,
      status,
      userId,
      walletAddress,
      externalId,
    } = options;

    // Get all transaction IDs for this checkout
    const txIds = await redis.smembers(
      REDIS_KEYS.checkoutTransactions(checkoutId),
    );

    if (!txIds.length) {
      return { items: [], total: 0, page, pageSize, hasMore: false };
    }

    // Fetch all transactions
    const transactions = await Promise.all(txIds.map((id) => this.get(id)));

    // Filter out nulls and apply filters
    let filtered = transactions.filter((tx): tx is Transaction => tx !== null);

    // Apply status filter
    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      filtered = filtered.filter((tx) => statuses.includes(tx.status));
    }

    // Apply userId filter
    if (userId) {
      filtered = filtered.filter((tx) => tx.userId === userId);
    }

    // Apply wallet filter (partial match)
    if (walletAddress) {
      const searchLower = walletAddress.toLowerCase();
      filtered = filtered.filter((tx) =>
        tx.walletAddress?.toLowerCase().includes(searchLower),
      );
    }

    // Apply externalId filter (partial match)
    if (externalId) {
      const searchLower = externalId.toLowerCase();
      filtered = filtered.filter((tx) =>
        tx.externalId?.toLowerCase().includes(searchLower),
      );
    }

    // Sort by createdAt descending
    filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    // Paginate
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      hasMore: start + items.length < total,
    };
  }

  async getPending(): Promise<Transaction[]> {
    const redis = getRedis();
    const txIds = await redis.smembers(REDIS_KEYS.pendingTransactions);

    if (!txIds.length) return [];

    const transactions = await Promise.all(txIds.map((id) => this.get(id)));

    return transactions.filter((tx): tx is Transaction => tx !== null);
  }

  async incrementRetry(id: string): Promise<number> {
    const redis = getRedis();
    const transaction = await this.get(id);

    if (!transaction) {
      throw new Error(`Transaction ${id} not found`);
    }

    const retryCount = (transaction.retryCount || 0) + 1;
    const updated: Transaction = {
      ...transaction,
      retryCount,
      updatedAt: new Date().toISOString(),
    };

    await redis.set(REDIS_KEYS.transaction(id), updated);
    return retryCount;
  }
}
