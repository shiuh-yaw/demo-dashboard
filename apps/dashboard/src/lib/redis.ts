/**
 * Redis client for configuration persistence
 *
 * Priority:
 * 1. Upstash Redis (if UPSTASH_REDIS_REST_URL is set)
 * 2. Local Redis (defaults to redis://localhost:6379)
 *
 * For local development:
 * - Install Redis: `brew install redis` (macOS) or `apt-get install redis` (Linux)
 * - Start Redis: `redis-server`
 * - No env vars needed - will automatically use local Redis at redis://localhost:6379
 */
import { Redis as UpstashRedis } from "@upstash/redis";
import Redis from "ioredis";
import { env } from "@/env";

let localRedisClient: Redis | null = null;
let upstashClient: UpstashRedis | null = null;

/**
 * Check if Upstash Redis is configured
 */
function isUpstashConfigured(): boolean {
  return !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
}

/**
 * Get local Redis client (singleton)
 */
function getLocalRedisClient(): Redis {
  if (!localRedisClient) {
    localRedisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      connectTimeout: 5000,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
    });

    // Handle connection errors
    localRedisClient.on("error", (err) => {
      console.error("Redis connection error:", err.message);
    });
  }
  return localRedisClient;
}

/**
 * Get Upstash Redis client (singleton)
 */
