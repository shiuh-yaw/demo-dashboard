/**
 * In-memory fake matching the dashboard's RedisClient interface
 * (apps/dashboard/src/lib/redis.ts). Sufficient for unit-testing the
 * RedisProspectService without spinning up Redis.
 */

import type { RedisClient } from "@/lib/redis";

export function createFakeRedis(): RedisClient {
  // Strings live in `store`, sets live in `sets`. Real Redis keeps them
  // in distinct datatype namespaces; this fake mirrors that so a sadd/
  // smembers on a key never clashes with a get/set on the same key.
  const store = new Map<string, unknown>();
  const sets = new Map<string, Set<string>>();

  return {
    async set(key, value) {
      store.set(key, value);
    },
    async get<T>(key: string) {
      return (store.get(key) as T | undefined) ?? null;
    },
    async del(...keys) {
      let n = 0;
      for (const k of keys) {
        if (store.delete(k)) n++;
        if (sets.delete(k)) n++;
      }
      return n;
    },
    async sadd(key, ...members) {
      const existing = sets.get(key) ?? new Set<string>();
      let added = 0;
      for (const m of members) {
        if (!existing.has(m)) {
          existing.add(m);
          added++;
        }
      }
      sets.set(key, existing);
      return added;
    },
    async srem(key, ...members) {
      const existing = sets.get(key);
      if (!existing) return 0;
      let removed = 0;
      for (const m of members) {
        if (existing.delete(m)) removed++;
      }
      return removed;
    },
    async smembers(key) {
      const existing = sets.get(key);
      return existing ? Array.from(existing) : [];
    },
  };
}
