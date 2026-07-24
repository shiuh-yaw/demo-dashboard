/**
 * getAllProspectProfiles / listProspectsPage paging: proves the dedicated
 * Prospects list page's infinite-scroll wiring (GTM-07) never bypasses the
 * active-scope where-builder - every page, first or subsequent, is built
 * from `prospectScopeWhere(user, scope)`, and a `cursor` passes straight
 * through to `prospectService.list` untouched.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { prospectService, teamsService, gtm } = vi.hoisted(() => ({
  prospectService: { list: vi.fn() },
  teamsService: { list: vi.fn(), membershipsForUser: vi.fn().mockResolvedValue([]) },
  gtm: {
    getSessionUser: vi.fn(),
    membershipsForUserCached: vi.fn((id: string) =>
      teamsService.membershipsForUser(id),
    ),
    resolveActiveScope: vi.fn(),
    prospectScopeWhere: vi.fn(),
    canMutateProspect: vi.fn(),
    canReassignProspect: vi.fn(),
    visibleProspectIds: vi.fn(),
    isProspectVisible: vi.fn(),
    prospectVisibilityWhere: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/services", () => ({
  prospectService,
  services: {
    demoConfigs: { listIdKinds: vi.fn().mockResolvedValue([]) },
    prospects: prospectService,
    users: { list: vi.fn(), resolveByDynamicIds: vi.fn() },
    teams: teamsService,
  },
}));
vi.mock("@/lib/services/prospect-mapper", () => ({
  prospectToProfile: (p: Record<string, unknown>) => ({
    id: p.id,
    name: p.name,
    ownerId: p.ownerId,
    demos: p.demos ?? {},
    createdById: p.createdById ?? null,
    teamId: p.teamId ?? null,
    updatedAt: p.updatedAt ?? "2026-01-01T00:00:00.000Z",
    createdAt: p.createdAt ?? "2026-01-01T00:00:00.000Z",
  }),
  createRequestToInput: vi.fn(),
  updateRequestToInput: vi.fn(),
}));
vi.mock("@/lib/auth/gtm", () => gtm);
vi.mock("@/lib/auth/policy", () => ({ canCreateRecord: vi.fn() }));

import { getAllProspectProfiles, listProspectsPage } from "@/lib/actions/prospects";

const MEMBER = { id: "u1", dynamicUserId: "sub-1", role: "MEMBER" as const };
const ADMIN = { id: "u9", dynamicUserId: "sub-9", role: "ADMIN" as const };

const row = (id: string) => ({ id, name: `Prospect ${id}`, ownerId: "sub-1" });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getAllProspectProfiles (first page)", () => {
  it("scopes the query through prospectScopeWhere and returns the enforced scope", async () => {
    gtm.getSessionUser.mockResolvedValue(MEMBER);
    gtm.resolveActiveScope.mockResolvedValue({ kind: "mine" });
    gtm.prospectScopeWhere.mockReturnValue({ ownerId: "sub-1" });
    prospectService.list.mockResolvedValue({
      items: [row("p1"), row("p2")],
      nextCursor: "cursor-2",
    });

    const res = await getAllProspectProfiles();

    expect(gtm.prospectScopeWhere).toHaveBeenCalledWith(MEMBER, { kind: "mine" });
    expect(prospectService.list).toHaveBeenCalledWith({
      where: { ownerId: "sub-1" },
      cursor: undefined,
    });
    expect(res.scope).toEqual({ kind: "mine" });
    expect(res.profiles.items.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(res.profiles.nextCursor).toBe("cursor-2");
  });

  it("fetches the bounded orphaned list for an ADMIN on the first page only", async () => {
    gtm.getSessionUser.mockResolvedValue(ADMIN);
    gtm.resolveActiveScope.mockResolvedValue({ kind: "all" });
    gtm.prospectScopeWhere.mockReturnValue({});
    prospectService.list
      .mockResolvedValueOnce({ items: [row("p1")], nextCursor: null }) // scoped page
      .mockResolvedValueOnce({ items: [row("orphan-1")], nextCursor: null }); // orphaned

    const res = await getAllProspectProfiles();

    expect(prospectService.list).toHaveBeenNthCalledWith(2, {
      where: { ownerId: "" },
      limit: expect.any(Number),
    });
    expect(res.orphaned.map((p) => p.id)).toEqual(["orphan-1"]);
  });

  it("skips the orphaned fetch when a cursor is supplied (not the first page)", async () => {
    gtm.getSessionUser.mockResolvedValue(ADMIN);
    gtm.resolveActiveScope.mockResolvedValue({ kind: "all" });
    gtm.prospectScopeWhere.mockReturnValue({});
    prospectService.list.mockResolvedValue({ items: [row("p3")], nextCursor: null });

    const res = await getAllProspectProfiles(undefined, "cursor-2");

    expect(prospectService.list).toHaveBeenCalledTimes(1);
    expect(prospectService.list).toHaveBeenCalledWith({
      where: {},
      cursor: "cursor-2",
    });
    expect(res.orphaned).toEqual([]);
  });

  it("returns an empty page and never queries the DB when unauthenticated", async () => {
    gtm.getSessionUser.mockResolvedValue(null);

    const res = await getAllProspectProfiles();

    expect(prospectService.list).not.toHaveBeenCalled();
    expect(res).toEqual({
      profiles: { items: [], nextCursor: null },
      orphaned: [],
      scope: { kind: "mine" },
    });
  });
});

describe("listProspectsPage (useInfiniteList's fetchPage)", () => {
  it("passes cursor through and returns the bare Page, still scoped", async () => {
    gtm.getSessionUser.mockResolvedValue(MEMBER);
    gtm.prospectScopeWhere.mockReturnValue({ teamId: "team-1" });
    // MEMBER is a real member of team-1, so the explicitly-requested "team"
    // scope survives enforceScope's permission check unchanged.
    teamsService.membershipsForUser.mockResolvedValue([{ teamId: "team-1" }]);
    prospectService.list.mockResolvedValue({
      items: [row("p5")],
      nextCursor: null,
    });

    const scope = { kind: "team" as const, teamId: "team-1" };
    const page = await listProspectsPage(scope, "cursor-9");

    // Explicit scope passthrough re-enforces via enforceScope(user, scope)
    // rather than re-deriving from cookies - resolveActiveScope must NOT be
    // consulted when a scope is explicitly supplied.
    expect(gtm.resolveActiveScope).not.toHaveBeenCalled();
    expect(gtm.prospectScopeWhere).toHaveBeenCalledWith(MEMBER, scope);
    expect(prospectService.list).toHaveBeenCalledWith({
      where: { teamId: "team-1" },
      cursor: "cursor-9",
    });
    expect(page).toEqual({
      items: [expect.objectContaining({ id: "p5" })],
      nextCursor: null,
    });
  });

  it("fails closed: a non-admin requesting 'all' collapses to 'mine'", async () => {
    gtm.getSessionUser.mockResolvedValue(MEMBER);
    gtm.prospectScopeWhere.mockReturnValue({});
    prospectService.list.mockResolvedValue({ items: [], nextCursor: null });

    await listProspectsPage({ kind: "all" }, null);

    expect(gtm.prospectScopeWhere).toHaveBeenCalledWith(MEMBER, { kind: "mine" });
  });
});
