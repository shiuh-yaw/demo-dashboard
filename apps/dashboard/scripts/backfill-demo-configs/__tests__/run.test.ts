/**
 * Tests for the unified-DemoConfig backfill orchestrator.
 *
 * Mirrors the shape of `backfill-remittance/__tests__/run.test.ts`:
 *   - happy path (each kind round-trips into a Brand + DemoConfig row).
 *   - skipped records (orphan owner, malformed theme, missing record).
 *   - idempotency (re-running yields zero new rows; second pass dedupes).
 *   - partial failure (one record throws, others still land).
 *
 * Uses the in-memory Redis fake + the Redis service implementations so
 * the test stays unit-scoped (no Postgres). The Postgres impl is
 * exercised by the parity suite.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { REDIS_KEYS, type RedisClient } from "@/lib/redis";
import { RedisBrandService } from "@/lib/services/redis/brands";
import { RedisDemoConfigService } from "@/lib/services/redis/demo-configs";
import { createFakeRedis } from "@/lib/services/__tests__/fake-redis";
import type {
  StoredCheckoutConfig,
  StoredEarnConfig,
  StoredTradeConfig,
  StoredVisaDirectConfig,
  StoredWalletConfig,
} from "@/lib/types/dashboard";
import type {
  BrandService,
  DemoConfigService,
} from "@/lib/services/types";

import { runDemoConfigsBackfill } from "../run";

function makeEarn(over: Partial<StoredEarnConfig> = {}): StoredEarnConfig {
  return {
    id: "earn_1",
    name: "Earn USDC",
    description: "Lend USDC",
    config: {
      theme: { primaryColor: "#1a56db", accentColor: "#3b82f6" },
      branding: { logo: "custom", logoUrl: "https://e.com/logo.png" },
    },
    ownerId: "owner-1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...over,
  } as StoredEarnConfig;
}

function makeWallet(
  over: Partial<StoredWalletConfig> = {},
): StoredWalletConfig {
  return {
    id: "wallet_1",
    name: "Wallet demo",
    description: "Wallet flow",
    config: {
      theme: { primaryColor: "#10b981", accentColor: "#34d399" },
      branding: { logo: "https://w.com/logo.png", appName: "Wallet" },
    },
    ownerId: "owner-1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...over,
  } as StoredWalletConfig;
}

function makeTrade(over: Partial<StoredTradeConfig> = {}): StoredTradeConfig {
  return {
    id: "trade_1",
    name: "Trade demo",
    description: "Trading flow",
    config: {
      // Trade has no first-class theme on its TS type; we stash one inside
      // the opaque `config` field for the backfill to find.
      theme: { primaryColor: "#fb923c" },
      branding: { logoUrl: "https://t.com/logo.png" },
    } as StoredTradeConfig["config"] & {
      theme: { primaryColor: string };
      branding: { logoUrl: string };
    },
    ownerId: "owner-1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...over,
  } as StoredTradeConfig;
}

function makeVisaDirect(
  over: Partial<StoredVisaDirectConfig> = {},
): StoredVisaDirectConfig {
  return {
    id: "visa_1",
    name: "Visa Direct demo",
    description: "Card push",
    config: {
      theme: { primaryColor: "#4779ff" },
      branding: { logoUrl: "https://v.com/logo.png" },
    },
    ownerId: "owner-1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...over,
  } as StoredVisaDirectConfig;
}

function makeCheckout(
  over: Partial<StoredCheckoutConfig> = {},
): StoredCheckoutConfig {
  return {
    id: "checkout_1",
    name: "Checkout demo",
    description: "Pay flow",
    config: {
      theme: { primaryColor: "#ec4899" },
      branding: { logo: "https://c.com/logo.png" },
    } as StoredCheckoutConfig["config"],
    ownerId: "owner-1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...over,
  } as StoredCheckoutConfig;
}

async function seedEarn(redis: RedisClient, c: StoredEarnConfig) {
  await redis.set(REDIS_KEYS.earnConfig(c.id), c);
  await redis.sadd(REDIS_KEYS.earnConfigList, c.id);
}
async function seedWallet(redis: RedisClient, c: StoredWalletConfig) {
  await redis.set(REDIS_KEYS.walletConfig(c.id), c);
  await redis.sadd(REDIS_KEYS.walletConfigList, c.id);
}
async function seedTrade(redis: RedisClient, c: StoredTradeConfig) {
  await redis.set(REDIS_KEYS.tradeConfig(c.id), c);
  await redis.sadd(REDIS_KEYS.tradeConfigList, c.id);
}
async function seedVisaDirect(
  redis: RedisClient,
  c: StoredVisaDirectConfig,
) {
  await redis.set(REDIS_KEYS.visaDirectConfig(c.id), c);
  await redis.sadd(REDIS_KEYS.visaDirectConfigList, c.id);
}
async function seedCheckout(
  redis: RedisClient,
  c: StoredCheckoutConfig,
) {
  await redis.set(REDIS_KEYS.checkoutConfig(c.id), c);
  await redis.sadd(REDIS_KEYS.checkoutConfigList, c.id);
}

describe("runDemoConfigsBackfill — happy path (each kind)", () => {
  let redis: RedisClient;
  let brands: BrandService;
  let demoConfigs: DemoConfigService;

  beforeEach(() => {
    redis = createFakeRedis();
    brands = new RedisBrandService(redis);
    demoConfigs = new RedisDemoConfigService(redis);
  });

  it("creates Brand + DemoConfig for an earn record and preserves the id", async () => {
    await seedEarn(redis, makeEarn());
    const report = await runDemoConfigsBackfill({
      redis,
      brands,
      demoConfigs,
      kinds: ["earn"],
    });
    expect(report.totals.created).toBe(1);
    expect(report.totals.failed).toBe(0);
    const all = await demoConfigs.list({ kind: "earn" });
    expect(all).toHaveLength(1);
    expect(all[0]!.id).toBe("earn_1"); // Q-014
    expect(all[0]!.kind).toBe("earn");
    expect(all[0]!.brandId).toMatch(/^bf_[a-f0-9]{24}$/);
    expect(all[0]!.themeOverrides).toBeNull();
    const allBrands = await brands.list();
    expect(allBrands).toHaveLength(1);
    expect(allBrands[0]!.id).toBe(all[0]!.brandId);
  });

  it("creates Brand + DemoConfig for a wallet record", async () => {
    await seedWallet(redis, makeWallet());
    const report = await runDemoConfigsBackfill({
      redis,
      brands,
      demoConfigs,
      kinds: ["wallet"],
    });
    expect(report.totals.created).toBe(1);
    const all = await demoConfigs.list({ kind: "wallet" });
    expect(all[0]!.id).toBe("wallet_1");
  });

  it("creates Brand + DemoConfig for a trade record (fallback brand extractor)", async () => {
    await seedTrade(redis, makeTrade());
    const report = await runDemoConfigsBackfill({
      redis,
      brands,
      demoConfigs,
      kinds: ["trade"],
    });
    expect(report.totals.created).toBe(1);
    const all = await demoConfigs.list({ kind: "trade" });
    expect(all[0]!.id).toBe("trade_1");
    expect(all[0]!.brandId).toMatch(/^bf_[a-f0-9]{24}$/);
  });

  it("creates Brand + DemoConfig for a visa-direct record", async () => {
    await seedVisaDirect(redis, makeVisaDirect());
    const report = await runDemoConfigsBackfill({
      redis,
      brands,
      demoConfigs,
      kinds: ["visa-direct"],
    });
    expect(report.totals.created).toBe(1);
    const all = await demoConfigs.list({ kind: "visa-direct" });
    expect(all[0]!.id).toBe("visa_1");
  });

  it("creates Brand + DemoConfig for a checkout record", async () => {
    await seedCheckout(redis, makeCheckout());
    const report = await runDemoConfigsBackfill({
      redis,
      brands,
      demoConfigs,
      kinds: ["checkout"],
    });
    expect(report.totals.created).toBe(1);
    const all = await demoConfigs.list({ kind: "checkout" });
    expect(all[0]!.id).toBe("checkout_1");
  });

  it("walks every kind in one run and reports per-kind totals", async () => {
    await seedEarn(redis, makeEarn());
    await seedWallet(redis, makeWallet());
    await seedTrade(redis, makeTrade());
    await seedVisaDirect(redis, makeVisaDirect());
    await seedCheckout(redis, makeCheckout());
    const report = await runDemoConfigsBackfill({
      redis,
      brands,
      demoConfigs,
    });
    expect(report.totals.created).toBe(5);
    expect(report.totals.failed).toBe(0);
    expect(report.byKind.earn.created).toBe(1);
    expect(report.byKind.wallet.created).toBe(1);
    expect(report.byKind.trade.created).toBe(1);
    expect(report.byKind["visa-direct"].created).toBe(1);
    expect(report.byKind.checkout.created).toBe(1);
  });
});

describe("runDemoConfigsBackfill — skips (missing brand fields, orphans)", () => {
  let redis: RedisClient;
  let brands: BrandService;
  let demoConfigs: DemoConfigService;

  beforeEach(() => {
    redis = createFakeRedis();
    brands = new RedisBrandService(redis);
    demoConfigs = new RedisDemoConfigService(redis);
  });

  it("skips an earn record with no ownerId", async () => {
    await seedEarn(redis, makeEarn({ id: "orph", ownerId: undefined }));
    const report = await runDemoConfigsBackfill({
      redis,
      brands,
      demoConfigs,
      kinds: ["earn"],
    });
    expect(report.totals.skipped).toBe(1);
    expect(report.results[0]!.reason).toMatch(/ownerId/);
  });

  it("skips a wallet record with no primaryColor", async () => {
    await seedWallet(
      redis,
      makeWallet({
        id: "no_color",
        config: {
          theme: {},
          branding: { logo: "https://w.com/logo.png" },
        } as StoredWalletConfig["config"],
      }),
    );
    const report = await runDemoConfigsBackfill({
      redis,
      brands,
      demoConfigs,
      kinds: ["wallet"],
    });
    expect(report.totals.skipped).toBe(1);
    expect(report.results[0]!.reason).toMatch(/primaryColor/);
  });

  it("skips when the list id points at a missing record", async () => {
    await redis.sadd(REDIS_KEYS.earnConfigList, "ghost");
    const report = await runDemoConfigsBackfill({
      redis,
      brands,
      demoConfigs,
      kinds: ["earn"],
    });
    expect(report.totals.skipped).toBe(1);
    expect(report.results[0]!.source.id).toBe("ghost");
    expect(report.results[0]!.reason).toMatch(/missing/i);
  });
});

describe("runDemoConfigsBackfill — idempotency", () => {
  let redis: RedisClient;
  let brands: BrandService;
  let demoConfigs: DemoConfigService;

  beforeEach(() => {
    redis = createFakeRedis();
    brands = new RedisBrandService(redis);
    demoConfigs = new RedisDemoConfigService(redis);
  });

  it("re-running with the same data yields zero new rows (deduped)", async () => {
    await seedEarn(redis, makeEarn());
    const first = await runDemoConfigsBackfill({
      redis,
      brands,
      demoConfigs,
      kinds: ["earn"],
    });
    expect(first.totals.created).toBe(1);

    const second = await runDemoConfigsBackfill({
      redis,
      brands,
      demoConfigs,
      kinds: ["earn"],
    });
    expect(second.totals.created).toBe(0);
    expect(second.totals.deduped).toBe(1);
    expect(await demoConfigs.list({ kind: "earn" })).toHaveLength(1);
  });

  it("collapses two records sharing theme + owner onto one Brand", async () => {
    await seedEarn(redis, makeEarn({ id: "earn_a" }));
    await seedEarn(redis, makeEarn({ id: "earn_b", name: "Other" }));
    const report = await runDemoConfigsBackfill({
      redis,
      brands,
      demoConfigs,
      kinds: ["earn"],
    });
    expect(report.totals.created).toBe(2);
    expect(await demoConfigs.list({ kind: "earn" })).toHaveLength(2);
    expect(await brands.list()).toHaveLength(1);
  });

  it("preserves createdAt across re-runs (upsert semantics)", async () => {
    await seedEarn(redis, makeEarn());
    await runDemoConfigsBackfill({
      redis,
      brands,
      demoConfigs,
      kinds: ["earn"],
    });
    const before = (await demoConfigs.get("earn_1"))!;
    await new Promise((r) => setTimeout(r, 5));
    await runDemoConfigsBackfill({
      redis,
      brands,
      demoConfigs,
      kinds: ["earn"],
    });
    const after = (await demoConfigs.get("earn_1"))!;
    expect(after.createdAt.getTime()).toBe(before.createdAt.getTime());
    expect(after.updatedAt.getTime()).toBeGreaterThanOrEqual(
      before.updatedAt.getTime(),
    );
  });
});

describe("runDemoConfigsBackfill — partial failure", () => {
  let redis: RedisClient;
  let brands: BrandService;
  let demoConfigs: DemoConfigService;

  beforeEach(() => {
    redis = createFakeRedis();
    brands = new RedisBrandService(redis);
    demoConfigs = new RedisDemoConfigService(redis);
  });

  it("keeps going when one record's upsertWithId throws", async () => {
    await seedEarn(redis, makeEarn({ id: "earn_ok" }));
    await seedEarn(redis, makeEarn({ id: "earn_bad" }));
    const calls: string[] = [];
    const failing: DemoConfigService = {
      create: demoConfigs.create.bind(demoConfigs),
      get: demoConfigs.get.bind(demoConfigs),
      list: demoConfigs.list.bind(demoConfigs),
      update: demoConfigs.update.bind(demoConfigs),
      delete: demoConfigs.delete.bind(demoConfigs),
      upsertWithId: async (id, input) => {
        calls.push(id);
        if (id === "earn_bad") throw new Error("simulated");
        return demoConfigs.upsertWithId(id, input);
      },
    };
    const report = await runDemoConfigsBackfill({
      redis,
      brands,
      demoConfigs: failing,
      kinds: ["earn"],
    });
    expect(report.totals.created).toBe(1);
    expect(report.totals.failed).toBe(1);
    expect(calls).toHaveLength(2);
    const failure = report.results.find((r) => r.outcome === "failed");
    expect(failure?.reason).toMatch(/simulated/);
  });
});
