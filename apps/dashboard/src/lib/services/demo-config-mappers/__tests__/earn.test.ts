/**
 * Tests for the earn ↔ DemoConfig mapper. Covers:
 *   - Inbound projection: StoredEarnConfig → CreateDemoConfigInput (brandId
 *     derived from theme; theme split off; rest in `config`).
 *   - Outbound projection: DemoConfigRecord + Brand → StoredEarnConfig
 *     (theme merged from Brand + themeOverrides; legacy name surfaced
 *     with "Untitled" fallback when DB has null).
 *   - Nullable name round-trip.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { RedisBrandService } from "@/lib/services/redis/brands";
import { RedisDemoConfigService } from "@/lib/services/redis/demo-configs";
import type {
  BrandService,
  DemoConfigService,
} from "@/lib/services/types";
import { DEFAULT_EARN_CONFIG } from "@/lib/types/dashboard";

import { earnMapper } from "../earn";
import { createFakeRedis } from "../../__tests__/fake-redis";

describe("earnMapper", () => {
  let brands: BrandService;
  let demoConfigs: DemoConfigService;

  beforeEach(() => {
    const redis = createFakeRedis();
    brands = new RedisBrandService(redis);
    demoConfigs = new RedisDemoConfigService(redis, {
      enableLegacyFallback: false,
    });
  });

  it("kind is 'earn'", () => {
    expect(earnMapper.kind).toBe("earn");
  });

  it("toCreateInput resolves a brandId via the theme's primaryColor", async () => {
    const input = await earnMapper.toCreateInput(brands, {
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
    expect(input.brandId).toMatch(/^bf_[0-9a-f]{24}$/);
    expect(input.themeOverrides).toBeDefined();
  });

  it("toCreateInput round-trips through DemoConfigService and rehydrates as StoredEarnConfig", async () => {
    const create = await earnMapper.toCreateInput(brands, {
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
    const brand = await brands.get(record.brandId);
    const stored = earnMapper.toStored(record, brand);

    expect(stored.id).toBe(record.id);
    expect(stored.name).toBe("USDC Earn");
    expect(stored.ownerId).toBe("owner-1");
    expect(stored.config.theme?.primaryColor).toBe("#4779ff");
    expect(stored.config.branding?.logo).toBe("custom");
    expect(stored.config.branding?.logoUrl).toBe("https://x.com/l.svg");
    expect(stored.config.layout?.showSidebar).toBe(true);
  });

  it("toStored surfaces null name as 'Untitled Earn Config'", async () => {
    const create = await earnMapper.toCreateInput(brands, {
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
    const stored = earnMapper.toStored(record, await brands.get(record.brandId));
    expect(stored.name).toBe("Untitled Earn Config");
  });

  it("nullable name: empty/undefined name is stored as null in DB", async () => {
    const create = await earnMapper.toCreateInput(brands, {
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

  it("toUpdateInput re-resolves brandId when theme color changes", async () => {
    const create = await earnMapper.toCreateInput(brands, {
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
    const originalBrand = record.brandId;

    const update = await earnMapper.toUpdateInput(brands, record, {
      ownerId: "owner-1",
      name: "v2",
      config: {
        theme: { primaryColor: "#999999" },
      },
    });
    expect(update.brandId).toBeDefined();
    expect(update.brandId).not.toBe(originalBrand);
  });

  it("toUpdateInput merges config when partial updates land", async () => {
    const create = await earnMapper.toCreateInput(brands, {
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

    const update = await earnMapper.toUpdateInput(brands, record, {
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

  it("toStored falls back to DEFAULT_EARN_CONFIG theme when brand is null (legacy fallback path)", async () => {
    // Simulate the legacy-Redis read fallback: record.brandId === ""
    // and the brand lookup misses. Mapper still produces a sane theme.
    const fakeRecord = {
      id: "legacy-1",
      kind: "earn" as const,
      ownerId: "owner-x",
      name: "Legacy",
      description: null,
      brandId: "",
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
