/**
 * In-memory fake for the `prisma.team` / `prisma.teamMembership` slices used
 * by `PostgresTeamService`. Enforces the `(userId, teamId)` unique pair and
 * the `slug` unique constraint (P2002) the same way Postgres does, so the
 * service's idempotent addMember + slug lookup paths are exercised without a
 * real database. Real-database coverage lives in the migration replay job.
 */

import type { TeamPrismaClient } from "../postgres/teams";
import type { TeamMembershipRow, TeamRow } from "../postgres/row-types";

class FakeUniqueViolation extends Error {
  public readonly code = "P2002";
  constructor(target: string) {
    super(`Unique constraint failed on ${target}`);
    this.name = "PrismaClientKnownRequestError";
  }
}

/** Multi-key comparator matching Prisma's `orderBy: [{a:"desc"},{b:"desc"}]` shape. */
function compareByOrderBy(
  a: TeamRow,
  b: TeamRow,
  orderBy: Array<Record<string, "asc" | "desc">>,
): number {
  for (const clause of orderBy) {
    for (const [key, dir] of Object.entries(clause)) {
      const av = (a as unknown as Record<string, unknown>)[key];
      const bv = (b as unknown as Record<string, unknown>)[key];
      let cmp = 0;
      if (av instanceof Date && bv instanceof Date) cmp = av.getTime() - bv.getTime();
      else if (av! > bv!) cmp = 1;
      else if (av! < bv!) cmp = -1;
      if (cmp !== 0) return dir === "desc" ? -cmp : cmp;
    }
  }
  return 0;
}

export function createFakeTeamPrisma(): TeamPrismaClient & {
  __teams: Map<string, TeamRow>;
  __memberships: Map<string, TeamMembershipRow>;
} {
  const teams = new Map<string, TeamRow>();
  const memberships = new Map<string, TeamMembershipRow>();
  let tc = 0;
  let mc = 0;
  const now = () => new Date();

  return {
    __teams: teams,
    __memberships: memberships,
    team: {
      async create({ data }) {
        for (const t of teams.values()) {
          if (t.slug === data.slug) throw new FakeUniqueViolation("Team_slug_key");
        }
        const row: TeamRow = {
          id: `team_${++tc}`,
          name: data.name,
          slug: data.slug,
          createdAt: now(),
        };
        teams.set(row.id, row);
        return { ...row };
      },
      async findMany(args) {
        let rows = Array.from(teams.values());
        if (args?.orderBy && args.orderBy.length > 0) {
          rows.sort((a, b) => compareByOrderBy(a, b, args.orderBy!));
        } else {
          rows.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        }
        if (args?.cursor?.id) {
          const idx = rows.findIndex((r) => r.id === args.cursor!.id);
          rows = idx === -1 ? [] : rows.slice(idx + (args.skip ?? 0));
        }
        if (typeof args?.take === "number") rows = rows.slice(0, args.take);
        return rows.map((r) => ({ ...r }));
      },
      async findUnique({ where }) {
        for (const t of teams.values()) {
          if (t.slug === where.slug) return { ...t };
        }
        return null;
      },
    },
    teamMembership: {
      async create({ data }) {
        for (const m of memberships.values()) {
          if (m.userId === data.userId && m.teamId === data.teamId) {
            throw new FakeUniqueViolation("TeamMembership_userId_teamId_key");
          }
        }
        const row: TeamMembershipRow = {
          id: `tm_${++mc}`,
          userId: data.userId,
          teamId: data.teamId,
          // Mirrors the Postgres/Prisma schema default (`Role.MEMBER`).
          role: data.role ?? "MEMBER",
          createdAt: now(),
        };
        memberships.set(row.id, row);
        return { ...row };
      },
      async findUnique({ where }) {
        const { userId, teamId } = where.userId_teamId;
        for (const m of memberships.values()) {
          if (m.userId === userId && m.teamId === teamId) return { ...m };
        }
        return null;
      },
      async findMany({ where }) {
        return Array.from(memberships.values())
          .filter((m) => {
            if (where.userId !== undefined && m.userId !== where.userId) return false;
            if (where.teamId !== undefined && m.teamId !== where.teamId) return false;
            return true;
          })
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
          .map((m) => ({ ...m }));
      },
      async update({ where, data }) {
        const { userId, teamId } = where.userId_teamId;
        for (const [id, m] of memberships) {
          if (m.userId === userId && m.teamId === teamId) {
            const updated: TeamMembershipRow = { ...m, role: data.role };
            memberships.set(id, updated);
            return { ...updated };
          }
        }
        throw new Error(`Record to update not found. ${userId}/${teamId}`);
      },
      async deleteMany({ where }) {
        let count = 0;
        for (const [id, m] of memberships) {
          if (m.userId === where.userId && m.teamId === where.teamId) {
            memberships.delete(id);
            count++;
          }
        }
        return { count };
      },
    },
  };
}
