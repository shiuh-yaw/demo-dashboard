import { beforeEach, describe, expect, it } from "vitest";

import { REDIS_KEYS } from "@/lib/redis";
import { RedisProspectService } from "@/lib/services/redis/prospects";
import type {
  ProspectProfile,
  StoredCheckoutConfig,
  StoredEarnConfig,
  StoredRemittanceConfig,
  StoredWalletConfig,
} from "@/lib/types/dashboard";
import { createFakeRedis } from "@/lib/services/__tests__/fake-redis";
import type { RedisClient } from "@/lib/redis";
import type { ProspectService } from "@/lib/services/types";

import { runBackfill } from "../run";

function makeProfile(over: Partial<ProspectProfile> = {}): ProspectProfile {
  return {
    id: "bp_1",
    name: "Acme",
    prospect: {
      logo: "custom",
      logoUrl: "https://x/logo.png",
      primaryColor: "#FF0000",
      accentColor: "#0000FF",
    },
    demos: {},
    ownerId: "owner-1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...over,
  };
}

async function seedProfile(redis: RedisClient, profile: ProspectProfile) {
  await redis.set(REDIS_KEYS.prospectProfile(profile.id), profile);
  await redis.sadd(REDIS_KEYS.prospectProfileList, profile.id);
}

describe("runBackfill — ProspectProfile happy path", () => {
  let redis: RedisClient;
  let prospects: ProspectService;
  let logs: string[];

  beforeEach(() => {
    redis = createFakeRedis();
    prospects = new RedisProspectService(redis);
    logs = [];
  });

  it("creates one Prospect for one ProspectProfile", async () => {
    await seedProfile(redis, makeProfile());

    const report = await runBackfill({
      redis,
      prospects,
      log: (m) => logs.push(m),
    });

    expect(report.totals.created).toBe(1);
    expect(report.totals.deduped).toBe(0);
    expect(report.totals.skipped).toBe(0);
    expect(report.totals.failed).toBe(0);
    expect(report.results).toHaveLength(1);
    expect(report.results[0]!.outcome).toBe("created");
    expect(report.results[0]!.source.kind).toBe("prospect-profile");

    const all = await prospects.list();
    expect(all).toHaveLength(1);
    expect(all[0]!.ownerId).toBe("owner-1");
    expect(all[0]!.primaryColor).toBe("#ff0000");
  });
});

async function seedEarn(redis: RedisClient, c: StoredEarnConfig) {
  await redis.set(REDIS_KEYS.earnConfig(c.id), c);
  await redis.sadd(REDIS_KEYS.earnConfigList, c.id);
}
async function seedWallet(redis: RedisClient, c: StoredWalletConfig) {
  await redis.set(REDIS_KEYS.walletConfig(c.id), c);
  await redis.sadd(REDIS_KEYS.walletConfigList, c.id);
}
async function seedCheckout(redis: RedisClient, c: StoredCheckoutConfig) {
  await redis.set(REDIS_KEYS.checkoutConfig(c.id), c);
  await redis.sadd(REDIS_KEYS.checkoutConfigList, c.id);
}
async function seedRemittance(redis: RedisClient, c: StoredRemittanceConfig) {
  await redis.set(REDIS_KEYS.remittanceConfig(c.id), c);
  await redis.sadd(REDIS_KEYS.remittanceConfigList, c.id);
}

