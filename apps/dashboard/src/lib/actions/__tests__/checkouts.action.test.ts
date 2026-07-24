/**
 * Checkout list wiring: getAllCheckoutConfigs must resolve the ACTIVE
 * My/Team/All scope (team switcher x filter) and filter via
 * demoConfigActiveScopeWhere - never the broad get()-authorization
 * demoConfigVisibilityWhere. Mirrors wallets.action.test.ts's list-wiring
 * describe. Note: the returned key is `checkouts`, not `configs`.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { services, gtm, policy } = vi.hoisted(() => ({
  services: {
    demoConfigs: {
      create: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    },
    prospects: { get: vi.fn(), list: vi.fn().mockResolvedValue({ items: [], nextCursor: null }) },
  },
  gtm: {
    getSessionUser: vi.fn(),
    canMutateDemoConfig: vi.fn(),
    visibleProspectIds: vi.fn(),
    isDemoConfigVisible: vi.fn(),
    demoConfigActiveScopeWhere: vi.fn(),
    resolveActiveScope: vi.fn(),
  },
  policy: { canCreateRecord: vi.fn() },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/normalize-logo", () => ({
  normalizeBrandingLogos: (c: unknown) => c,
}));
vi.mock("@/lib/redis", () => ({
  getRedis: vi.fn(),
  REDIS_KEYS: { checkoutTxCount: (id: string) => `tx:${id}` },
}));
vi.mock("@/lib/services/demo-config-mappers/checkout", () => ({
  checkoutMapper: {
    toCreateInput: vi.fn(async (_p: unknown, input: Record<string, unknown>) => input),
    toUpdateInput: vi.fn(async (_p: unknown, _e: unknown, input: Record<string, unknown>) => input),
    toStored: vi.fn((record: Record<string, unknown>) => record),
  },
}));
vi.mock("@/lib/services", () => ({ services }));
vi.mock("@/lib/auth/gtm", () => gtm);
vi.mock("@/lib/auth/policy", () => policy);

import { getAllCheckoutConfigs } from "@/lib/actions/checkouts";

const MEMBER = { id: "u1", dynamicUserId: "sub-1", role: "MEMBER" as const };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getAllCheckoutConfigs (list wiring, active scope not broad visibility)", () => {
  it("resolves the active scope and scopes the DB query via demoConfigActiveScopeWhere + kind", async () => {
    gtm.getSessionUser.mockResolvedValue(MEMBER);
    gtm.resolveActiveScope.mockResolvedValue({ kind: "all" });
    gtm.demoConfigActiveScopeWhere.mockReturnValue({ __scoped: true });
    services.demoConfigs.list.mockResolvedValue({
      items: [
        { id: "mine", ownerId: "sub-1", prospectId: null, updatedAt: new Date() },
        { id: "theirs", ownerId: "sub-2", prospectId: null, updatedAt: new Date() },
      ],
      nextCursor: null,
    });
    services.prospects.get.mockResolvedValue(null);
    const { checkouts } = await getAllCheckoutConfigs();
    expect(gtm.resolveActiveScope).toHaveBeenCalledWith(MEMBER);
    expect(gtm.demoConfigActiveScopeWhere).toHaveBeenCalledWith(MEMBER, { kind: "all" });
    expect(services.demoConfigs.list).toHaveBeenCalledWith({
      where: { __scoped: true },
      kind: "checkout",
      limit: expect.any(Number),
    });
    expect(checkouts.map((c) => (c as { id: string }).id).sort()).toEqual(["mine", "theirs"]);
  });

  it("narrows to the caller's own prospects when the active scope is mine+teamId", async () => {
    gtm.getSessionUser.mockResolvedValue(MEMBER);
    gtm.resolveActiveScope.mockResolvedValue({ kind: "mine", teamId: "team-1" });
    gtm.demoConfigActiveScopeWhere.mockReturnValue({ __scoped: "mine-team-1" });
    services.demoConfigs.list.mockResolvedValue({
      items: [{ id: "mine-in-team", ownerId: "sub-1", prospectId: "p1", updatedAt: new Date() }],
      nextCursor: null,
    });
    services.prospects.get.mockResolvedValue(null);
    const { checkouts } = await getAllCheckoutConfigs();
    expect(gtm.demoConfigActiveScopeWhere).toHaveBeenCalledWith(MEMBER, {
      kind: "mine",
      teamId: "team-1",
    });
    expect(checkouts.map((c) => (c as { id: string }).id)).toEqual(["mine-in-team"]);
  });
});
