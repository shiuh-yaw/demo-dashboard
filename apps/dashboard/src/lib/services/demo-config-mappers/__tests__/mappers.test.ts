/**
 * Sanity tests for every per-kind demo-config mapper.
 *
 * Earn has a dedicated test file (`earn.test.ts`) covering the full
 * contract. This file exercises the same shape for the other five
 * kinds — wallet, trade, visa-direct, checkout, remittance — so a
 * regression in any single mapper's create/read round-trip fails CI.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { RedisBrandService } from "@/lib/services/redis/brands";
import { RedisDemoConfigService } from "@/lib/services/redis/demo-configs";
import type {
  BrandService,
  DemoConfigService,
} from "@/lib/services/types";

import { walletMapper } from "../wallet";
import { tradeMapper } from "../trade";
import { visaDirectMapper } from "../visa-direct";
import { checkoutMapper } from "../checkout";
import { remittanceMapper } from "../remittance";
import { createFakeRedis } from "../../__tests__/fake-redis";

describe("walletMapper round-trip", () => {
  let brands: BrandService;
  let demoConfigs: DemoConfigService;

  beforeEach(() => {
    const redis = createFakeRedis();
    brands = new RedisBrandService(redis);
    demoConfigs = new RedisDemoConfigService(redis, {
      enableLegacyFallback: false,
    });
  });

  it("creates + reads back a wallet config", async () => {
    const input = await walletMapper.toCreateInput(brands, {
      ownerId: "o1",
      name: "Wallet",
      description: null,
      config: {
        theme: { primaryColor: "#abcdef" },
        branding: { logo: "https://x.com/l.svg" },
      },
    });
    const record = await demoConfigs.create(input);
    expect(record.kind).toBe("wallet");
    const stored = walletMapper.toStored(
      record,
      await brands.get(record.brandId),
    );
    expect(stored.config.theme?.primaryColor).toBe("#abcdef");
    expect(stored.name).toBe("Wallet");
  });

  it("nullable name surfaces as 'Untitled Wallet Config'", async () => {
    const input = await walletMapper.toCreateInput(brands, {
      ownerId: "o1",
      name: null,
      description: null,
      config: { theme: { primaryColor: "#123456" }, branding: {} },
    });
    const record = await demoConfigs.create(input);
    expect(record.name).toBeNull();
    const stored = walletMapper.toStored(
      record,
      await brands.get(record.brandId),
    );
    expect(stored.name).toBe("Untitled Wallet Config");
  });
});

describe("tradeMapper round-trip", () => {
  let brands: BrandService;
  let demoConfigs: DemoConfigService;

  beforeEach(() => {
    const redis = createFakeRedis();
    brands = new RedisBrandService(redis);
    demoConfigs = new RedisDemoConfigService(redis, {
      enableLegacyFallback: false,
    });
  });

  it("creates + reads back a trade config (no embedded theme)", async () => {
    const input = await tradeMapper.toCreateInput(brands, {
      ownerId: "o1",
      name: "Trade",
      description: null,
      config: {
        branding: { logoUrl: "https://t.com/l.svg", appName: "Trader" },
      },
    });
    const record = await demoConfigs.create(input);
    const stored = tradeMapper.toStored(
      record,
      await brands.get(record.brandId),
    );
    expect(stored.name).toBe("Trade");
    expect(stored.config.branding?.appName).toBe("Trader");
  });

  it("nullable name surfaces as 'Untitled Trade Config'", async () => {
    const input = await tradeMapper.toCreateInput(brands, {
      ownerId: "o1",
      name: null,
      description: null,
      config: { branding: {} },
    });
    const record = await demoConfigs.create(input);
    expect(record.name).toBeNull();
    const stored = tradeMapper.toStored(
      record,
      await brands.get(record.brandId),
    );
    expect(stored.name).toBe("Untitled Trade Config");
  });
});

describe("visaDirectMapper round-trip", () => {
  let brands: BrandService;
  let demoConfigs: DemoConfigService;

  beforeEach(() => {
    const redis = createFakeRedis();
    brands = new RedisBrandService(redis);
    demoConfigs = new RedisDemoConfigService(redis, {
      enableLegacyFallback: false,
    });
  });

  it("creates + reads back a visa-direct config", async () => {
    const input = await visaDirectMapper.toCreateInput(brands, {
      ownerId: "o1",
      name: "VD",
      description: null,
      config: {
        branding: { bannerText: "test", logoUrl: "https://v.com/l.svg" },
        theme: { primaryColor: "#abcabc" },
      },
    });
    const record = await demoConfigs.create(input);
    const stored = visaDirectMapper.toStored(
      record,
      await brands.get(record.brandId),
    );
    expect(stored.name).toBe("VD");
    expect(stored.config.theme.primaryColor).toBe("#abcabc");
    expect(stored.config.branding.bannerText).toBe("test");
  });

  it("nullable name surfaces as 'Untitled Visa Direct Config'", async () => {
    const input = await visaDirectMapper.toCreateInput(brands, {
      ownerId: "o1",
      name: null,
      description: null,
      config: {
        branding: { bannerText: "", logoUrl: undefined },
        theme: { primaryColor: "#abcabc" },
      },
    });
    const record = await demoConfigs.create(input);
    expect(record.name).toBeNull();
    const stored = visaDirectMapper.toStored(
      record,
      await brands.get(record.brandId),
    );
    expect(stored.name).toBe("Untitled Visa Direct Config");
  });
});

describe("checkoutMapper round-trip", () => {
  let brands: BrandService;
  let demoConfigs: DemoConfigService;

  beforeEach(() => {
    const redis = createFakeRedis();
    brands = new RedisBrandService(redis);
    demoConfigs = new RedisDemoConfigService(redis, {
      enableLegacyFallback: false,
    });
  });

  it("creates + reads back a checkout config, preserving mode", async () => {
    const input = await checkoutMapper.toCreateInput(brands, {
      ownerId: "o1",
      name: "Checkout",
      description: null,
      mode: "deposit",
      config: {
        mode: "deposit",
        depositPresets: [5, 10],
        theme: { primaryColor: "#111111" },
        branding: { logo: "https://c.com/l.svg" },
      },
    });
    const record = await demoConfigs.create(input);
    const stored = checkoutMapper.toStored(
      record,
      await brands.get(record.brandId),
    );
    expect(stored.mode).toBe("deposit");
    expect(stored.config.theme?.primaryColor).toBe("#111111");
  });

  it("nullable name surfaces as 'Untitled Checkout'", async () => {
    const input = await checkoutMapper.toCreateInput(brands, {
      ownerId: "o1",
      name: null,
      description: null,
      mode: "payment",
      config: { mode: "payment", theme: { primaryColor: "#aaaaaa" } },
    });
    const record = await demoConfigs.create(input);
    expect(record.name).toBeNull();
    const stored = checkoutMapper.toStored(
      record,
      await brands.get(record.brandId),
    );
    expect(stored.name).toBe("Untitled Checkout");
  });
});

describe("remittanceMapper round-trip", () => {
  let brands: BrandService;
  let demoConfigs: DemoConfigService;

  beforeEach(() => {
    const redis = createFakeRedis();
    brands = new RedisBrandService(redis);
    demoConfigs = new RedisDemoConfigService(redis, {
      enableLegacyFallback: false,
    });
  });

  it("creates + reads back a remittance config with secondary color on Brand", async () => {
    const input = await remittanceMapper.toCreateInput(brands, {
      ownerId: "o1",
      name: "Remit",
      description: null,
      config: {
        theme: { primaryColor: "#1a56db", secondaryColor: "#1e40af" },
        branding: { logoUrl: "https://r.com/l.svg" },
      },
    });
    const record = await demoConfigs.create(input);
    const brand = await brands.get(record.brandId);
    expect(brand!.secondaryColor).toBe("#1e40af");
    const stored = remittanceMapper.toStored(record, brand);
    expect(stored.config.theme?.primaryColor).toBe("#1a56db");
    expect(stored.config.theme?.secondaryColor).toBe("#1e40af");
    expect(stored.name).toBe("Remit");
  });

  it("nullable name surfaces as 'Untitled Remittance Config'", async () => {
    const input = await remittanceMapper.toCreateInput(brands, {
      ownerId: "o1",
      name: null,
      description: null,
      config: {
        theme: { primaryColor: "#1a56db" },
        branding: {},
      },
    });
    const record = await demoConfigs.create(input);
    expect(record.name).toBeNull();
    const stored = remittanceMapper.toStored(
      record,
      await brands.get(record.brandId),
    );
    expect(stored.name).toBe("Untitled Remittance Config");
  });
});

describe("brand resolution determinism — cross-kind", () => {
  let brands: BrandService;

  beforeEach(() => {
    brands = new RedisBrandService(createFakeRedis());
  });

  it("two demos with same owner+primary+logo share a Brand", async () => {
    const earnInput = await (
      await import("../earn")
    ).earnMapper.toCreateInput(brands, {
      ownerId: "shared",
      name: "Earn",
      description: null,
      config: {
        theme: { primaryColor: "#445566" },
        branding: {
          logo: "custom",
          logoUrl: "https://shared.com/l.svg",
        },
        layout: {},
      },
    });
    const walletInput = await walletMapper.toCreateInput(brands, {
      ownerId: "shared",
      name: "Wallet",
      description: null,
      config: {
        theme: { primaryColor: "#445566" },
        branding: { logo: "https://shared.com/l.svg" },
      },
    });
    expect(earnInput.brandId).toBe(walletInput.brandId);
  });
});
