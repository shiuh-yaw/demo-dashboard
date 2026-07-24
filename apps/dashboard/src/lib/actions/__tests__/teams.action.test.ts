/**
 * Team-management action wiring - admin-gated, with grantable roles bounded by
 * the real canSetRole matrix. Session + team service are mocked.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { services, gtm } = vi.hoisted(() => ({
  services: {
    teams: {
      create: vi.fn(),
      list: vi.fn(),
      addMember: vi.fn(),
      removeMember: vi.fn(),
      setMembershipRole: vi.fn(),
      membershipsForUser: vi.fn(),
    },
    users: {
      list: vi.fn(),
    },
  },
  gtm: { getSessionUser: vi.fn() },
}));
vi.mock("@/lib/services", () => ({ services }));
vi.mock("@/lib/auth/gtm", () => gtm);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { revalidatePath } from "next/cache";
import {
  addTeamMember,
  createTeam,
  listTeams,
  listWorkspaceUsers,
  removeTeamMember,
  setTeamMembershipRole,
} from "@/lib/actions/teams";

const actor = (role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER") => ({
  id: "actor",
  dynamicUserId: "sub-actor",
  role,
});

beforeEach(() => vi.clearAllMocks());

describe("listTeams", () => {
  it("is denied to a non-admin actor and never calls the service", async () => {
    gtm.getSessionUser.mockResolvedValue(actor("MEMBER"));
    expect(await listTeams()).toEqual({
      success: false,
      error: "Access denied",
    });
    expect(services.teams.list).not.toHaveBeenCalled();
  });

  it("returns items + nextCursor for an admin, passing options through untouched", async () => {
    gtm.getSessionUser.mockResolvedValue(actor("ADMIN"));
    const page = {
      items: [{ id: "team1", name: "Team 1", slug: "team-1", createdAt: new Date() }],
      nextCursor: "cursor-2",
    };
    services.teams.list.mockResolvedValue(page);

    const result = await listTeams({ cursor: "cursor-1" });

    expect(services.teams.list).toHaveBeenCalledWith({ cursor: "cursor-1" });
    expect(result).toEqual({ success: true, data: page });
  });

  it("reports the last page via a null nextCursor", async () => {
    gtm.getSessionUser.mockResolvedValue(actor("ADMIN"));
    services.teams.list.mockResolvedValue({ items: [], nextCursor: null });

    const result = await listTeams({ cursor: "cursor-2" });

    expect(result).toEqual({
      success: true,
      data: { items: [], nextCursor: null },
    });
  });
});

describe("listWorkspaceUsers", () => {
  it("is denied to a non-admin actor and never calls the service", async () => {
    gtm.getSessionUser.mockResolvedValue(actor("VIEWER"));
    expect(await listWorkspaceUsers()).toEqual({
      success: false,
      error: "Access denied",
    });
    expect(services.users.list).not.toHaveBeenCalled();
  });

  it("maps to AdminUserView, forwards the cursor, and carries nextCursor", async () => {
    gtm.getSessionUser.mockResolvedValue(actor("ADMIN"));
    services.users.list.mockResolvedValue({
      items: [
        {
          id: "u1",
          email: "a@example.com",
          displayName: "A",
          role: "MEMBER",
          dynamicUserId: null,
        },
      ],
      nextCursor: "cursor-2",
    });

    const result = await listWorkspaceUsers({ cursor: "cursor-1" });

    expect(services.users.list).toHaveBeenCalledWith({ cursor: "cursor-1" });
    expect(result).toEqual({
      success: true,
      data: {
        items: [
          { id: "u1", email: "a@example.com", displayName: "A", role: "MEMBER" },
        ],
        nextCursor: "cursor-2",
      },
    });
  });
});

describe("createTeam", () => {
  it("is denied to a MEMBER and allowed to an ADMIN", async () => {
    gtm.getSessionUser.mockResolvedValue(actor("MEMBER"));
    expect((await createTeam("T", "t")).success).toBe(false);
    expect(services.teams.create).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();

    gtm.getSessionUser.mockResolvedValue(actor("ADMIN"));
    services.teams.create.mockResolvedValue({ id: "team1" });
    expect((await createTeam("T", "t")).success).toBe(true);
    // The switcher and the teams table both live outside this action's own
    // page, so a create must revalidate the shared operator layout too.
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});

describe("addTeamMember", () => {
  it("ADMIN may add a MEMBER but not an ADMIN", async () => {
    gtm.getSessionUser.mockResolvedValue(actor("ADMIN"));
    services.teams.addMember.mockResolvedValue({ id: "m", role: "MEMBER" });
    expect((await addTeamMember("u2", "team1", "MEMBER")).success).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");

    vi.clearAllMocks();
    gtm.getSessionUser.mockResolvedValue(actor("ADMIN"));
    const denied = await addTeamMember("u2", "team1", "ADMIN");
    expect(denied).toEqual({ success: false, error: "Access denied" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("OWNER may add an ADMIN", async () => {
    gtm.getSessionUser.mockResolvedValue(actor("OWNER"));
    services.teams.addMember.mockResolvedValue({ id: "m", role: "ADMIN" });
    expect((await addTeamMember("u2", "team1", "ADMIN")).success).toBe(true);
  });

  it("is denied to a plain MEMBER actor", async () => {
    gtm.getSessionUser.mockResolvedValue(actor("MEMBER"));
    expect((await addTeamMember("u2", "team1", "MEMBER")).success).toBe(false);
  });
});

describe("removeTeamMember", () => {
  it("is admin-gated", async () => {
    gtm.getSessionUser.mockResolvedValue(actor("VIEWER"));
    expect((await removeTeamMember("u2", "team1")).success).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();

    gtm.getSessionUser.mockResolvedValue(actor("ADMIN"));
    expect((await removeTeamMember("u2", "team1")).success).toBe(true);
    expect(services.teams.removeMember).toHaveBeenCalledWith("u2", "team1");
    // The removed user's switcher and this page's member count both need to
    // refresh live, not just after a hard reload.
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});

describe("setTeamMembershipRole", () => {
  it("ADMIN may change MEMBER<->VIEWER but not touch a team ADMIN", async () => {
    gtm.getSessionUser.mockResolvedValue(actor("ADMIN"));
    services.teams.membershipsForUser.mockResolvedValue([
      { id: "m", userId: "u2", teamId: "team1", role: "MEMBER", createdAt: new Date() },
    ]);
    services.teams.setMembershipRole.mockResolvedValue({ id: "m", role: "VIEWER" });
    expect((await setTeamMembershipRole("u2", "team1", "VIEWER")).success).toBe(true);

    services.teams.membershipsForUser.mockResolvedValue([
      { id: "m", userId: "u2", teamId: "team1", role: "ADMIN", createdAt: new Date() },
    ]);
    const denied = await setTeamMembershipRole("u2", "team1", "MEMBER");
    expect(denied).toEqual({ success: false, error: "Access denied" });
  });

  it("returns not-found when the membership is absent", async () => {
    gtm.getSessionUser.mockResolvedValue(actor("OWNER"));
    services.teams.membershipsForUser.mockResolvedValue([]);
    expect(await setTeamMembershipRole("u2", "team1", "ADMIN")).toEqual({
      success: false,
      error: "Membership not found",
    });
  });
});
