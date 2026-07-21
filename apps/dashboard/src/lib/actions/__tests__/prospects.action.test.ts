/**
 * Prospect action wiring: proves getProspectProfile (I-1 fix) routes through
 * the same visibility seam as the scoped list/picker actions instead of
 * returning any authenticated user's record by id. Decision logic itself is
 * covered by gtm.test.ts; this test guards the wiring so a dropped guard is
 * caught.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { prospectService, gtm } = vi.hoisted(() => ({
  prospectService: { get: vi.fn() },
  gtm: {
    getSessionUser: vi.fn(),
    canMutateProspect: vi.fn(),
    visibleProspectIds: vi.fn(),
    isProspectVisible: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/services", () => ({
  prospectService,
  services: { demoConfigs: {}, prospects: prospectService },
}));
vi.mock("@/lib/services/prospect-mapper", () => ({
  prospectToProfile: (p: Record<string, unknown>) => ({ id: p.id, name: p.name }),
}));
vi.mock("@/lib/auth/gtm", () => gtm);
vi.mock("@/lib/auth/policy", () => ({ canCreateRecord: vi.fn() }));

import { getProspectProfile } from "@/lib/actions/prospects";

const MEMBER = { id: "u1", dynamicUserId: "sub-1", role: "MEMBER" as const };
const ADMIN = { id: "u9", dynamicUserId: "sub-9", role: "ADMIN" as const };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getProspectProfile (detail-read visibility, I-1 fix)", () => {
  const foreign = { id: "p1", name: "Acme", ownerId: "sub-2", createdById: "u2" };

  it("MEMBER reading another member's prospect gets the same not-found as a missing id", async () => {
    gtm.getSessionUser.mockResolvedValue(MEMBER);
    prospectService.get.mockResolvedValue(foreign);
    gtm.visibleProspectIds.mockResolvedValue(new Set());
    gtm.isProspectVisible.mockReturnValue(false);
    const res = await getProspectProfile("p1");
    expect(res).toEqual({ success: false, error: "Prospect profile not found" });

    prospectService.get.mockResolvedValue(null);
    const missing = await getProspectProfile("nonexistent");
    expect(missing).toEqual(res);
  });

  it("MEMBER reads their own prospect fine", async () => {
    gtm.getSessionUser.mockResolvedValue(MEMBER);
    prospectService.get.mockResolvedValue({
      id: "p1",
      name: "Acme",
      ownerId: "sub-1",
      createdById: "u1",
    });
    gtm.visibleProspectIds.mockResolvedValue(new Set(["p1"]));
    gtm.isProspectVisible.mockReturnValue(true);
    const res = await getProspectProfile("p1");
    expect(res.success).toBe(true);
  });

  it("ADMIN reads anything ('all' visibility)", async () => {
    gtm.getSessionUser.mockResolvedValue(ADMIN);
    prospectService.get.mockResolvedValue(foreign);
    gtm.visibleProspectIds.mockResolvedValue("all");
    gtm.isProspectVisible.mockReturnValue(true);
    const res = await getProspectProfile("p1");
    expect(res.success).toBe(true);
  });
});
