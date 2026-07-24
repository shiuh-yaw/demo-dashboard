/**
 * Prospect action wiring: proves getProspectProfile (I-1 fix) routes through
 * the same visibility seam as the scoped list/picker actions instead of
 * returning any authenticated user's record by id. Decision logic itself is
 * covered by gtm.test.ts; this test guards the wiring so a dropped guard is
 * caught.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { prospectService, gtm, usersService, teamsService } = vi.hoisted(() => ({
  prospectService: { get: vi.fn(), update: vi.fn() },
  gtm: {
    getSessionUser: vi.fn(),
    canMutateProspect: vi.fn(),
    canReassignProspect: vi.fn(),
    visibleProspectIds: vi.fn(),
    isProspectVisible: vi.fn(),
    canViewProspect: vi.fn(),
  },
  usersService: {
    get: vi.fn(),
    list: vi.fn(),
    resolveByDynamicIds: vi.fn().mockResolvedValue(new Map()),
  },
  teamsService: { list: vi.fn() },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/services", () => ({
  prospectService,
  services: {
    demoConfigs: { listIdKinds: vi.fn().mockResolvedValue([]) },
    prospects: prospectService,
    users: usersService,
    teams: teamsService,
  },
}));
vi.mock("@/lib/services/prospect-mapper", () => ({
  prospectToProfile: (p: Record<string, unknown>) => ({
    id: p.id,
    name: p.name,
    demos: p.demos ?? {},
    createdById: p.createdById ?? null,
    teamId: p.teamId ?? null,
  }),
  updateRequestToInput: (req: Record<string, unknown>) => req,
}));
vi.mock("@/lib/auth/gtm", () => gtm);
vi.mock("@/lib/auth/policy", () => ({ canCreateRecord: vi.fn() }));

import { revalidatePath } from "next/cache";
import {
  getProspectProfile,
  updateProspectProfile,
  reassignProspectOwner,
  reassignProspectTeam,
  listAssignableUsers,
} from "@/lib/actions/prospects";

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
    gtm.canViewProspect.mockResolvedValue(false);
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
    gtm.canViewProspect.mockResolvedValue(true);
    const res = await getProspectProfile("p1");
    expect(res.success).toBe(true);
  });

  it("ADMIN reads anything ('all' visibility)", async () => {
    gtm.getSessionUser.mockResolvedValue(ADMIN);
    prospectService.get.mockResolvedValue(foreign);
    gtm.canViewProspect.mockResolvedValue(true);
    const res = await getProspectProfile("p1");
    expect(res.success).toBe(true);
  });
});

describe("getProspectProfile (resolvedOwnerId - legacy owner fix)", () => {
  it("createdById set - resolvedOwnerId mirrors it, no dynamicUserId lookup", async () => {
    gtm.getSessionUser.mockResolvedValue(MEMBER);
    prospectService.get.mockResolvedValue({
      id: "p1",
      name: "Acme",
      ownerId: "sub-1",
      createdById: "u1",
    });
    gtm.canViewProspect.mockResolvedValue(true);

    const res = await getProspectProfile("p1");

    expect(res.success).toBe(true);
    if (res.success) expect(res.data.resolvedOwnerId).toBe("u1");
    expect(usersService.resolveByDynamicIds).not.toHaveBeenCalled();
  });

  it("legacy row (createdById null, ownerId is a dynamicUserId) resolves to the matching User.id", async () => {
    gtm.getSessionUser.mockResolvedValue(MEMBER);
    prospectService.get.mockResolvedValue({
      id: "p1",
      name: "Acme",
      ownerId: "sub-1",
      createdById: null,
    });
    gtm.canViewProspect.mockResolvedValue(true);
    usersService.resolveByDynamicIds.mockResolvedValue(
      new Map([["sub-1", { id: "u1", dynamicUserId: "sub-1" }]]),
    );

    const res = await getProspectProfile("p1");

    expect(res.success).toBe(true);
    if (res.success) expect(res.data.resolvedOwnerId).toBe("u1");
    expect(usersService.resolveByDynamicIds).toHaveBeenCalledWith(["sub-1"]);
  });

  it("legacy row whose ownerId matches no User (deleted/unknown sub) resolves to null - placeholder is acceptable", async () => {
    gtm.getSessionUser.mockResolvedValue(MEMBER);
    prospectService.get.mockResolvedValue({
      id: "p1",
      name: "Acme",
      ownerId: "sub-orphan",
      createdById: null,
    });
    gtm.canViewProspect.mockResolvedValue(true);
    usersService.resolveByDynamicIds.mockResolvedValue(new Map());

    const res = await getProspectProfile("p1");

    expect(res.success).toBe(true);
    if (res.success) expect(res.data.resolvedOwnerId).toBeNull();
  });

  it("orphaned row (ownerId '', createdById null) resolves to null without calling the lookup", async () => {
    gtm.getSessionUser.mockResolvedValue(ADMIN);
    prospectService.get.mockResolvedValue({
      id: "p1",
      name: "Acme",
      ownerId: "",
      createdById: null,
    });
    gtm.canViewProspect.mockResolvedValue(true);

    const res = await getProspectProfile("p1");

    expect(res.success).toBe(true);
    if (res.success) expect(res.data.resolvedOwnerId).toBeNull();
    expect(usersService.resolveByDynamicIds).not.toHaveBeenCalled();
  });
});

describe("listAssignableUsers (current-owner inclusion)", () => {
  const roster = [
    { id: "u1", email: "a@x.com", displayName: "A", role: "MEMBER", deactivatedAt: null },
    {
      id: "u2",
      email: "b@x.com",
      displayName: "B",
      role: "MEMBER",
      deactivatedAt: new Date("2026-01-01"),
    },
  ];

  it("excludes deactivated users when no current owner is given", async () => {
    gtm.getSessionUser.mockResolvedValue(MEMBER);
    usersService.list.mockResolvedValue({ items: roster, nextCursor: null });

    const res = await listAssignableUsers();

    expect(res.success).toBe(true);
    if (res.success) expect(res.data.map((u) => u.id)).toEqual(["u1"]);
  });

  it("includes the resolved current owner even when deactivated, marked as such", async () => {
    gtm.getSessionUser.mockResolvedValue(MEMBER);
    usersService.list.mockResolvedValue({ items: roster, nextCursor: null });

    const res = await listAssignableUsers("u2");

    expect(res.success).toBe(true);
    if (res.success) {
      const owner = res.data.find((u) => u.id === "u2");
      expect(owner?.deactivated).toBe(true);
    }
  });

  it("does not add a phantom entry when currentOwnerId matches no user", async () => {
    gtm.getSessionUser.mockResolvedValue(MEMBER);
    usersService.list.mockResolvedValue({ items: roster, nextCursor: null });

    const res = await listAssignableUsers("nonexistent");

    expect(res.success).toBe(true);
    if (res.success) expect(res.data.map((u) => u.id)).toEqual(["u1"]);
  });
});

describe("updateProspectProfile (hub layout revalidation)", () => {
  it("revalidates the prospect hub layout so the header + breadcrumb pick up the rename live", async () => {
    gtm.getSessionUser.mockResolvedValue(MEMBER);
    prospectService.get.mockResolvedValue({
      id: "p1",
      name: "Old Name",
      ownerId: "sub-1",
      createdById: "u1",
    });
    gtm.canMutateProspect.mockResolvedValue(true);
    prospectService.update.mockResolvedValue({ id: "p1", name: "New Name" });

    const res = await updateProspectProfile("p1", { name: "New Name" });

    expect(res.success).toBe(true);
    // "layout" (not the default "page") so every sub-tab under this id and
    // the hub header/breadcrumb - both rendered by the layout, not the page -
    // refresh without a hard reload.
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/prospects/p1", "layout");
  });
});

describe("reassignProspectOwner (GTM-08F, server-side authorization)", () => {
  const prospect = { id: "p1", createdById: "u1", ownerId: "sub-1", teamId: null };

  it("succeeds for an authorized actor (current owner) and revalidates operator + hub layouts", async () => {
    gtm.getSessionUser.mockResolvedValue(MEMBER);
    prospectService.get.mockResolvedValue(prospect);
    gtm.canReassignProspect.mockReturnValue(true);
    usersService.get.mockResolvedValue({ id: "u2", deactivatedAt: null });
    prospectService.update.mockResolvedValue({
      id: "p1",
      createdById: "u2",
      teamId: null,
    });

    const res = await reassignProspectOwner("p1", "u2");

    expect(res.success).toBe(true);
    expect(prospectService.update).toHaveBeenCalledWith("p1", { createdById: "u2" });
    // Owner reassignment reshapes visibility everywhere - the operator layout
    // (switcher/lists/scope) must revalidate, not just this id's hub.
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/prospects/p1", "layout");
  });

  it("is rejected for an unauthorized actor (not the owner, not ADMIN/OWNER) and never mutates or revalidates", async () => {
    gtm.getSessionUser.mockResolvedValue(MEMBER);
    prospectService.get.mockResolvedValue(prospect);
    gtm.canReassignProspect.mockReturnValue(false);

    const res = await reassignProspectOwner("p1", "u2");

    expect(res).toEqual({
      success: false,
      error: "Only the current owner or an admin can reassign this prospect",
    });
    expect(prospectService.update).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a deactivated target user even for an authorized actor", async () => {
    gtm.getSessionUser.mockResolvedValue(ADMIN);
    prospectService.get.mockResolvedValue(prospect);
    gtm.canReassignProspect.mockReturnValue(true);
    usersService.get.mockResolvedValue({ id: "u2", deactivatedAt: new Date() });

    const res = await reassignProspectOwner("p1", "u2");

    expect(res.success).toBe(false);
    expect(prospectService.update).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("reassignProspectTeam (GTM-08F, server-side authorization)", () => {
  const prospect = { id: "p1", createdById: "u1", ownerId: "sub-1", teamId: "team-1" };

  it("succeeds for an authorized actor and revalidates operator + hub layouts", async () => {
    gtm.getSessionUser.mockResolvedValue(MEMBER);
    prospectService.get.mockResolvedValue(prospect);
    gtm.canReassignProspect.mockReturnValue(true);
    teamsService.list.mockResolvedValue({ items: [{ id: "team-2", name: "Team Two" }], nextCursor: null });
    prospectService.update.mockResolvedValue({
      id: "p1",
      createdById: "u1",
      teamId: "team-2",
    });

    const res = await reassignProspectTeam("p1", "team-2");

    expect(res.success).toBe(true);
    expect(prospectService.update).toHaveBeenCalledWith("p1", { teamId: "team-2" });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/prospects/p1", "layout");
  });

  it("allows clearing the team (teamId: null) without a team-existence check", async () => {
    gtm.getSessionUser.mockResolvedValue(MEMBER);
    prospectService.get.mockResolvedValue(prospect);
    gtm.canReassignProspect.mockReturnValue(true);
    prospectService.update.mockResolvedValue({
      id: "p1",
      createdById: "u1",
      teamId: null,
    });

    const res = await reassignProspectTeam("p1", null);

    expect(res.success).toBe(true);
    expect(teamsService.list).not.toHaveBeenCalled();
    expect(prospectService.update).toHaveBeenCalledWith("p1", { teamId: null });
  });

  it("is rejected for an unauthorized actor and never mutates or revalidates", async () => {
    gtm.getSessionUser.mockResolvedValue(MEMBER);
    prospectService.get.mockResolvedValue(prospect);
    gtm.canReassignProspect.mockReturnValue(false);

    const res = await reassignProspectTeam("p1", "team-2");

    expect(res).toEqual({
      success: false,
      error: "Only the current owner or an admin can reassign this prospect",
    });
    expect(prospectService.update).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("reassignProspectOwner (GTM-08M regression - valid reassignment end to end)", () => {
  it("a valid, authorized reassignment succeeds and the returned profile reflects the new owner", async () => {
    const prospect = { id: "p1", createdById: "u1", ownerId: "sub-1", teamId: null };
    gtm.getSessionUser.mockResolvedValue(MEMBER);
    prospectService.get.mockResolvedValue(prospect);
    gtm.canReassignProspect.mockReturnValue(true);
    usersService.get.mockResolvedValue({ id: "u2", deactivatedAt: null });
    // Simulates the persisted row after a real service update: createdById
    // actually changed to the target, everything else untouched.
    prospectService.update.mockResolvedValue({
      id: "p1",
      createdById: "u2",
      teamId: null,
    });

    const res = await reassignProspectOwner("p1", "u2");

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.createdById).toBe("u2");
    }
    // The exact field the picker reads back (createdById, not ownerId) is
    // what got written - a stale/wrong-field write would leave this at "u1".
    expect(prospectService.update).toHaveBeenCalledWith("p1", { createdById: "u2" });
    expect(usersService.get).toHaveBeenCalledWith("u2");
  });
});
