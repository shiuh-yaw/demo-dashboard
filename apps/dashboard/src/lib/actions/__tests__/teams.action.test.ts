/**
 * Team-management action wiring - admin-gated, with grantable roles bounded by
 * the real canSetRole matrix. Session + team service are mocked.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { services, gtm } = vi.hoisted(() => ({
  services: {
    teams: {
      create: vi.fn(),
      addMember: vi.fn(),
      removeMember: vi.fn(),
      setMembershipRole: vi.fn(),
      membershipsForUser: vi.fn(),
    },
  },
  gtm: { getSessionUser: vi.fn() },
}));
vi.mock("@/lib/services", () => ({ services }));
vi.mock("@/lib/auth/gtm", () => gtm);

import {
  addTeamMember,
  createTeam,
  removeTeamMember,
  setTeamMembershipRole,
} from "@/lib/actions/teams";

const actor = (role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER") => ({
  id: "actor",
  dynamicUserId: "sub-actor",
  role,
});

beforeEach(() => vi.clearAllMocks());

describe("createTeam", () => {
  it("is denied to a MEMBER and allowed to an ADMIN", async () => {
    gtm.getSessionUser.mockResolvedValue(actor("MEMBER"));
    expect((await createTeam("T", "t")).success).toBe(false);
    expect(services.teams.create).not.toHaveBeenCalled();

    gtm.getSessionUser.mockResolvedValue(actor("ADMIN"));
    services.teams.create.mockResolvedValue({ id: "team1" });
    expect((await createTeam("T", "t")).success).toBe(true);
  });
});

describe("addTeamMember", () => {
  it("ADMIN may add a MEMBER but not an ADMIN", async () => {
    gtm.getSessionUser.mockResolvedValue(actor("ADMIN"));
    services.teams.addMember.mockResolvedValue({ id: "m", role: "MEMBER" });
    expect((await addTeamMember("u2", "team1", "MEMBER")).success).toBe(true);

    const denied = await addTeamMember("u2", "team1", "ADMIN");
    expect(denied).toEqual({ success: false, error: "Access denied" });
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

    gtm.getSessionUser.mockResolvedValue(actor("ADMIN"));
    expect((await removeTeamMember("u2", "team1")).success).toBe(true);
    expect(services.teams.removeMember).toHaveBeenCalledWith("u2", "team1");
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
