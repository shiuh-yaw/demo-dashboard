/**
 * Redis Transaction Service Implementation
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

export class RedisTransactionService implements TransactionService {
  async initialize(input: InitializeTransactionInput): Promise<Transaction> {
    const redis = getRedis();
    const id = createId();
    const now = new Date().toISOString();

    // Check for duplicate externalId if provided
    if (input.externalId) {
      const existing = await this.findByExternalId(
        input.checkoutId,
        input.externalId
      );
      if (existing) {
        throw new Error(
          `Transaction with externalId "${input.externalId}" already exists`
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
        id
      );
    }

    return transaction;
  }

  async addRouteData(
    id: string,
    data: AddRouteDataInput
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
        `Cannot add route data to transaction with status "${transaction.status}"`
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

    if (!transaction) {
      throw new Error(`Transaction ${id} not found`);
    }

    if (
      transaction.status !== Status.DRAFT &&
      transaction.status !== Status.INITIALIZED
    ) {
      throw new Error(
        `Cannot submit transaction with status "${transaction.status}"`
      );
    }

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

  async updateStatus(
    id: string,
    status: TransactionStatus,
    errorMessage?: string,
    existingTransaction?: Transaction,
    explorerUrl?: string
  ): Promise<Transaction> {
    const redis = getRedis();
    // Use provided transaction if available, otherwise fetch it
    const transaction = existingTransaction || (await this.get(id));

    if (!transaction) {
      throw new Error(`Transaction ${id} not found`);
    }

    const isTerminal =
      status === Status.CONFIRMED ||
      status === Status.FAILED ||
      status === Status.CANCELLED;
    const now = new Date().toISOString();

    // When resetting to INITIALIZED, always clear all route data
    // When resetting to DRAFT, clear route data if it exists (user pressed Back from review)
    // Note: addRouteData sets status to DRAFT directly (doesn't use updateStatus),
    // so it won't be affected by this clearing logic
    const shouldClearRouteData =
      status === Status.INITIALIZED ||
      (status === Status.DRAFT &&
        (transaction.walletAddress ||
          transaction.fromToken ||
          transaction.toToken));

    const updated: Transaction = {
      ...transaction,
      status,
      errorMessage:
        errorMessage ??
        (shouldClearRouteData ? undefined : transaction.errorMessage),
      explorerUrl: explorerUrl ?? transaction.explorerUrl,
      updatedAt: now,
      completedAt: isTerminal ? now : transaction.completedAt,
      // Clear route data when resetting to initialized
      ...(shouldClearRouteData && {
        walletAddress: undefined,
        fromChainId: undefined,
        toChainId: undefined,
        fromToken: undefined,
        toToken: undefined,
        fromAmount: undefined,
        toAmount: undefined,
        tool: undefined,
        txHash: undefined,
        explorerUrl: undefined,
        completedAt: undefined,
      }),
    };

    await redis.set(REDIS_KEYS.transaction(id), updated);

    // Remove from pending set if terminal
    if (isTerminal) {
      await redis.srem(REDIS_KEYS.pendingTransactions, id);
    }

    return updated;
  }

  async get(id: string): Promise<Transaction | null> {
    const redis = getRedis();
    return redis.get<Transaction>(REDIS_KEYS.transaction(id));
  }

  async findByExternalId(
    checkoutId: string,
    externalId: string
  ): Promise<Transaction | null> {
    const redis = getRedis();
    const txId = await redis.get<string>(
      REDIS_KEYS.externalIdIndex(checkoutId, externalId)
    );
    if (!txId) return null;
    return this.get(txId);
  }

  async list(
    checkoutId: string,
    options: TransactionListOptions = {}
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
      REDIS_KEYS.checkoutTransactions(checkoutId)
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
        tx.walletAddress?.toLowerCase().includes(searchLower)
      );
    }

    // Apply externalId filter (partial match)
    if (externalId) {
      const searchLower = externalId.toLowerCase();
      filtered = filtered.filter((tx) =>
        tx.externalId?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by createdAt descending
    filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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

  async markStale(
    id: string,
    status: "abandoned" | "expired"
  ): Promise<Transaction> {
    return this.updateStatus(id, status);
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