function getUpstashClient(): UpstashRedis {
  if (!upstashClient) {
    upstashClient = new UpstashRedis({
      url: env.UPSTASH_REDIS_REST_URL!,
      token: env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return upstashClient;
}

/**
 * Unified Redis client interface
 */
export type RedisClient = {
  set(key: string, value: unknown): Promise<void | string | "OK" | null>;
  get<T = unknown>(key: string): Promise<T | null>;
  del(...keys: string[]): Promise<number>;
  sadd(key: string, ...members: string[]): Promise<number>;
  srem(key: string, ...members: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
};

/**
 * Wrap Upstash Redis to match unified API
 */
function wrapUpstash(): RedisClient {
  const client = getUpstashClient();
  return {
    async set(key: string, value: unknown) {
      await client.set(key, value);
    },
    async get<T>(key: string) {
      return await client.get<T>(key);
    },
    async del(...keys: string[]) {
      return await client.del(...keys);
    },
    async sadd(key: string, ...members: string[]) {
      let count = 0;
      for (const member of members) {
        await client.sadd(key, member);
        count++;
      }
      return count;
    },
    async srem(key: string, ...members: string[]) {
      let count = 0;
      for (const member of members) {
        await client.srem(key, member);
        count++;
      }
      return count;
    },
    async smembers(key: string) {
      return await client.smembers(key);
    },
  };
}

/**
 * Wrap local ioredis to match unified API
 */
function wrapLocalRedis(): RedisClient {
  const client = getLocalRedisClient();
  return {
    async set(key: string, value: unknown) {
      await client.set(key, JSON.stringify(value));
    },
    async get<T>(key: string) {
      const result = await client.get(key);
      if (!result) return null;
      try {
        return JSON.parse(result) as T;
      } catch {
        return result as T;
      }
    },
    async del(...keys: string[]) {
      return await client.del(...keys);
    },
    async sadd(key: string, ...members: string[]) {
      return await client.sadd(key, ...members);
    },
    async srem(key: string, ...members: string[]) {
      return await client.srem(key, ...members);
    },
    async smembers(key: string) {
      return await client.smembers(key);
    },
  };
}

/**
 * Get the Redis client instance
 * - Uses Upstash if configured
 * - Falls back to local Redis otherwise
 */
export function getRedis(): RedisClient {
  if (isUpstashConfigured()) return wrapUpstash();
  return wrapLocalRedis();
}

// Key prefixes - matches nextjs-payment-widget project for shared data
const WIDGET_PREFIX = "payment-widget";
const DASHBOARD_PREFIX = "demo-dashboard";
const CHECKOUT_PREFIX = "checkout";

// Key prefixes for organization
export const REDIS_KEYS = {
  // ==========================================================================
  // Checkout configs - shared with nextjs-payment-widget project
  // Using "payment-widget" prefix for backwards compatibility
  // ==========================================================================

  /** @deprecated Use checkoutConfig instead */
  widgetConfig: (id: string) => `${WIDGET_PREFIX}:config:${id}`,
  /** @deprecated Use checkoutConfigList instead */
  widgetConfigList: `${WIDGET_PREFIX}:configs`,

  // Checkout aliases (same keys, new names)
  checkoutConfig: (id: string) => `${WIDGET_PREFIX}:config:${id}`,
  checkoutConfigList: `${WIDGET_PREFIX}:configs`,

  // ==========================================================================
  // Coinbase onramp configs (dashboard-only)
  // ==========================================================================
  onrampConfig: (id: string) => `${DASHBOARD_PREFIX}:onramp:${id}`,
  onrampConfigList: `${DASHBOARD_PREFIX}:onramps`,

  // ==========================================================================
  // Transactions
  // ==========================================================================

  /** Single transaction by ID */
  transaction: (id: string) => `${CHECKOUT_PREFIX}:tx:${id}`,

  /** Set of transaction IDs for a checkout */
  checkoutTransactions: (checkoutId: string) =>
    `${CHECKOUT_PREFIX}:${checkoutId}:txs`,

  /** Set of pending transaction IDs (for reconciliation) */
  pendingTransactions: `${CHECKOUT_PREFIX}:tx:pending`,

  /** Index: externalId -> transactionId (unique per checkout) */
  externalIdIndex: (checkoutId: string, externalId: string) =>
    `${CHECKOUT_PREFIX}:${checkoutId}:ext:${externalId}`,

  // ==========================================================================
  // Users
  // ==========================================================================

  /** Single user by ID */
  user: (id: string) => `${CHECKOUT_PREFIX}:user:${id}`,

  /** Index: wallet address -> userId */
  userByAddress: (address: string) =>
    `${CHECKOUT_PREFIX}:user:addr:${address.toLowerCase()}`,

  /** Set of user IDs for a checkout */
  checkoutUsers: (checkoutId: string) =>
    `${CHECKOUT_PREFIX}:${checkoutId}:users`,

  // ==========================================================================
  // Stats (cached aggregates)
  // ==========================================================================

  /** Cached stats for a checkout */
  checkoutStats: (checkoutId: string) =>
    `${CHECKOUT_PREFIX}:${checkoutId}:stats`,

  // ==========================================================================
  // Earn configs (theme/branding for Earn demo)
  // ==========================================================================

  /** Single Earn config by ID */
  earnConfig: (id: string) => `${DASHBOARD_PREFIX}:earn:${id}`,

  /** Set of all Earn config IDs */
  earnConfigList: `${DASHBOARD_PREFIX}:earn:list`,

  // ==========================================================================
  // Wallet configs (theme/branding for Wallet demo)
  // ==========================================================================

  /** Single Wallet config by ID */
  walletConfig: (id: string) => `${DASHBOARD_PREFIX}:wallet:${id}`,

  /** Set of all Wallet config IDs */
  walletConfigList: `${DASHBOARD_PREFIX}:wallet:list`,

  // ==========================================================================
  // Remittance configs (theme/branding for Remittance demo)
  // ==========================================================================

  /** Single Remittance config by ID */
  remittanceConfig: (id: string) => `${DASHBOARD_PREFIX}:remittance:${id}`,

  /** Set of all Remittance config IDs */
  remittanceConfigList: `${DASHBOARD_PREFIX}:remittance:list`,

  // ==========================================================================
  // Trade configs (theme/branding for Trade demo)
  // ==========================================================================

  /** Single Trade config by ID */
  tradeConfig: (id: string) => `${DASHBOARD_PREFIX}:trade:${id}`,

  /** Set of all Trade config IDs */
  tradeConfigList: `${DASHBOARD_PREFIX}:trade:list`,

  // ==========================================================================
  // Visa Direct configs (theme/branding for Visa Direct demo)
  // ==========================================================================

  /** Single Visa Direct config by ID */
  visaDirectConfig: (id: string) => `${DASHBOARD_PREFIX}:visa-direct:${id}`,

  /** Set of all Visa Direct config IDs */
  visaDirectConfigList: `${DASHBOARD_PREFIX}:visa-direct:list`,

  // ==========================================================================
  // Brand Profiles (unified branding across demo types)
  // ==========================================================================

  /** Single brand profile by ID */
  brandProfile: (id: string) => `${DASHBOARD_PREFIX}:brand:${id}`,

  /** Set of all brand profile IDs */
  brandProfileList: `${DASHBOARD_PREFIX}:brands`,

  // ==========================================================================
  // Phase 2-brands — service-layer Brand records (separate from BrandProfile
  // above, which is the legacy rich aggregate used by lib/actions/brands.ts).
  // The new Brand shape mirrors the Postgres model so the Redis backend can
  // serve as a parity baseline behind USE_POSTGRES_BRANDS.
  // ==========================================================================

  /** Single Brand record by ID. */
  brandRecord: (id: string) => `${DASHBOARD_PREFIX}:brand-v2:${id}`,

  /** Set of all Brand record IDs. */
  brandRecordList: `${DASHBOARD_PREFIX}:brand-v2:list`,

  // ==========================================================================
  // Phase 2-transactions — canonical TransactionRecord (state-machine carrier).
  // Distinct from the legacy LI.FI-checkout `transaction` keys above; the
  // `tx-v2` namespace mirrors the Postgres `Transaction` table so the Redis
  // backend can serve as a parity baseline behind USE_POSTGRES_TRANSACTIONS.
  // ==========================================================================

  /** Single TransactionRecord by ID. */
  transactionRecord: (id: string) => `${DASHBOARD_PREFIX}:tx-v2:${id}`,

  /** Set of all TransactionRecord IDs. */
  transactionRecordList: `${DASHBOARD_PREFIX}:tx-v2:list`,
} as const;