describe("runBackfill — orphan demo configs", () => {
  let redis: RedisClient;
  let prospects: ProspectService;
  beforeEach(() => {
    redis = createFakeRedis();
    prospects = new RedisProspectService(redis);
  });

  it("creates a Prospect for an orphan EarnConfig", async () => {
    await seedEarn(redis, {
      id: "earn_1",
      name: "Solo Earn",
      config: {
        theme: { primaryColor: "#abcdef" },
        branding: { logo: "custom", logoUrl: "https://x/e.png" },
      },
      ownerId: "owner-1",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });

    const report = await runBackfill({ redis, prospects });
    expect(report.totals.created).toBe(1);
    expect(report.results[0]!.source).toEqual({ kind: "earn", id: "earn_1" });
  });

  it("skips orphan EarnConfig that owns no theme.primaryColor", async () => {
    await seedEarn(redis, {
      id: "earn_no_theme",
      name: "Themeless",
      config: {},
      ownerId: "owner-1",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    const report = await runBackfill({ redis, prospects });
    expect(report.totals.created).toBe(0);
    expect(report.totals.skipped).toBe(1);
    expect(report.results[0]!.reason).toMatch(/primaryColor/);
  });

  it("skips an EarnConfig that's already linked to a ProspectProfile.demos.earn", async () => {
    await seedEarn(redis, {
      id: "earn_linked",
      name: "Linked",
      config: { theme: { primaryColor: "#abcdef" } },
      ownerId: "owner-1",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    await seedProfile(redis, {
      id: "bp_link",
      name: "Owner",
      prospect: { logo: "dynamic", primaryColor: "#abcdef" },
      demos: { earn: "earn_linked" },
      ownerId: "owner-1",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    const report = await runBackfill({ redis, prospects });
    // Only the ProspectProfile creates a Prospect; the linked Earn is not
    // walked again.
    expect(report.totals.created).toBe(1);
    const sources = report.results.map((r) => r.source.kind);
    expect(sources).toEqual(["prospect-profile"]);
  });

  it("walks Wallet, Checkout, Remittance keyspaces too", async () => {
    await seedWallet(redis, {
      id: "w1",
      name: "W",
      config: {
        theme: { primaryColor: "#aabbcc" },
        branding: { logo: "https://x/w.png" },
      },
      ownerId: "owner-1",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    await seedCheckout(redis, {
      id: "c1",
      name: "C",
      mode: "payment",
      config: {
        theme: { primaryColor: "#101010" },
        branding: { logo: "https://x/c.png" },
      } as unknown as StoredCheckoutConfig["config"],
      ownerId: "owner-1",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    await seedRemittance(redis, {
      id: "r1",
      name: "R",
      config: {
        theme: { primaryColor: "#aaaaaa", secondaryColor: "#bbbbbb" },
        branding: { logoUrl: "https://x/r.png" },
      },
      ownerId: "owner-1",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });

    const report = await runBackfill({ redis, prospects });
    const kinds = report.results.map((r) => r.source.kind).sort();
    expect(kinds).toEqual(["checkout", "remittance", "wallet"]);
    expect(report.totals.created).toBe(3);
  });

  it("reports skipped when a list id has no underlying record", async () => {
    // Set membership with no payload (simulates a half-deleted entry).
    await redis.sadd(REDIS_KEYS.earnConfigList, "earn_ghost");
    const report = await runBackfill({ redis, prospects });
    expect(report.totals.skipped).toBe(1);
    expect(report.results[0]!.source).toEqual({
      kind: "earn",
      id: "earn_ghost",
    });
    expect(report.results[0]!.reason).toMatch(/missing/i);
  });
});

describe("runBackfill — idempotency", () => {
  let redis: RedisClient;
  let prospects: ProspectService;
  beforeEach(() => {
    redis = createFakeRedis();
    prospects = new RedisProspectService(redis);
  });

  it("re-running with the same data yields zero new rows", async () => {
    await seedProfile(redis, makeProfile());
    const first = await runBackfill({ redis, prospects });
    expect(first.totals.created).toBe(1);

    const second = await runBackfill({ redis, prospects });
    expect(second.totals.created).toBe(0);
    expect(second.totals.deduped).toBe(1);

    const all = await prospects.list();
    expect(all).toHaveLength(1);
  });

  it("dedupes across different sources that hash to the same key", async () => {
    // Same owner + primaryColor + (no logo) for both sources collapses
    // them onto a single Prospect row.
    await seedProfile(redis, {
      ...makeProfile(),
      prospect: { logo: "dynamic", primaryColor: "#aabbcc" },
    });
    await seedEarn(redis, {
      id: "earn_dup",
      name: "Same prospect",
      config: { theme: { primaryColor: "#AABBCC" } },
      ownerId: "owner-1",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });

    const report = await runBackfill({ redis, prospects });
    expect(report.totals.created).toBe(1);
    expect(report.totals.deduped).toBe(1);
    const all = await prospects.list();
    expect(all).toHaveLength(1);
  });

  it("uses the deterministic id from hashProspectKey for new rows", async () => {
    await seedProfile(redis, makeProfile());
    await runBackfill({ redis, prospects });
    const all = await prospects.list();
    expect(all[0]!.id).toMatch(/^bf_[a-f0-9]{24}$/);
  });
});

describe("runBackfill — partial failure", () => {
  let redis: RedisClient;
  beforeEach(() => {
    redis = createFakeRedis();
  });

  it("keeps going when one record's upsertWithId throws", async () => {
    await seedProfile(redis, makeProfile());
    await seedProfile(
      redis,
      makeProfile({
        id: "bp_2",
        prospect: { logo: "dynamic", primaryColor: "#aabbcc" },
      }),
    );

    const real = new RedisProspectService(redis);
    const calls: string[] = [];
    const failingProspects: ProspectService = {
      create: real.create.bind(real),
      get: real.get.bind(real),
      list: real.list.bind(real),
      update: real.update.bind(real),
      delete: real.delete.bind(real),
      upsertWithId: async (id, input) => {
        calls.push(id);
        if (input.primaryColor === "#aabbcc") {
          throw new Error("simulated");
        }
        return real.upsertWithId(id, input);
      },
    };

    const report = await runBackfill({ redis, prospects: failingProspects });
    expect(report.totals.created).toBe(1);
    expect(report.totals.failed).toBe(1);
    expect(calls).toHaveLength(2); // both were attempted
    const failure = report.results.find((r) => r.outcome === "failed");
    expect(failure?.reason).toMatch(/simulated/);
  });
});
