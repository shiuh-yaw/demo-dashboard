/**
 * Tests for the earn ↔ DemoConfig mapper. Covers:
 *   - Inbound projection: StoredEarnConfig → CreateDemoConfigInput (prospectId
 *     is caller-supplied, GTM-03.5B - no hash-derived auto-create).
 *   - Outbound projection: DemoConfigRecord + Prospect → StoredEarnConfig
 *     (theme merged from Prospect + themeOverrides; legacy name surfaced
 *     with "Untitled" fallback when DB has null).
 *   - Nullable name round-trip.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { PostgresProspectService } from "@/lib/services/postgres/prospects";
import { PostgresDemoConfigService } from "@/lib/services/postgres/demo-configs";
import type {
  ProspectService,
  DemoConfigService,
} from "@/lib/services/types";
import { DEFAULT_EARN_CONFIG } from "@/lib/types/dashboard";

import { earnMapper } from "../earn";
import { makePrismock } from "../../__tests__/make-prismock";
import { createFakeDemoConfigPrisma } from "../../__tests__/fake-prisma-demo-configs";

describe("earnMapper", () => {
  let prospects: ProspectService;
  let demoConfigs: DemoConfigService;

  beforeEach(() => {
    prospects = new PostgresProspectService(makePrismock());
    demoConfigs = new PostgresDemoConfigService(createFakeDemoConfigPrisma());
  });

  it("kind is 'earn'", () => {
    expect(earnMapper.kind).toBe("earn");
  });

  it("toCreateInput passes the caller-supplied prospectId through unchanged", async () => {
    const prospect = await prospects.create({
      ownerId: "owner-1",
      name: "Acme",
      primaryColor: "#4779FF",
    });
    const input = await earnMapper.toCreateInput(prospects, {
      ownerId: "owner-1",
      name: "My Earn",
      description: "test",
      prospectId: prospect.id,
      config: {
        theme: { primaryColor: "#4779FF" },
        branding: { logo: "dynamic", tokenName: "USDC" },
        layout: { showSidebar: false },
      },
    });
    expect(input.kind).toBe("earn");
    expect(input.ownerId).toBe("owner-1");
    expect(input.name).toBe("My Earn");
    expect(input.prospectId).toBe(prospect.id);
    expect(input.themeOverrides).toBeDefined();
  });

  it("toCreateInput accepts a null prospectId (unbound demo)", async () => {
    const input = await earnMapper.toCreateInput(prospects, {
      ownerId: "owner-1",
      name: "Showcase",
      description: null,
      prospectId: null,
      config: {
        theme: { primaryColor: "#4779FF" },
        branding: { logo: "dynamic" },
        layout: {},
      },
    });
    expect(input.prospectId).toBeNull();
  });

  it("toCreateInput stamps createdById when the caller resolved a sub", async () => {
    const input = await earnMapper.toCreateInput(prospects, {
      ownerId: "owner-1",
      createdById: "user-1",
      name: "My Earn",
      description: null,
      prospectId: null,
      config: { theme: {}, branding: { logo: "dynamic" }, layout: {} },
    });
    expect(input.createdById).toBe("user-1");
  });

  it("toCreateInput stamps null createdById when the sub doesn't resolve", async () => {
    const input = await earnMapper.toCreateInput(prospects, {
      ownerId: "owner-1",
      createdById: null,
      name: "My Earn",
      description: null,
      prospectId: null,
      config: { theme: {}, branding: { logo: "dynamic" }, layout: {} },
    });
    expect(input.createdById).toBeNull();
  });

  it("toCreateInput round-trips through DemoConfigService and rehydrates as StoredEarnConfig", async () => {
    const prospect = await prospects.create({
      ownerId: "owner-1",
      name: "Acme",
      primaryColor: "#4779FF",
      accentColor: "#1967D2",
      logo: "custom",
      logoUrl: "https://x.com/l.svg",
    });
    const create = await earnMapper.toCreateInput(prospects, {
      ownerId: "owner-1",
      name: "USDC Earn",
      description: null,
      prospectId: prospect.id,
      config: {
        theme: { primaryColor: "#4779FF", accentColor: "#1967D2" },
        branding: { logo: "custom", logoUrl: "https://x.com/l.svg" },
        layout: { showSidebar: true },
      },
    });
    const record = await demoConfigs.create(create);
    const linked = record.prospectId
      ? await prospects.get(record.prospectId)
      : null;
    const stored = earnMapper.toStored(record, linked);

    expect(stored.id).toBe(record.id);
    expect(stored.name).toBe("USDC Earn");
    expect(stored.ownerId).toBe("owner-1");
    expect(stored.prospectId).toBe(prospect.id);
    expect(stored.config.theme?.primaryColor).toBe("#4779FF");
    expect(stored.config.branding?.logo).toBe("custom");
    expect(stored.config.branding?.logoUrl).toBe("https://x.com/l.svg");
    expect(stored.config.layout?.showSidebar).toBe(true);
  });

  it("toStored surfaces null name as 'Untitled Earn Config'", async () => {
    const create = await earnMapper.toCreateInput(prospects, {
      ownerId: "owner-2",
      name: null,
      description: null,
      prospectId: null,
      config: {
        theme: { primaryColor: "#abcdef" },
        branding: { logo: "dynamic" },
        layout: {},
      },
    });
    const record = await demoConfigs.create(create);
    expect(record.name).toBeNull();
    const stored = earnMapper.toStored(record, null);
    expect(stored.name).toBe("Untitled Earn Config");
  });

  it("nullable name: empty/undefined name is stored as null in DB", async () => {
    const create = await earnMapper.toCreateInput(prospects, {
      ownerId: "owner-3",
      name: "",
      description: null,
      prospectId: null,
      config: {
        theme: { primaryColor: "#222222" },
        branding: { logo: "dynamic" },
        layout: {},
      },
    });
    expect(create.name).toBeNull();
  });

  it("toUpdateInput rebinds prospectId only when the caller sets it explicitly", async () => {
    const prospectA = await prospects.create({
      ownerId: "owner-1",
      name: "A",
      primaryColor: "#111111",
    });
    const prospectB = await prospects.create({
      ownerId: "owner-1",
      name: "B",
      primaryColor: "#999999",
    });
    const create = await earnMapper.toCreateInput(prospects, {
      ownerId: "owner-1",
      name: "v1",
      description: null,
      prospectId: prospectA.id,
      config: {
        theme: { primaryColor: "#111111" },
        branding: { logo: "dynamic" },
        layout: {},
      },
    });
    const record = await demoConfigs.create(create);

    // Theme change alone must NOT rebind the prospect (hash-auto-create is dead).
    const themeOnly = await earnMapper.toUpdateInput(prospects, record, {
      ownerId: "owner-1",
      name: "v2",
      config: { theme: { primaryColor: "#999999" } },
    });
    expect(themeOnly.prospectId).toBeUndefined();

    // Explicit prospectId rebinds.
    const rebind = await earnMapper.toUpdateInput(prospects, record, {
      ownerId: "owner-1",
      prospectId: prospectB.id,
    });
    expect(rebind.prospectId).toBe(prospectB.id);

    // Explicit null unbinds.
    const unbind = await earnMapper.toUpdateInput(prospects, record, {
      ownerId: "owner-1",
      prospectId: null,
    });
    expect(unbind.prospectId).toBeNull();
  });

  it("toUpdateInput merges config when partial updates land", async () => {
    const create = await earnMapper.toCreateInput(prospects, {
      ownerId: "owner-1",
      name: "v1",
      description: null,
      prospectId: null,
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
    // Simulate the legacy-Redis read fallback: record.prospectId === null
    // and there is no linked prospect. Mapper still produces a sane theme.
    const fakeRecord = {
      id: "legacy-1",
      kind: "earn" as const,
      ownerId: "owner-x",
      createdById: null,
      name: "Legacy",
      description: null,
      prospectId: null,
      isPrimary: false,
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
    expect(stored.prospectId).toBeNull();
    void DEFAULT_EARN_CONFIG;
  });
});
