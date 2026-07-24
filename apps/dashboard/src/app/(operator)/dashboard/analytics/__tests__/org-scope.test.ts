/**
 * `resolveOrgAnalyticsScope` wiring: `kindByConfigId` must come from the
 * unpaginated `listIdKinds` projection, never a capped `list()` page, so an
 * org with more than one page of demo configs never silently drops kinds
 * from the org-wide per-kind comparison.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { services, gtm } = vi.hoisted(() => ({
  services: {
    demoConfigs: { listIdKinds: vi.fn() },
  },
  gtm: {
    getSessionUser: vi.fn(),
    visibleProspectIds: vi.fn(),
  },
}));

vi.mock("@/lib/services", () => ({ services }));
vi.mock("@/lib/auth/gtm", () => gtm);

import { resolveOrgAnalyticsScope } from "@/app/(operator)/dashboard/analytics/org-scope";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveOrgAnalyticsScope", () => {
  it("builds kindByConfigId from listIdKinds (unpaginated id+kind), not a capped list()", async () => {
    const user = { id: "u1", dynamicUserId: "sub-1", role: "MEMBER" as const };
    gtm.getSessionUser.mockResolvedValue(user);
    gtm.visibleProspectIds.mockResolvedValue(new Set(["p1"]));
    services.demoConfigs.listIdKinds.mockResolvedValue([
      { id: "d1", kind: "earn" },
      { id: "d2", kind: "wallet" },
    ]);

    const { scope, kindByConfigId } = await resolveOrgAnalyticsScope();

    expect(services.demoConfigs.listIdKinds).toHaveBeenCalledWith({});
    expect(scope).toEqual(new Set(["p1"]));
    expect(kindByConfigId).toEqual(
      new Map([
        ["d1", "earn"],
        ["d2", "wallet"],
      ]),
    );
  });

  it("resolves an empty scope (never trusted from the client) for an unauthenticated caller", async () => {
    gtm.getSessionUser.mockResolvedValue(null);
    services.demoConfigs.listIdKinds.mockResolvedValue([]);

    const { scope, kindByConfigId } = await resolveOrgAnalyticsScope();

    expect(gtm.visibleProspectIds).not.toHaveBeenCalled();
    expect(scope).toEqual(new Set());
    expect(kindByConfigId.size).toBe(0);
  });
});
