import { beforeEach, describe, expect, it } from "vitest";

import { REDIS_KEYS, type RedisClient } from "@/lib/redis";
import { RedisBrandService } from "@/lib/services/redis/brands";
import { RedisRemittanceConfigService } from "@/lib/services/redis/remittance";
import { createFakeRedis } from "@/lib/services/__tests__/fake-redis";
import type { StoredRemittanceConfig } from "@/lib/types/dashboard";
import type {
  BrandService,
  RemittanceConfigService,
} from "@/lib/services/types";

import { runRemittanceBackfill } from "../run";

function makeStored(
  over: Partial<StoredRemittanceConfig> = {},
): StoredRemittanceConfig {
  return {
    id: "rem_1",
    name: "US to BR",
    description: "Stablecoin remittance",
    config: {
      theme: { primaryColor: "#1a56db", secondaryColor: "#1e40af" },
      branding: { logoUrl: "https://example.com/logo.png" },
    },
    ownerId: "owner-1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...over,
  };
}

async function seed(redis: RedisClient, c: StoredRemittanceConfig) {
  await redis.set(REDIS_KEYS.remittanceConfig(c.id), c);
  await redis.sadd(REDIS_KEYS.remittanceConfigList, c.id);
}

describe("runRemittanceBackfill — happy path", () => {
  let redis: RedisClient;
  let brands: BrandService;
  let remittanceConfigs: RemittanceConfigService;

  beforeEach(() => {
    redis = createFakeRedis();
    brands = new RedisBrandService(redis);
    remittanceConfigs = new RedisRemittanceConfigService(redis);
  });

  it("creates a Brand + RemittanceConfig and preserves the legacy id (Q-014)", async () => {
    await seed(redis, makeStored());
    const report = await runRemittanceBackfill({
      redis,
      brands,
      remittanceConfigs,
    });
    expect(report.totals.created).toBe(1);
    expect(report.totals.deduped).toBe(0);
    expect(report.totals.skipped).toBe(0);
    expect(report.totals.failed).toBe(0);

    const all = await remittanceConfigs.list();
    expect(all).toHaveLength(1);
    expect(all[0]!.id).toBe("rem_1"); // Q-014: legacy id preserved
    expect(all[0]!.ownerId).toBe("owner-1");
    expect(all[0]!.brandId).toMatch(/^bf_[a-f0-9]{24}$/);
    expect(all[0]!.config).toEqual({
      theme: { primaryColor: "#1a56db", secondaryColor: "#1e40af" },
      branding: { logoUrl: "https://example.com/logo.png" },
    });

    const allBrands = await brands.list();
    expect(allBrands).toHaveLength(1);
    expect(allBrands[0]!.id).toBe(all[0]!.brandId);
    expect(allBrands[0]!.primaryColor).toBe("#1a56db");
  });

  it("logs progress to the injected logger", async () => {
    await seed(redis, makeStored());
    const logs: string[] = [];
    await runRemittanceBackfill({
      redis,
      brands,
      remittanceConfigs,
      log: (m) => logs.push(m),
    });
    expect(logs.some((l) => /created/.test(l) && /rem_1/.test(l))).toBe(true);
  });
});

describe("runRemittanceBackfill — skips", () => {
  let redis: RedisClient;
  let brands: BrandService;
  let remittanceConfigs: RemittanceConfigService;

  beforeEach(() => {
    redis = createFakeRedis();
    brands = new RedisBrandService(redis);
    remittanceConfigs = new RedisRemittanceConfigService(redis);
  });

  it("skips a record with no ownerId (orphan legacy config)", async () => {
    await seed(redis, makeStored({ id: "orph", ownerId: undefined }));
    const report = await runRemittanceBackfill({
      redis,
      brands,
      remittanceConfigs,
    });
    expect(report.totals.skipped).toBe(1);
    expect(report.results[0]!.reason).toMatch(/ownerId/);
    expect(await remittanceConfigs.list()).toHaveLength(0);
  });

  it("skips a record with no theme.primaryColor", async () => {
    await seed(
      redis,
      makeStored({
        id: "no_theme",
        config: { theme: undefined, branding: { logoUrl: undefined } },
      }),
    );
    const report = await runRemittanceBackfill({
      redis,
      brands,
      remittanceConfigs,
    });
    expect(report.totals.skipped).toBe(1);
    expect(report.results[0]!.reason).toMatch(/primaryColor/);
  });

  it("skips a record whose primaryColor is not a hex string", async () => {
    await seed(
      redis,
      makeStored({
        id: "bad_hex",
        config: {
          theme: {
            primaryColor: "rgba(255,0,0,0.5)" as unknown as string,
          },
        },
      }),
    );
    const report = await runRemittanceBackfill({
      redis,
      brands,
      remittanceConfigs,
    });
    expect(report.totals.skipped).toBe(1);
    expect(report.results[0]!.reason).toMatch(/primaryColor/);
  });

  it("skips when the list id has no underlying record", async () => {
    await redis.sadd(REDIS_KEYS.remittanceConfigList, "ghost");
    const report = await runRemittanceBackfill({
      redis,
      brands,
      remittanceConfigs,
    });
    expect(report.totals.skipped).toBe(1);
    expect(report.results[0]!.source.id).toBe("ghost");
    expect(report.results[0]!.reason).toMatch(/missing/i);
  });
});

