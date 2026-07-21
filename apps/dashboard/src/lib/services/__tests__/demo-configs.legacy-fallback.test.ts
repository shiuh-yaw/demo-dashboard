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
 * complicate ownership/prospect resolution.
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
      prospectId: "prospect-1",
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
      prospectId: "prospect-1",
      config: {},
    });

    const result = await svc.get("shared-id");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("V2 Wins");
    void v2;
  });

  it("derives a null prospectId for legacy rows missing prospectId", async () => {
    // Legacy rows don't carry prospectId; the fallback surfaces null so
    // callers can tell "unbound" apart from a real linked Prospect. The
    // mapper layer is responsible for filling in the real prospect at
    // read time if one is later resolved.
    const legacy = makeLegacyEarn({ id: "no-prospect" });
    await redis.set(REDIS_KEYS.earnConfig(legacy.id), legacy);

    const result = await svc.get("no-prospect");
    expect(result).not.toBeNull();
    expect(result!.prospectId).toBeNull();
  });

  it("reads the legacy brandId field from a v2-keyspace row predating the Phase GTM-01 rename", async () => {
    // Production Redis rows written before the Brand -> Prospect rename
    // persisted the prospect link under `brandId`, not `prospectId`. Seed
    // a raw v2-keyspace row exactly as production has it: `brandId` set,
    // no `prospectId` key at all.
    const legacyProspectId = "bf_legacy123";
    const id = "v2-legacy-brand-id";
    await redis.set(REDIS_KEYS.demoConfig("earn", id), {
      id,
      kind: "earn",
      ownerId: "owner-legacy",
      name: "Legacy Brand Row",
      description: null,
      brandId: legacyProspectId,
      themeOverrides: null,
      config: { vault: "aave-usdc" },
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    });
    await redis.sadd(REDIS_KEYS.demoConfigKindList("earn"), id);
    await redis.sadd(
      REDIS_KEYS.demoConfigOwnerKindIndex("owner-legacy", "earn"),
      id,
    );

    const result = await svc.get(id);
    expect(result).not.toBeNull();
    expect(result!.prospectId).toBe(legacyProspectId);

    const filtered = await svc.list({ prospectId: legacyProspectId });
    expect(filtered.map((r) => r.id)).toEqual([id]);
  });
});
