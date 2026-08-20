/**
 * Redis-backed store for delegated access materials.
 *
 * Rule 2: apps keep state in Redis, never Postgres. Dynamic user metadata is
 * NOT an option here - it is readable by the client, and this is key material.
 *
 * Values are sealed (AES-256-GCM) before they arrive; this module never sees
 * plaintext. Keyed by `delegation:<userId>:<walletId>` so every read is
 * naturally scoped to the caller's own user.
 */

import { Redis } from "@upstash/redis";

import { env } from "@/lib/env";

export interface StoredDelegation {
  walletId: string;
  walletAddress: string;
  chain: string;
  /** AES-GCM sealed ServerKeyShare JSON. */
  encShare: string;
  /** AES-GCM sealed per-wallet API key. */
  encApiKey: string;
  /** Which RSA key decrypted the webhook envelope, for rotation. */
  kid?: string | null;
  /** `WaasWallets.id` from the webhook. Optional on sign; kept for debugging. */
  shareSetId?: string | null;
  createdAt: string;
  lastUsedAt?: string | null;
}

let client: Redis | null = null;

/** Null when Upstash isn't configured, so callers can degrade instead of throwing. */
export function getDelegationRedis(): Redis | null {
  if (client) return client;
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  client = new Redis({ url, token });
  return client;
}

export function isDelegationStoreConfigured(): boolean {
  return getDelegationRedis() !== null;
}

const key = (userId: string, walletId: string) =>
  `delegation:${userId}:${walletId}`;
const userIndex = (userId: string) => `delegation:index:${userId}`;

export async function putDelegation(
  userId: string,
  record: StoredDelegation,
): Promise<void> {
  const redis = getDelegationRedis();
  if (!redis) throw new Error("Delegation store is not configured");
  await redis.set(key(userId, record.walletId), record);
  // Index so status can list without SCAN.
  await redis.sadd(userIndex(userId), record.walletId);
}

export async function getDelegation(
  userId: string,
  walletId: string,
): Promise<StoredDelegation | null> {
  const redis = getDelegationRedis();
  if (!redis) return null;
  return (await redis.get<StoredDelegation>(key(userId, walletId))) ?? null;
}

/**
 * Look up by wallet ADDRESS. Records are keyed by Dynamic's `walletId`, which
 * the browser does not reliably know (`walletAccount.id` is the SDK's own
 * identifier), so signing resolves through the address instead. One index read
 * plus a fan-out over that user's own wallets - a handful, by construction.
 */
export async function getDelegationByAddress(
  userId: string,
  address: string,
): Promise<StoredDelegation | null> {
  const redis = getDelegationRedis();
  if (!redis) return null;
  const walletIds = await redis.smembers(userIndex(userId));
  if (walletIds.length === 0) return null;

  const records = await Promise.all(
    walletIds.map((walletId) =>
      redis.get<StoredDelegation>(key(userId, walletId)),
    ),
  );
  const wanted = address.toLowerCase();
  return (
    records.find((r) => r?.walletAddress.toLowerCase() === wanted) ?? null
  );
}

export async function touchDelegation(
  userId: string,
  walletId: string,
): Promise<void> {
  const existing = await getDelegation(userId, walletId);
  if (!existing) return;
  await putDelegation(userId, { ...existing, lastUsedAt: new Date().toISOString() });
}

/**
 * Delete by walletId across users. The revoked webhook carries no userId we can
 * trust to scope by; the share is inert after the reshare regardless, so
 * removing every record for that wallet is the correct, safe behaviour.
 */
export async function deleteDelegationsForWallet(
  walletId: string,
  userIdHint?: string,
): Promise<number> {
  const redis = getDelegationRedis();
  if (!redis) return 0;

  if (userIdHint) {
    const removed = await redis.del(key(userIdHint, walletId));
    await redis.srem(userIndex(userIdHint), walletId);
    return removed;
  }

  // No hint: fall back to scanning the delegation keyspace. Small by
  // construction (one entry per delegated wallet in a demo environment).
  let cursor = "0";
  let removed = 0;
  do {
    const [next, keys] = await redis.scan(cursor, {
      match: `delegation:*:${walletId}`,
      count: 100,
    });
    cursor = String(next);
    for (const k of keys) {
      removed += await redis.del(k);
      const owner = k.split(":")[1];
      if (owner) await redis.srem(userIndex(owner), walletId);
    }
  } while (cursor !== "0");
  return removed;
}

