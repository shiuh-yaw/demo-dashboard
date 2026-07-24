/**
 * `listDemoTableRows` wiring: the DB query must be scoped via
 * `demoConfigVisibilityWhere` (never a `.list().filter()` over an unscoped
 * full-table fetch), and must loop every page in scope rather than stopping
 * at the first page - a cross-org table can exceed one page's worth of
 * demo configs. `buildDemoTableRows` itself (the pure builder) is covered by
 * `demos-table.test.ts`.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { services, gtm } = vi.hoisted(() => ({
  services: {
    demoConfigs: { list: vi.fn() },
    prospects: { list: vi.fn() },
    users: { get: vi.fn() },
  },
  gtm: {
    demoConfigVisibilityWhere: vi.fn(),
    isDemoConfigVisible: vi.fn(() => true),
    prospectVisibilityWhere: vi.fn(),
    visibleProspectIds: vi.fn(),
  },
}));

vi.mock("@/lib/services", () => ({ services }));
vi.mock("@/lib/auth/gtm", () => gtm);

import { listDemoTableRows } from "@/lib/demos-table";
import type { DemoConfigRecord, GtmUser } from "@/lib/services";

const user: GtmUser = {
  id: "u1",
  email: "a@fireblocks.com",
  dynamicUserId: "sub-1",
  displayName: null,
  avatarUrl: null,
  schedulingUrl: null,
  role: "MEMBER",
  deactivatedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function demo(over: Partial<DemoConfigRecord> & { id: string }): DemoConfigRecord {
  return {
    kind: "wallet",
    ownerId: "sub-1",
    createdById: "u1",
    name: null,
    description: null,
    prospectId: null,
    isPrimary: false,
    themeOverrides: null,
    config: {},
    createdAt: new Date("2026-02-01"),
    updatedAt: new Date("2026-02-01"),
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  gtm.visibleProspectIds.mockResolvedValue("all");
  gtm.demoConfigVisibilityWhere.mockReturnValue({ __scoped: true });
  gtm.prospectVisibilityWhere.mockReturnValue({ __prospectScoped: true });
  services.prospects.list.mockResolvedValue({ items: [], nextCursor: null });
});

describe("listDemoTableRows", () => {
  it("passes a scope where + kind filter to services.demoConfigs.list - never an unscoped full-table fetch", async () => {
    services.demoConfigs.list.mockResolvedValue({
      items: [demo({ id: "d1" })],
      nextCursor: null,
    });

    await listDemoTableRows(user, { kind: "wallet" });

    expect(gtm.demoConfigVisibilityWhere).toHaveBeenCalledWith(user, "all");
    expect(services.demoConfigs.list).toHaveBeenCalledWith(
      expect.objectContaining({ where: { __scoped: true }, kind: "wallet" }),
    );
  });

  it("loops every page until nextCursor is null - never capped at one page", async () => {
    services.demoConfigs.list
      .mockResolvedValueOnce({ items: [demo({ id: "d1" })], nextCursor: "cursor-1" })
      .mockResolvedValueOnce({ items: [demo({ id: "d2" })], nextCursor: "cursor-2" })
      .mockResolvedValueOnce({ items: [demo({ id: "d3" })], nextCursor: null });

    const rows = await listDemoTableRows(user);

    expect(services.demoConfigs.list).toHaveBeenCalledTimes(3);
    expect(services.demoConfigs.list.mock.calls[0]![0]).toMatchObject({ cursor: null });
    expect(services.demoConfigs.list.mock.calls[1]![0]).toMatchObject({ cursor: "cursor-1" });
    expect(services.demoConfigs.list.mock.calls[2]![0]).toMatchObject({ cursor: "cursor-2" });
    expect(rows.map((r) => r.id).sort()).toEqual(["d1", "d2", "d3"]);
  });
});
