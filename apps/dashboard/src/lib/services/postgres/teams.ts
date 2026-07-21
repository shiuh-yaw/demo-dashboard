/**
 * Postgres-backed TeamService (Prisma + Supabase via @dynamic-demos/db).
 * Team + TeamMembership; per-team role (global OWNER/ADMIN bypass it).
 * Postgres-only, no cutover flag (no legacy Redis equivalent).
 *
 * D-013: relies on the `prisma` singleton; never opens its own connection.
 * D-015: only apps/dashboard imports @dynamic-demos/db.
 */

import { prisma as defaultPrisma } from "@dynamic-demos/db";
import {
  TeamMembershipNotFoundError,
  type CreateTeamInput,
  type UserRole,
  type Team,
  type TeamMembership,
  type TeamService,
} from "../types";
import type { TeamMembershipRow, TeamRow } from "./row-types";

/**
 * Minimal subset of the Prisma client used by PostgresTeamService. Lets
 * unit tests inject an in-memory fake; the real `PrismaClient` structurally
 * satisfies it.
 */
export interface TeamPrismaClient {
  team: {
    create(args: { data: { name: string; slug: string } }): Promise<TeamRow>;
    findMany(args?: {
      orderBy?: { createdAt?: "asc" | "desc" };
    }): Promise<TeamRow[]>;
    findUnique(args: { where: { slug: string } }): Promise<TeamRow | null>;
  };
  teamMembership: {
    create(args: {
      data: { userId: string; teamId: string; role?: string };
    }): Promise<TeamMembershipRow>;
    findUnique(args: {
      where: { userId_teamId: { userId: string; teamId: string } };
    }): Promise<TeamMembershipRow | null>;
    findMany(args: {
      where: { userId: string };
      orderBy?: { createdAt?: "asc" | "desc" };
    }): Promise<TeamMembershipRow[]>;
    update(args: {
      where: { userId_teamId: { userId: string; teamId: string } };
      data: { role: string };
    }): Promise<TeamMembershipRow>;
    deleteMany(args: {
      where: { userId: string; teamId: string };
    }): Promise<{ count: number }>;
  };
}

function isUniqueConstraintError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  return (err as { code?: unknown }).code === "P2002";
}

function toTeam(row: TeamRow): Team {
  return { id: row.id, name: row.name, slug: row.slug, createdAt: row.createdAt };
}

function toMembership(row: TeamMembershipRow): TeamMembership {
  return {
    id: row.id,
    userId: row.userId,
    teamId: row.teamId,
    role: row.role as UserRole,
    createdAt: row.createdAt,
  };
}

export class PostgresTeamService implements TeamService {
  private readonly client: TeamPrismaClient;

  constructor(client?: TeamPrismaClient) {
    this.client = client ?? (defaultPrisma as unknown as TeamPrismaClient);
  }

  async create(input: CreateTeamInput): Promise<Team> {
    const row = await this.client.team.create({
      data: { name: input.name, slug: input.slug },
    });
    return toTeam(row);
  }

  async list(): Promise<Team[]> {
    const rows = await this.client.team.findMany({
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toTeam);
  }

  async addMember(
    userId: string,
    teamId: string,
    role: UserRole = "MEMBER",
  ): Promise<TeamMembership> {
    try {
      const row = await this.client.teamMembership.create({
        data: { userId, teamId, role },
      });
      return toMembership(row);
    } catch (err) {
      if (!isUniqueConstraintError(err)) throw err;
      // Membership already exists (P2002 on the unique pair) - read it back
      // unchanged; role is not re-applied on an idempotent re-add.
      const existing = await this.client.teamMembership.findUnique({
        where: { userId_teamId: { userId, teamId } },
      });
      if (!existing) throw err;
      return toMembership(existing);
    }
  }

  async removeMember(userId: string, teamId: string): Promise<void> {
    await this.client.teamMembership.deleteMany({ where: { userId, teamId } });
  }

  async setMembershipRole(
    userId: string,
    teamId: string,
    role: UserRole,
  ): Promise<TeamMembership> {
    const existing = await this.client.teamMembership.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });
    if (!existing) throw new TeamMembershipNotFoundError(userId, teamId);
    const updated = await this.client.teamMembership.update({
      where: { userId_teamId: { userId, teamId } },
      data: { role },
    });
    return toMembership(updated);
  }

  async membershipsForUser(userId: string): Promise<TeamMembership[]> {
    const rows = await this.client.teamMembership.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toMembership);
  }
}
