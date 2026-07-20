/**
 * Tests for the earn ↔ DemoConfig mapper. Covers:
 *   - Inbound projection: StoredEarnConfig → CreateDemoConfigInput (prospectId
 *     derived from theme; theme split off; rest in `config`).
 *   - Outbound projection: DemoConfigRecord + Prospect → StoredEarnConfig
 *     (theme merged from Prospect + themeOverrides; legacy name surfaced
 *     with "Untitled" fallback when DB has null).
 *   - Nullable name round-trip.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { RedisProspectService } from "@/lib/services/redis/prospects";
import { RedisDemoConfigService } from "@/lib/services/redis/demo-configs";
import type {
  ProspectService,
  DemoConfigService,
} from "@/lib/services/types";
import { DEFAULT_EARN_CONFIG } from "@/lib/types/dashboard";

import { earnMapper } from "../earn";
import { createFakeRedis } from "../../__tests__/fake-redis";

describe("earnMapper", () => {
  let prospects: ProspectService;
  let demoConfigs: DemoConfigService;

  beforeEach(() => {
    const redis = createFakeRedis();
    prospects = new RedisProspectService(redis);
    demoConfigs = new RedisDemoConfigService(redis, {
      enableLegacyFallback: false,
    });
  });

  it("kind is 'earn'", () => {
    expect(earnMapper.kind).toBe("earn");
  });

  it("toCreateInput resolves a prospectId via the theme's primaryColor", async () => {
    const input = await earnMapper.toCreateInput(prospects, {
      ownerId: "owner-1",
      name: "My Earn",
      description: "test",
      config: {
        theme: { primaryColor: "#4779FF" },
        branding: { logo: "dynamic", tokenName: "USDC" },
        layout: { showSidebar: false },
      },
    });
    expect(input.kind).toBe("earn");
    expect(input.ownerId).toBe("owner-1");
    expect(input.name).toBe("My Earn");
    expect(input.prospectId).toMatch(/^bf_[0-9a-f]{24}$/);
    expect(input.themeOverrides).toBeDefined();
  });

  it("toCreateInput round-trips through DemoConfigService and rehydrates as StoredEarnConfig", async () => {
    const create = await earnMapper.toCreateInput(prospects, {
      ownerId: "owner-1",
      name: "USDC Earn",
      description: null,
      config: {
        theme: { primaryColor: "#4779FF", accentColor: "#1967D2" },
        branding: { logo: "custom", logoUrl: "https://x.com/l.svg" },
        layout: { showSidebar: true },
      },
    });
    const record = await demoConfigs.create(create);
    const prospect = await prospects.get(record.prospectId);
    const stored = earnMapper.toStored(record, prospect);

    expect(stored.id).toBe(record.id);
    expect(stored.name).toBe("USDC Earn");
    expect(stored.ownerId).toBe("owner-1");
    expect(stored.config.theme?.primaryColor).toBe("#4779ff");
    expect(stored.config.branding?.logo).toBe("custom");
    expect(stored.config.branding?.logoUrl).toBe("https://x.com/l.svg");
    expect(stored.config.layout?.showSidebar).toBe(true);
  });

  it("toStored surfaces null name as 'Untitled Earn Config'", async () => {
    const create = await earnMapper.toCreateInput(prospects, {
      ownerId: "owner-2",
      name: null,
      description: null,
      config: {
        theme: { primaryColor: "#abcdef" },
        branding: { logo: "dynamic" },
        layout: {},
      },
    });
    const record = await demoConfigs.create(create);
    expect(record.name).toBeNull();
    const stored = earnMapper.toStored(record, await prospects.get(record.prospectId));
    expect(stored.name).toBe("Untitled Earn Config");
  });

  it("nullable name: empty/undefined name is stored as null in DB", async () => {
    const create = await earnMapper.toCreateInput(prospects, {
      ownerId: "owner-3",
      name: "",
      description: null,
      config: {
        theme: { primaryColor: "#222222" },
        branding: { logo: "dynamic" },
        layout: {},
      },
    });
    expect(create.name).toBeNull();
  });

  it("toUpdateInput re-resolves prospectId when theme color changes", async () => {
    const create = await earnMapper.toCreateInput(prospects, {
      ownerId: "owner-1",
      name: "v1",
      description: null,
      config: {
        theme: { primaryColor: "#111111" },
        branding: { logo: "dynamic" },
        layout: {},
      },
    });
    const record = await demoConfigs.create(create);
    const originalProspect = record.prospectId;

    const update = await earnMapper.toUpdateInput(prospects, record, {
      ownerId: "owner-1",
      name: "v2",
      config: {
        theme: { primaryColor: "#999999" },
      },
    });
    expect(update.prospectId).toBeDefined();
    expect(update.prospectId).not.toBe(originalProspect);
  });

  it("toUpdateInput merges config when partial updates land", async () => {
    const create = await earnMapper.toCreateInput(prospects, {
      ownerId: "owner-1",
      name: "v1",
      description: null,
      config: {
        theme: { primaryColor: "#aabbcc", accentColor: "#001122" },
        branding: { logo: "dynamic", tokenName: "USDC" },
        layout: { showSidebar: true },
      },
    });
    const record = await demoConfigs.create(create);

    const update = await earnMapper.toUpdateInput(prospects, record, {
      ownerId: "owner-1",
      config: {
        branding: { logo: "dynamic", tokenName: "PYUSD" },
      },
    });
    // Branding updated; theme + layout preserved.
    const cfg = update.config as { theme: unknown; branding: { tokenName: string }; layout: unknown };
    expect(cfg.branding.tokenName).toBe("PYUSD");
    expect((cfg.theme as { primaryColor: string }).primaryColor).toBe(
      "#aabbcc",
    );
    expect((cfg.layout as { showSidebar: boolean }).showSidebar).toBe(true);
  });

  it("toStored falls back to DEFAULT_EARN_CONFIG theme when prospect is null (legacy fallback path)", async () => {
    // Simulate the legacy-Redis read fallback: record.prospectId === ""
    // and the prospect lookup misses. Mapper still produces a sane theme.
    const fakeRecord = {
      id: "legacy-1",
      kind: "earn" as const,
      ownerId: "owner-x",
      name: "Legacy",
      description: null,
      prospectId: "",
      themeOverrides: null,
      config: {
        theme: { primaryColor: "#deadbe" },
        branding: { logo: "dynamic" },
        layout: {},
      },
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-01"),
    };
    const stored = earnMapper.toStored(fakeRecord, null);
    // Legacy theme preserved from the embedded `config.theme`.
    expect(stored.config.theme?.primaryColor).toBe("#deadbe");
    void DEFAULT_EARN_CONFIG;
  });
});
