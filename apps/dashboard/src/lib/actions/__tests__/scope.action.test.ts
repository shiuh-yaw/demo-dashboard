/**
 * getScopeContext wiring: the top-bar team switcher reads `teams` from this
 * action, filtered to the caller's own memberships. Guards that a freshly
 * added membership shows up on the very next call (the operator-layout
 * revalidation fix depends on this staying true - see Phase 07K).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { services, gtm, cookieStore } = vi.hoisted(() => {
  const services = {
    teams: { membershipsForUser: vi.fn(), list: vi.fn() },
  };
  return {
    services,
    gtm: {
      getSessionUser: vi.fn(),
      // Delegates to the team-service spy so tests drive it the same way.
      membershipsForUserCached: vi.fn((id: string) =>
        services.teams.membershipsForUser(id),
      ),
    },
    cookieStore: { get: vi.fn() },
  };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn(() => cookieStore) }));
vi.mock("@/lib/services", () => ({ services }));
vi.mock("@/lib/auth/gtm", () => gtm);

import { getScopeContext } from "@/lib/actions/scope";

const MEMBER = { id: "u1", dynamicUserId: "sub-1", role: "MEMBER" as const };

const EMEA = { id: "team-emea", name: "EMEA", slug: "emea" };
const AMER = { id: "team-amer", name: "AMER", slug: "amer" };

beforeEach(() => {
  vi.clearAllMocks();
  cookieStore.get.mockReturnValue(undefined);
});

describe("getScopeContext", () => {
  it("lists only the caller's own teams, and a freshly-added membership appears immediately", async () => {
    gtm.getSessionUser.mockResolvedValue(MEMBER);
    services.teams.list.mockResolvedValue({ items: [EMEA, AMER], nextCursor: null });

    services.teams.membershipsForUser.mockResolvedValue([]);
    const before = await getScopeContext();
    expect(before.teams).toEqual([]);

    // Simulate the add-member mutation landing between the two calls -
    // exactly what the operator-layout revalidation (item 2) makes visible
    // without a hard reload.
    services.teams.membershipsForUser.mockResolvedValue([
      { id: "m1", userId: "u1", teamId: "team-emea", role: "MEMBER", createdAt: new Date() },
    ]);
    const after = await getScopeContext();
    expect(after.teams).toEqual([{ id: "team-emea", name: "EMEA" }]);
  });

  it("never broadens the list beyond member teams for a non-admin", async () => {
    gtm.getSessionUser.mockResolvedValue(MEMBER);
    services.teams.list.mockResolvedValue({ items: [EMEA, AMER], nextCursor: null });
    services.teams.membershipsForUser.mockResolvedValue([
      { id: "m1", userId: "u1", teamId: "team-emea", role: "MEMBER", createdAt: new Date() },
    ]);
    const ctx = await getScopeContext();
    expect(ctx.teams).toEqual([{ id: "team-emea", name: "EMEA" }]);
    expect(ctx.isAdmin).toBe(false);
  });

  it("returns the personal-only default when unauthenticated", async () => {
    gtm.getSessionUser.mockResolvedValue(null);
    const ctx = await getScopeContext();
    expect(ctx).toEqual({
      isAdmin: false,
      teams: [],
      activeCtx: "personal",
      filter: "mine",
      onTeam: false,
    });
    expect(services.teams.membershipsForUser).not.toHaveBeenCalled();
  });
});
