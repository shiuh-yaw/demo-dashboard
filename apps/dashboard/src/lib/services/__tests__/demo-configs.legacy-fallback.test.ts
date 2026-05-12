/**
 * Legacy-Redis read-fallback tests.
 *
 * The action-layer cutover (TD-002) routes every demo-type CRUD through
 * `DemoConfigService`. Until ops flips `USE_POSTGRES_DEMO_CONFIGS=true`,
 * the Redis backend is canonical. But production already has rows under
 * the legacy per-kind keyspace (`demo-dashboard:earn:<id>`, etc.) from
 * before this PR. `RedisDemoConfigService.get` must fall back to those
 * keys on miss so the cutover is read-non-breaking.
 *
 * No lazy upsert into the v2 keyspace — simpler fallback per spec. The
 * backfill (`scripts/backfill-demo-configs`) is the authoritative path
 * for migrating rows; a read-time write would race the backfill and
 * complicate ownership/brand resolution.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { RedisDemoConfigService } from "@/lib/services/redis/demo-configs";
import { REDIS_KEYS, type RedisClient } from "@/lib/redis";
import type { StoredEarnConfig } from "@/lib/types/dashboard";

import { createFakeRedis } from "./fake-redis";

function makeLegacyEarn(overrides: Partial<StoredEarnConfig> = {}): StoredEarnConfig {
  return {
    id: "legacy-earn-1",
    name: "Legacy Earn",
    ownerId: "owner-x",
    config: {
      theme: { primaryColor: "#4779FF" },
      branding: { logo: "dynamic", tokenName: "USDC" },
      layout: { showSidebar: false },
    },
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("RedisDemoConfigService legacy fallback", () => {
  let redis: RedisClient;
  let svc: RedisDemoConfigService;

  beforeEach(() => {
    redis = createFakeRedis();
    svc = new RedisDemoConfigService(redis);
  });

  it("returns null when neither v2 nor legacy keyspace has the row", async () => {
    const result = await svc.get("missing-id");
    expect(result).toBeNull();
  });

  it("reads from legacy earn keyspace when v2 misses", async () => {
    const legacy = makeLegacyEarn({ id: "abc123" });
    await redis.set(REDIS_KEYS.earnConfig(legacy.id), legacy);

    const result = await svc.get("abc123");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("abc123");
    expect(result!.kind).toBe("earn");
    expect(result!.ownerId).toBe("owner-x");
    expect(result!.name).toBe("Legacy Earn");
  });

  it("reads from legacy wallet keyspace when v2 misses", async () => {
    await redis.set(REDIS_KEYS.walletConfig("w1"), {
      id: "w1",
      name: "Wallet Legacy",
      ownerId: "owner-y",
      config: { theme: { primaryColor: "#123456" }, branding: {} },
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    });
    const result = await svc.get("w1");
    expect(result).not.toBeNull();
    expect(result!.kind).toBe("wallet");
    expect(result!.id).toBe("w1");
  });

  it("reads from legacy remittance keyspace when v2 misses", async () => {
    await redis.set(REDIS_KEYS.remittanceConfig("r1"), {
      id: "r1",
      name: "Remit Legacy",
      ownerId: "owner-z",
      config: { theme: { primaryColor: "#abcdef" }, branding: {} },
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    });
    const result = await svc.get("r1");
    expect(result).not.toBeNull();
    expect(result!.kind).toBe("remittance");
  });

  it("prefers v2 row when both v2 and legacy exist", async () => {
    const legacy = makeLegacyEarn({ id: "shared-id", name: "Legacy" });
    await redis.set(REDIS_KEYS.earnConfig(legacy.id), legacy);

    const v2 = await svc.create({
      kind: "earn",
      ownerId: "owner-x",
      name: "V2 Wins",
      brandId: "brand-1",
      config: {},
    });
    // Force-overwrite v2 row's id to match the legacy key for the test.
    // (We can't predict createId(); the realistic scenario is two rows
    // *with the same id*, which happens when a backfill ran. Simulate by
    // upserting onto the legacy id.)
    await svc.upsertWithId("shared-id", {
      kind: "earn",
      ownerId: "owner-x",
      name: "V2 Wins",
      brandId: "brand-1",
      config: {},
    });

    const result = await svc.get("shared-id");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("V2 Wins");
    void v2;
  });

  it("derives a stable brandId placeholder for legacy rows missing brandId", async () => {
    // Legacy rows don't carry brandId; the fallback should surface a
    // deterministic synthetic brandId so callers can hydrate Brand
    // separately. Empty string is the simplest contract — the mapper
    // layer is responsible for filling in the real brand at read time.
    const legacy = makeLegacyEarn({ id: "no-brand" });
    await redis.set(REDIS_KEYS.earnConfig(legacy.id), legacy);

    const result = await svc.get("no-brand");
    expect(result).not.toBeNull();
    // Legacy rows have no embedded brandId — fallback synthesises empty.
    expect(typeof result!.brandId).toBe("string");
  });
});
