/**
 * PostgresTeamService - Postgres-only (no legacy Redis equivalent), backed
 * by an in-memory fake of the `prisma.team` / `prisma.teamMembership`
 * delegates.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { PostgresTeamService } from "@/lib/services/postgres/teams";
import { TeamMembershipNotFoundError } from "@/lib/services/types";

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

  it("adds a member defaulting to the MEMBER role", async () => {
    const team = await svc.create({ name: "T", slug: "t" });
    const m = await svc.addMember("u1", team.id);
    expect(m.userId).toBe("u1");
    expect(m.teamId).toBe(team.id);
    expect(m.role).toBe("MEMBER");
    expect(m.id).toEqual(expect.any(String));
  });

  it("adds a member with an explicit role", async () => {
    const team = await svc.create({ name: "T", slug: "t" });
    const m = await svc.addMember("u1", team.id, "ADMIN");
    expect(m.role).toBe("ADMIN");
  });

  it("addMember is idempotent on the (userId, teamId) unique pair and keeps the existing role", async () => {
    const team = await svc.create({ name: "T", slug: "t" });
    const first = await svc.addMember("u1", team.id, "ADMIN");
    // A concurrent auto-join (MEMBER) must not downgrade an existing ADMIN.
    const second = await svc.addMember("u1", team.id, "MEMBER");
    expect(second.id).toBe(first.id);
    expect(second.role).toBe("ADMIN");
    const memberships = await svc.membershipsForUser("u1");
    expect(memberships).toHaveLength(1);
  });

  it("setMembershipRole changes an existing membership's role", async () => {
    const team = await svc.create({ name: "T", slug: "t" });
    await svc.addMember("u1", team.id);
    const updated = await svc.setMembershipRole("u1", team.id, "OWNER");
    expect(updated.role).toBe("OWNER");
    const [membership] = await svc.membershipsForUser("u1");
    expect(membership!.role).toBe("OWNER");
  });

  it("setMembershipRole throws when the membership is absent", async () => {
    const team = await svc.create({ name: "T", slug: "t" });
    await expect(
      svc.setMembershipRole("ghost", team.id, "ADMIN"),
    ).rejects.toBeInstanceOf(TeamMembershipNotFoundError);
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
});
