/**
 * Redis User Service Implementation
 */

import { createId } from "@paralleldrive/cuid2";
import { getRedis, REDIS_KEYS } from "@/lib/redis";
import type {
  User,
  UserWallet,
  PaginatedResponse,
} from "@/lib/types/dashboard";
import type { UserService, UserListOptions } from "../types";

export class RedisUserService implements UserService {
  async getOrCreateByWallet(
    checkoutId: string,
    walletAddress: string,
    chainId?: number,
  ): Promise<User> {
    const redis = getRedis();
    const normalizedAddress = walletAddress.toLowerCase();

    // Check if user exists by wallet
    const existingUser = await this.findByWallet(walletAddress);
    if (existingUser) {
      // Update last active and add chainId if new
      const wallet = existingUser.wallets.find(
        (w) => w.address.toLowerCase() === normalizedAddress,
      );

      if (wallet && chainId && !wallet.chainIds.includes(chainId)) {
        wallet.chainIds.push(chainId);
        wallet.lastActive = new Date().toISOString();
      }

      const updated: User = {
        ...existingUser,
        lastActiveAt: new Date().toISOString(),
      };

      await redis.set(REDIS_KEYS.user(existingUser.id), updated);
      return updated;
    }

    // Create new user
    const id = createId();
    const now = new Date().toISOString();

    const newUser: User = {
      id,
      checkoutId,
      wallets: [
        {
          address: normalizedAddress,
          chainIds: chainId ? [chainId] : [],
          firstSeen: now,
          lastActive: now,
        },
      ],
      transactionCount: 0,
      successfulTransactionCount: 0,
      createdAt: now,
      lastActiveAt: now,
    };

    await redis.set(REDIS_KEYS.user(id), newUser);
    await redis.set(REDIS_KEYS.userByAddress(normalizedAddress), id);
    await redis.sadd(REDIS_KEYS.checkoutUsers(checkoutId), id);

    return newUser;
  }

  async get(id: string): Promise<User | null> {
    const redis = getRedis();
    return redis.get<User>(REDIS_KEYS.user(id));
  }

  async findByWallet(walletAddress: string): Promise<User | null> {
    const redis = getRedis();
    const userId = await redis.get<string>(
      REDIS_KEYS.userByAddress(walletAddress.toLowerCase()),
    );
    if (!userId) return null;
    return this.get(userId);
  }

  async list(
    checkoutId: string,
    options: UserListOptions = {},
  ): Promise<PaginatedResponse<User>> {
    const redis = getRedis();
    const { page = 1, pageSize = 20 } = options;

    const userIds = await redis.smembers(REDIS_KEYS.checkoutUsers(checkoutId));

    if (!userIds.length) {
      return { items: [], total: 0, page, pageSize, hasMore: false };
    }

    const users = await Promise.all(userIds.map((id) => this.get(id)));

    // Filter out nulls and sort by lastActiveAt
    const filtered = users
      .filter((u): u is User => u !== null)
      .sort(
        (a, b) =>
          new Date(b.lastActiveAt).getTime() -
          new Date(a.lastActiveAt).getTime(),
      );

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

  async addWallet(userId: string, wallet: UserWallet): Promise<User> {
    const redis = getRedis();
    const user = await this.get(userId);

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const normalizedAddress = wallet.address.toLowerCase();
    const existingWallet = user.wallets.find(
      (w) => w.address.toLowerCase() === normalizedAddress,
    );

    if (existingWallet) {
      // Update existing wallet
      existingWallet.chainIds = [
        ...new Set([...existingWallet.chainIds, ...wallet.chainIds]),
      ];
      existingWallet.lastActive = wallet.lastActive;
    } else {
      // Add new wallet
      user.wallets.push({
        ...wallet,
        address: normalizedAddress,
      });
      // Add address index
      await redis.set(REDIS_KEYS.userByAddress(normalizedAddress), userId);
    }

    const updated: User = {
      ...user,
      lastActiveAt: new Date().toISOString(),
    };

    await redis.set(REDIS_KEYS.user(userId), updated);
    return updated;
  }

  async updateStats(
    userId: string,
    stats: {
      transactionCount?: number;
      successfulTransactionCount?: number;
      totalVolumeUsd?: string;
    },
  ): Promise<User> {
    const redis = getRedis();
    const user = await this.get(userId);

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const updated: User = {
      ...user,
      transactionCount:
        stats.transactionCount !== undefined
          ? user.transactionCount + stats.transactionCount
          : user.transactionCount,
      successfulTransactionCount:
        stats.successfulTransactionCount !== undefined
          ? user.successfulTransactionCount + stats.successfulTransactionCount
          : user.successfulTransactionCount,
      totalVolumeUsd: stats.totalVolumeUsd ?? user.totalVolumeUsd,
      lastActiveAt: new Date().toISOString(),
    };

    await redis.set(REDIS_KEYS.user(userId), updated);
    return updated;
  }
}
