/**
 * Redis Checkout Service Implementation
 */

import { getRedis, REDIS_KEYS } from "@/lib/redis";
import {
  Status,
  type StoredCheckoutConfig,
  type Stats,
  type TransactionStatus,
} from "@/lib/types/dashboard";
import type { CheckoutService } from "../types";
import { RedisTransactionService } from "./transactions";
import { RedisUserService } from "./users";
import {
  isDemoCheckout,
  createDemoCheckoutConfig,
} from "@/lib/utils/demo-checkout";

export class RedisCheckoutService implements CheckoutService {
  private transactionService: RedisTransactionService;
  private userService: RedisUserService;

  constructor() {
    this.transactionService = new RedisTransactionService();
    this.userService = new RedisUserService();
  }

  async get(id: string): Promise<StoredCheckoutConfig | null> {
    // Support demo checkouts for testing/demo purposes
    if (isDemoCheckout(id)) return createDemoCheckoutConfig(id);

    const redis = getRedis();
    return redis.get<StoredCheckoutConfig>(REDIS_KEYS.checkoutConfig(id));
  }

  async getStats(checkoutId: string): Promise<Stats> {
    const redis = getRedis();

    // Try to get cached stats
    const cached = await redis.get<Stats>(REDIS_KEYS.checkoutStats(checkoutId));
    if (cached) {
      return cached;
    }

    // Calculate stats from transactions
    const { items: transactions } = await this.transactionService.list(
      checkoutId,
      { pageSize: 10000 }, // Get all transactions
    );

    const { items: users } = await this.userService.list(checkoutId, {
      pageSize: 10000,
    });

    // Count transactions by status. Phase 7 magic-send sub-states never
    // appear in the legacy LI.FI checkout flow, but the
    // `Record<TransactionStatus, …>` shape requires every canonical
    // state to be keyed. Initialise the magic-send slots to zero so the
    // checkout stats page keeps rendering — those rows live under a
    // different `kind` and never reach this aggregator.
    const transactionsByStatus: Record<TransactionStatus, number> = {
      initialized: 0,
      draft: 0,
      submitted: 0,
      pending: 0,
      confirmed: 0,
      failed: 0,
      expired: 0,
      abandoned: 0,
      cancelled: 0,
      "submitted-transfer": 0,
      "transfer-confirmed": 0,
      "submitted-userop": 0,
    };

    let completedCount = 0;
    let totalCompletionTime = 0;

    for (const tx of transactions) {
      transactionsByStatus[tx.status]++;

      if (tx.status === Status.CONFIRMED && tx.completedAt && tx.createdAt) {
        completedCount++;
        totalCompletionTime +=
          new Date(tx.completedAt).getTime() - new Date(tx.createdAt).getTime();
      }
    }

    const totalTransactions = transactions.length;
    const successfulTransactions = transactionsByStatus.confirmed;
    const attemptedTransactions =
      successfulTransactions + transactionsByStatus.failed;

    const stats: Stats = {
      totalTransactions,
      transactionsByStatus,
      totalUsers: users.length,
      successRate:
        attemptedTransactions > 0
          ? successfulTransactions / attemptedTransactions
          : 0,
      avgCompletionTimeSeconds:
        completedCount > 0
          ? Math.round(totalCompletionTime / completedCount / 1000)
          : undefined,
    };

    // Cache stats (we'll use set with a manual expiry check since ioredis/upstash handle TTL differently)
    // For simplicity, we just cache without TTL and rely on invalidation
    await redis.set(REDIS_KEYS.checkoutStats(checkoutId), stats);

    return stats;
  }

  async invalidateStats(checkoutId: string): Promise<void> {
    const redis = getRedis();
    await redis.del(REDIS_KEYS.checkoutStats(checkoutId));
  }
}
