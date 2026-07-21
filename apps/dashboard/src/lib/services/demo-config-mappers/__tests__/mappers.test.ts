/**
 * Sanity tests for every per-kind demo-config mapper.
 *
 * Earn has a dedicated test file (`earn.test.ts`) covering the full
 * contract. This file exercises the same shape for the other five
 * kinds — wallet, trade, visa-direct, checkout, remittance — so a
 * regression in any single mapper's create/read round-trip fails CI.
 *
 * GTM-03.5B: prospectId is caller-supplied on every mapper; none of them
 * resolve or create a Prospect anymore.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { RedisProspectService } from "@/lib/services/redis/prospects";
import { RedisDemoConfigService } from "@/lib/services/redis/demo-configs";
import type {
  ProspectService,
  DemoConfigService,
} from "@/lib/services/types";

import { walletMapper } from "../wallet";
import { tradeMapper } from "../trade";
import { visaDirectMapper } from "../visa-direct";
import { checkoutMapper } from "../checkout";
import { remittanceMapper } from "../remittance";
import { createFakeRedis } from "../../__tests__/fake-redis";

describe("walletMapper round-trip", () => {
  let prospects: ProspectService;
  let demoConfigs: DemoConfigService;

  beforeEach(() => {
    const redis = createFakeRedis();
    prospects = new RedisProspectService(redis);
    demoConfigs = new RedisDemoConfigService(redis, {
      enableLegacyFallback: false,
    });
  });

  it("creates + reads back a wallet config bound to an explicit prospect", async () => {
    const prospect = await prospects.create({
      ownerId: "o1",
      name: "P1",
      primaryColor: "#abcdef",
    });
    const input = await walletMapper.toCreateInput(prospects, {
      ownerId: "o1",
      name: "Wallet",
      description: null,
      prospectId: prospect.id,
      config: {
        theme: { primaryColor: "#abcdef" },
        branding: { logo: "https://x.com/l.svg" },
      },
    });
    const record = await demoConfigs.create(input);
    expect(record.kind).toBe("wallet");
    expect(record.prospectId).toBe(prospect.id);
    const stored = walletMapper.toStored(
      record,
      record.prospectId ? await prospects.get(record.prospectId) : null,
    );
    expect(stored.config.theme?.primaryColor).toBe("#abcdef");
    expect(stored.name).toBe("Wallet");
    expect(stored.prospectId).toBe(prospect.id);
  });

  it("creates an unbound wallet config when prospectId is null", async () => {
    const input = await walletMapper.toCreateInput(prospects, {
      ownerId: "o1",
      name: null,
      description: null,
      prospectId: null,
      config: { theme: { primaryColor: "#123456" }, branding: {} },
    });
    const record = await demoConfigs.create(input);
    expect(record.name).toBeNull();
    expect(record.prospectId).toBeNull();
    const stored = walletMapper.toStored(record, null);
    expect(stored.name).toBe("Untitled Wallet Config");
    expect(stored.prospectId).toBeNull();
  });
});

describe("tradeMapper round-trip", () => {
  let prospects: ProspectService;
  let demoConfigs: DemoConfigService;

  beforeEach(() => {
    const redis = createFakeRedis();
    prospects = new RedisProspectService(redis);
    demoConfigs = new RedisDemoConfigService(redis, {
      enableLegacyFallback: false,
    });
  });

  it("creates + reads back a trade config (no embedded theme)", async () => {
    const input = await tradeMapper.toCreateInput(prospects, {
      ownerId: "o1",
      name: "Trade",
      description: null,
      prospectId: null,
      config: {
        branding: { logoUrl: "https://t.com/l.svg", appName: "Trader" },
      },
    });
    const record = await demoConfigs.create(input);
    const stored = tradeMapper.toStored(record, null);
    expect(stored.name).toBe("Trade");
    expect(stored.config.branding?.appName).toBe("Trader");
  });

  it("nullable name surfaces as 'Untitled Trade Config'", async () => {
    const input = await tradeMapper.toCreateInput(prospects, {
      ownerId: "o1",
      name: null,
      description: null,
      prospectId: null,
      config: { branding: {} },
    });
    const record = await demoConfigs.create(input);
    expect(record.name).toBeNull();
    const stored = tradeMapper.toStored(record, null);
    expect(stored.name).toBe("Untitled Trade Config");
  });
});

describe("visaDirectMapper round-trip", () => {
  let prospects: ProspectService;
  let demoConfigs: DemoConfigService;

  beforeEach(() => {
    const redis = createFakeRedis();
    prospects = new RedisProspectService(redis);
    demoConfigs = new RedisDemoConfigService(redis, {
      enableLegacyFallback: false,
    });
  });

  it("creates + reads back a visa-direct config", async () => {
    const input = await visaDirectMapper.toCreateInput(prospects, {
      ownerId: "o1",
      name: "VD",
      description: null,
      prospectId: null,
      config: {
        branding: { bannerText: "test", logoUrl: "https://v.com/l.svg" },
        theme: { primaryColor: "#abcabc" },
      },
    });
    const record = await demoConfigs.create(input);
    const stored = visaDirectMapper.toStored(record, null);
    expect(stored.name).toBe("VD");
    expect(stored.config.theme.primaryColor).toBe("#abcabc");
    expect(stored.config.branding.bannerText).toBe("test");
  });

  it("nullable name surfaces as 'Untitled Visa Direct Config'", async () => {
    const input = await visaDirectMapper.toCreateInput(prospects, {
      ownerId: "o1",
      name: null,
      description: null,
      prospectId: null,
      config: {
        branding: { bannerText: "", logoUrl: undefined },
        theme: { primaryColor: "#abcabc" },
      },
    });
    const record = await demoConfigs.create(input);
    expect(record.name).toBeNull();
    const stored = visaDirectMapper.toStored(record, null);
    expect(stored.name).toBe("Untitled Visa Direct Config");
  });
});

describe("checkoutMapper round-trip", () => {
  let prospects: ProspectService;
  let demoConfigs: DemoConfigService;

  beforeEach(() => {
    const redis = createFakeRedis();
    prospects = new RedisProspectService(redis);
    demoConfigs = new RedisDemoConfigService(redis, {
      enableLegacyFallback: false,
    });
  });

  it("creates + reads back a checkout config, preserving mode", async () => {
    const input = await checkoutMapper.toCreateInput(prospects, {
      ownerId: "o1",
      name: "Checkout",
      description: null,
      mode: "deposit",
      prospectId: null,
      config: {
        mode: "deposit",
        depositPresets: [5, 10],
        theme: { primaryColor: "#111111" },
        branding: { logo: "https://c.com/l.svg" },
      },
    });
    const record = await demoConfigs.create(input);
    const stored = checkoutMapper.toStored(record, null);
    expect(stored.mode).toBe("deposit");
    expect(stored.config.theme?.primaryColor).toBe("#111111");
  });

  it("nullable name surfaces as 'Untitled Checkout'", async () => {
    const input = await checkoutMapper.toCreateInput(prospects, {
      ownerId: "o1",
      name: null,
      description: null,
      mode: "payment",
      prospectId: null,
      config: { mode: "payment", theme: { primaryColor: "#aaaaaa" } },
    });
    const record = await demoConfigs.create(input);
    expect(record.name).toBeNull();
    const stored = checkoutMapper.toStored(record, null);
    expect(stored.name).toBe("Untitled Checkout");
  });
});

describe("remittanceMapper round-trip", () => {
  let prospects: ProspectService;
  let demoConfigs: DemoConfigService;

  beforeEach(() => {
    const redis = createFakeRedis();
    prospects = new RedisProspectService(redis);
    demoConfigs = new RedisDemoConfigService(redis, {
      enableLegacyFallback: false,
    });
  });

  it("creates + reads back a remittance config bound to an explicit prospect", async () => {
    const prospect = await prospects.create({
      ownerId: "o1",
      name: "Remit Co",
      primaryColor: "#1a56db",
      secondaryColor: "#1e40af",
    });
    const input = await remittanceMapper.toCreateInput(prospects, {
      ownerId: "o1",
      name: "Remit",
      description: null,
      prospectId: prospect.id,
      config: {
        theme: { primaryColor: "#1a56db", secondaryColor: "#1e40af" },
        branding: { logoUrl: "https://r.com/l.svg" },
      },
    });
    const record = await demoConfigs.create(input);
    const linked = record.prospectId
      ? await prospects.get(record.prospectId)
      : null;
    expect(linked!.secondaryColor).toBe("#1e40af");
    const stored = remittanceMapper.toStored(record, linked);
    expect(stored.config.theme?.primaryColor).toBe("#1a56db");
    expect(stored.config.theme?.secondaryColor).toBe("#1e40af");
    expect(stored.name).toBe("Remit");
    expect(stored.prospectId).toBe(prospect.id);
  });

  it("nullable name surfaces as 'Untitled Remittance Config'", async () => {
    const input = await remittanceMapper.toCreateInput(prospects, {
      ownerId: "o1",
      name: null,
      description: null,
      prospectId: null,
      config: {
        theme: { primaryColor: "#1a56db" },
        branding: {},
      },
    });
    const record = await demoConfigs.create(input);
    expect(record.name).toBeNull();
    const stored = remittanceMapper.toStored(record, null);
    expect(stored.name).toBe("Untitled Remittance Config");
  });
});

// ---------------------------------------------------------------------------
// Prospect theme + logo hydration — extended palette fields
// ---------------------------------------------------------------------------

describe("walletMapper prospect theme hydration", () => {
  let prospects: ProspectService;
  let demoConfigs: DemoConfigService;

  beforeEach(() => {
    const redis = createFakeRedis();
    prospects = new RedisProspectService(redis);
    demoConfigs = new RedisDemoConfigService(redis, {
      enableLegacyFallback: false,
    });
  });

  it("hydrates all extended prospect palette fields", async () => {
    const prospect = await prospects.create({
      ownerId: "o1",
      name: "P1",
      primaryColor: "#abcdef",
    });
    const input = await walletMapper.toCreateInput(prospects, {
      ownerId: "o1",
      name: "Wallet",
      description: null,
      prospectId: prospect.id,
      config: {
        theme: { primaryColor: "#abcdef" },
        branding: { logo: "https://x.com/l.svg" },
      },
    });
    const record = await demoConfigs.create(input);
    // Enrich the prospect with extended palette
    const updated = await prospects.update(prospect.id, {
      pageBackground: "#f0f0f0",
      background: "#ffffff",
      foreground: "#111111",
      mutedTextColor: "#888888",
      borderColor: "#cccccc",
      rowBackground: "#eeeeee",
      rowHoverBackground: "#dddddd",
      gradientFrom: "#aaa",
      gradientTo: "#bbb",
    });
    const stored = walletMapper.toStored(record, updated);
    expect(stored.config.theme).toMatchObject({
      primaryColor: "#abcdef",
      pageBackground: "#f0f0f0",
      background: "#ffffff",
      foreground: "#111111",
      mutedTextColor: "#888888",
      borderColor: "#cccccc",
      rowBackground: "#eeeeee",
      rowHoverBackground: "#dddddd",
      gradientFrom: "#aaa",
      gradientTo: "#bbb",
    });
  });

  it("hydrates prospect logo into wallet branding", async () => {
    const prospect = await prospects.create({
      ownerId: "o1",
      name: "P1",
      primaryColor: "#abcdef",
    });
    const input = await walletMapper.toCreateInput(prospects, {
      ownerId: "o1",
      name: "Wallet",
      description: null,
      prospectId: prospect.id,
      config: {
        theme: { primaryColor: "#abcdef" },
        branding: {},
      },
    });
    const record = await demoConfigs.create(input);
    const updated = await prospects.update(prospect.id, {
      logo: "custom",
      logoUrl: "https://prospect.com/logo.svg",
    });
    const stored = walletMapper.toStored(record, updated);
    expect(stored.config.branding?.logo).toBe("https://prospect.com/logo.svg");
  });
});

describe("visaDirectMapper prospect theme hydration", () => {
  let prospects: ProspectService;
  let demoConfigs: DemoConfigService;

  beforeEach(() => {
    const redis = createFakeRedis();
    prospects = new RedisProspectService(redis);
    demoConfigs = new RedisDemoConfigService(redis, {
      enableLegacyFallback: false,
    });
  });

  it("hydrates extended prospect fields and logoUrl", async () => {
    const prospect = await prospects.create({
      ownerId: "o1",
      name: "P1",
      primaryColor: "#abcabc",
    });
    const input = await visaDirectMapper.toCreateInput(prospects, {
      ownerId: "o1",
      name: "VD",
      description: null,
      prospectId: prospect.id,
      config: {
        branding: { bannerText: "test" },
        theme: { primaryColor: "#abcabc" },
      },
    });
    const record = await demoConfigs.create(input);
    const updated = await prospects.update(prospect.id, {
      foreground: "#222222",
      logo: "custom",
      logoUrl: "https://prospect.com/vd.svg",
    });
    const stored = visaDirectMapper.toStored(record, updated);
    expect(stored.config.theme.foregroundColor).toBe("#222222");
    expect(stored.config.branding.logoUrl).toBe("https://prospect.com/vd.svg");
    expect(stored.config.branding.bannerText).toBe("test");
  });
});

describe("remittanceMapper prospect theme hydration", () => {
  let prospects: ProspectService;
  let demoConfigs: DemoConfigService;

  beforeEach(() => {
    const redis = createFakeRedis();
    prospects = new RedisProspectService(redis);
    demoConfigs = new RedisDemoConfigService(redis, {
      enableLegacyFallback: false,
    });
  });

  it("hydrates secondaryColor from prospect alongside extended palette", async () => {
    const prospect = await prospects.create({
      ownerId: "o1",
      name: "P1",
      primaryColor: "#1a56db",
      secondaryColor: "#1e40af",
    });
    const input = await remittanceMapper.toCreateInput(prospects, {
      ownerId: "o1",
      name: "Remit",
      description: null,
      prospectId: prospect.id,
      config: {
        theme: { primaryColor: "#1a56db", secondaryColor: "#1e40af" },
        branding: { logoUrl: "https://r.com/l.svg" },
      },
    });
    const record = await demoConfigs.create(input);
    const updated = await prospects.update(prospect.id, {
      foreground: "#333333",
      pageBackground: "#f5f5f5",
      secondaryColor: "#new-secondary",
      logo: "custom",
      logoUrl: "https://prospect.com/r.svg",
    });
    const stored = remittanceMapper.toStored(record, updated);
    expect(stored.config.theme?.foregroundColor).toBe("#333333");
    expect(stored.config.theme?.pageBackground).toBe("#f5f5f5");
    expect(stored.config.theme?.secondaryColor).toBe("#new-secondary");
    expect(stored.config.branding?.logoUrl).toBe("https://prospect.com/r.svg");
  });
});

describe("mappers never resolve or create a Prospect", () => {
  let prospects: ProspectService;

  beforeEach(() => {
    prospects = new RedisProspectService(createFakeRedis());
  });

  it("two demos created with the same theme but no explicit prospectId stay unbound (no hash convergence)", async () => {
    const earnInput = await (
      await import("../earn")
    ).earnMapper.toCreateInput(prospects, {
      ownerId: "shared",
      name: "Earn",
      description: null,
      prospectId: null,
      config: {
        theme: { primaryColor: "#445566" },
        branding: {
          logo: "custom",
          logoUrl: "https://shared.com/l.svg",
        },
        layout: {},
      },
    });
    const walletInput = await walletMapper.toCreateInput(prospects, {
      ownerId: "shared",
      name: "Wallet",
      description: null,
      prospectId: null,
      config: {
        theme: { primaryColor: "#445566" },
        branding: { logo: "https://shared.com/l.svg" },
      },
    });
    expect(earnInput.prospectId).toBeNull();
    expect(walletInput.prospectId).toBeNull();
    expect(await prospects.list()).toHaveLength(0);
  });
});