describe("runRemittanceBackfill — idempotency + dedupe", () => {
  let redis: RedisClient;
  let brands: BrandService;
  let remittanceConfigs: RemittanceConfigService;

  beforeEach(() => {
    redis = createFakeRedis();
    brands = new RedisBrandService(redis);
    remittanceConfigs = new RedisRemittanceConfigService(redis);
  });

  it("re-running with the same data yields zero new rows (deduped)", async () => {
    await seed(redis, makeStored());
    const first = await runRemittanceBackfill({
      redis,
      brands,
      remittanceConfigs,
    });
    expect(first.totals.created).toBe(1);

    const second = await runRemittanceBackfill({
      redis,
      brands,
      remittanceConfigs,
    });
    expect(second.totals.created).toBe(0);
    expect(second.totals.deduped).toBe(1);
    expect(await remittanceConfigs.list()).toHaveLength(1);
    expect(await brands.list()).toHaveLength(1);
  });

  it("creates one Brand for two RemittanceConfigs that share theme + owner", async () => {
    await seed(redis, makeStored({ id: "rem_a" }));
    await seed(redis, makeStored({ id: "rem_b", name: "Other" }));
    const report = await runRemittanceBackfill({
      redis,
      brands,
      remittanceConfigs,
    });
    expect(report.totals.created).toBe(2);
    expect(await remittanceConfigs.list()).toHaveLength(2);
    // Both configs collapse onto the same backfilled Brand id.
    expect(await brands.list()).toHaveLength(1);
  });

  it("preserves the original createdAt across re-runs (upsert semantics)", async () => {
    await seed(redis, makeStored());
    const first = await runRemittanceBackfill({
      redis,
      brands,
      remittanceConfigs,
    });
    expect(first.totals.created).toBe(1);
    const before = (await remittanceConfigs.get("rem_1"))!;
    await new Promise((r) => setTimeout(r, 5));
    await runRemittanceBackfill({ redis, brands, remittanceConfigs });
    const after = (await remittanceConfigs.get("rem_1"))!;
    expect(after.createdAt.getTime()).toBe(before.createdAt.getTime());
    expect(after.updatedAt.getTime()).toBeGreaterThanOrEqual(
      before.updatedAt.getTime(),
    );
  });
});

describe("runRemittanceBackfill — partial failure", () => {
  let redis: RedisClient;
  let brands: BrandService;
  let remittanceConfigs: RemittanceConfigService;

  beforeEach(() => {
    redis = createFakeRedis();
    brands = new RedisBrandService(redis);
    remittanceConfigs = new RedisRemittanceConfigService(redis);
  });

  it("keeps going when one record's upsertWithId throws", async () => {
    await seed(redis, makeStored({ id: "rem_ok" }));
    await seed(redis, makeStored({ id: "rem_bad" }));
    const calls: string[] = [];
    const failing: RemittanceConfigService = {
      create: remittanceConfigs.create.bind(remittanceConfigs),
      get: remittanceConfigs.get.bind(remittanceConfigs),
      list: remittanceConfigs.list.bind(remittanceConfigs),
      update: remittanceConfigs.update.bind(remittanceConfigs),
      delete: remittanceConfigs.delete.bind(remittanceConfigs),
      upsertWithId: async (id, input) => {
        calls.push(id);
        if (id === "rem_bad") throw new Error("simulated");
        return remittanceConfigs.upsertWithId(id, input);
      },
    };
    const report = await runRemittanceBackfill({
      redis,
      brands,
      remittanceConfigs: failing,
    });
    expect(report.totals.created).toBe(1);
    expect(report.totals.failed).toBe(1);
    expect(calls).toHaveLength(2); // both attempted
    const failure = report.results.find((r) => r.outcome === "failed");
    expect(failure?.reason).toMatch(/simulated/);
  });
});
