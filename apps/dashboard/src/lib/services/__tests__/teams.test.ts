/**
 * PostgresTeamService - Postgres-only (no legacy Redis equivalent), backed
 * by an in-memory fake of the `prisma.team` / `prisma.teamMembership`
 * delegates.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { PostgresTeamService } from "@/lib/services/postgres/teams";
import { DEFAULT_TEAM_SLUG } from "@/lib/services/types";

import { createFakeTeamPrisma } from "./fake-prisma-teams";

describe("PostgresTeamService", () => {
  let svc: PostgresTeamService;

  beforeEach(() => {
    svc = new PostgresTeamService(createFakeTeamPrisma());
  });

  it("creates a team and lists it back", async () => {
    const team = await svc.create({ name: "Acme GTM", slug: "acme" });
    expect(team.id).toEqual(expect.any(String));
    expect(team.name).toBe("Acme GTM");
    expect(team.slug).toBe("acme");
    expect(team.createdAt).toBeInstanceOf(Date);

    const all = await svc.list();
    expect(all).toHaveLength(1);
    expect(all[0]!.slug).toBe("acme");
  });

  it("rejects a duplicate slug (unique constraint)", async () => {
    await svc.create({ name: "One", slug: "dup" });
    await expect(svc.create({ name: "Two", slug: "dup" })).rejects.toThrow();
  });

  it("adds a member and returns the membership", async () => {
    const team = await svc.create({ name: "T", slug: "t" });
    const m = await svc.addMember("u1", team.id);
    expect(m.userId).toBe("u1");
    expect(m.teamId).toBe(team.id);
    expect(m.id).toEqual(expect.any(String));
  });

  it("addMember is idempotent on the (userId, teamId) unique pair", async () => {
    const team = await svc.create({ name: "T", slug: "t" });
    const first = await svc.addMember("u1", team.id);
    const second = await svc.addMember("u1", team.id);
    expect(second.id).toBe(first.id);
    const memberships = await svc.membershipsForUser("u1");
    expect(memberships).toHaveLength(1);
  });

  it("membershipsForUser returns every team the user belongs to", async () => {
    const a = await svc.create({ name: "A", slug: "a" });
    const b = await svc.create({ name: "B", slug: "b" });
    await svc.addMember("u1", a.id);
    await svc.addMember("u1", b.id);
    await svc.addMember("u2", a.id);
    const forU1 = await svc.membershipsForUser("u1");
    expect(forU1.map((m) => m.teamId).sort()).toEqual([a.id, b.id].sort());
  });

  it("removeMember drops the membership and is a no-op when absent", async () => {
    const team = await svc.create({ name: "T", slug: "t" });
    await svc.addMember("u1", team.id);
    await svc.removeMember("u1", team.id);
    expect(await svc.membershipsForUser("u1")).toHaveLength(0);
    // Second remove is a no-op (idempotent), does not throw.
    await expect(svc.removeMember("u1", team.id)).resolves.toBeUndefined();
  });

  it("defaultTeam resolves the seeded team by slug 'gtm'", async () => {
    expect(await svc.defaultTeam()).toBeNull();
    await svc.create({ name: "GTM", slug: DEFAULT_TEAM_SLUG });
    const def = await svc.defaultTeam();
    expect(def).not.toBeNull();
    expect(def!.slug).toBe(DEFAULT_TEAM_SLUG);
  });
});
