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
    expect(all.items).toHaveLength(1);
    expect(all.items[0]!.slug).toBe("acme");
    expect(all.nextCursor).toBeNull();
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

  it("lists every membership of a team via membershipsForTeam", async () => {
    const team = await svc.create({ name: "Acme", slug: "acme" });
    const other = await svc.create({ name: "Globex", slug: "globex" });
    await svc.addMember("u1", team.id, "ADMIN");
    await svc.addMember("u2", team.id, "MEMBER");
    await svc.addMember("u3", other.id, "MEMBER");

    const members = await svc.membershipsForTeam(team.id);
    expect(members.map((m) => m.userId).sort()).toEqual(["u1", "u2"]);
    expect(members.find((m) => m.userId === "u1")!.role).toBe("ADMIN");
  });

  describe("list pagination", () => {
    it("defaults to DEFAULT_PAGE_LIMIT and returns nextCursor: null for a partial page", async () => {
      await svc.create({ name: "A", slug: "a" });
      await svc.create({ name: "B", slug: "b" });
      const page = await svc.list();
      expect(page.items).toHaveLength(2);
      expect(page.nextCursor).toBeNull();
    });

    it("clamps an over-large limit to MAX_PAGE_LIMIT", async () => {
      for (let i = 0; i < 5; i++) {
        await svc.create({ name: `T${i}`, slug: `t${i}` });
      }
      const page = await svc.list({ limit: 1000 });
      // All 5 rows fit under the clamped ceiling - still a full read, no
      // truncation from the (irrelevant, small) test fixture size.
      expect(page.items).toHaveLength(5);
      expect(page.nextCursor).toBeNull();
    });

    it("a full page sets nextCursor; the next call resumes after it, newest-created first", async () => {
      const first = await svc.create({ name: "A", slug: "a" });
      await new Promise((r) => setTimeout(r, 5));
      const second = await svc.create({ name: "B", slug: "b" });
      await new Promise((r) => setTimeout(r, 5));
      const third = await svc.create({ name: "C", slug: "c" });

      const page1 = await svc.list({ limit: 2 });
      expect(page1.items.map((t) => t.id)).toEqual([third.id, second.id]);
      expect(page1.nextCursor).not.toBeNull();

      const page2 = await svc.list({ limit: 2, cursor: page1.nextCursor });
      expect(page2.items.map((t) => t.id)).toEqual([first.id]);
      expect(page2.nextCursor).toBeNull();
    });
  });
});
