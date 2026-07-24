/**
 * Postgres-backed ShareLinkService (Prisma + Supabase via @dynamic-demos/db).
 * Per-prospect, per-demo share link. Postgres-only, no cutover flag (no
 * legacy Redis equivalent). `ShareLink` has no Prisma-level FK to
 * `Prospect`/`DemoConfig` (mirrors the `Transaction.prospectId` /
 * `WebhookEvent.prospectId` decoupled-lifetime pattern); `mint` verifies
 * both exist at the service layer instead of relying on a DB constraint.
 *
 * D-013: this module never opens its own connection - it relies on the
 * `prisma` singleton from @dynamic-demos/db. D-015: only apps/dashboard
 * imports @dynamic-demos/db.
 */

import { nanoid } from "nanoid";

import { prisma as defaultPrisma } from "@dynamic-demos/db";
import {
  DemoConfigNotFoundError,
  ShareLinkProspectNotFoundError,
  type GtmUser,
  type UserRole,
  type MintShareLinkInput,
  type Prospect,
  type ShareLink,
  type ShareLinkService,
  type ShareLinkStatus,
  type ShareLinkWithContext,
} from "../types";
import type { ProspectRow, UserRow } from "./row-types";

interface ShareLinkRow {
  id: string;
  token: string;
  demoConfigId: string;
  prospectId: string;
  userId: string;
  status: string;
  expiresAt: Date | null;
  createdAt: Date;
}

/**
 * Minimal subset of the Prisma client used by PostgresShareLinkService.
 * Lets unit tests inject an in-memory fake. The real `PrismaClient` from
 * @dynamic-demos/db structurally satisfies this interface.
 */
export interface ShareLinkPrismaClient {
  shareLink: {
    create(args: {
      data: {
        token: string;
        demoConfigId: string;
        prospectId: string;
        userId: string;
        status: string;
      };
    }): Promise<ShareLinkRow>;
    findUnique(args: {
      where: { id?: string; token?: string };
      include?: { user?: boolean };
    }): Promise<(ShareLinkRow & { user?: UserRow }) | null>;
    findFirst(args: {
      where: {
        userId: string;
        demoConfigId: string;
        prospectId: string;
        status: string;
      };
    }): Promise<ShareLinkRow | null>;
    update(args: {
      where: { id: string };
      data: { status: string };
    }): Promise<ShareLinkRow>;
    count(args: { where: { userId: string } }): Promise<number>;
  };
  demoConfig: {
    findUnique(args: { where: { id: string } }): Promise<{ id: string } | null>;
  };
  /**
   * Just enough of `prisma.prospect` to confirm existence at mint time and
   * to hydrate `resolveByToken`'s context - this service does not manage
   * prospects.
   */
  prospect: {
    findUnique(args: { where: { id: string } }): Promise<ProspectRow | null>;
  };
}

function toShareLink(row: ShareLinkRow): ShareLink {
  return {
    id: row.id,
    token: row.token,
    demoConfigId: row.demoConfigId,
    prospectId: row.prospectId,
    userId: row.userId,
    status: row.status as ShareLinkStatus,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  };
}

function toGtmUser(row: UserRow): GtmUser {
  return {
    id: row.id,
    email: row.email,
    dynamicUserId: row.dynamicUserId,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    schedulingUrl: row.schedulingUrl,
    role: row.role as UserRole,
    deactivatedAt: row.deactivatedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toProspect(row: ProspectRow): Prospect {
  return {
    id: row.id,
    ownerId: row.ownerId,
    teamId: row.teamId,
    createdById: row.createdById,
    status: row.status as Prospect["status"],
    name: row.name,
    description: row.description,
    companyUrl: row.companyUrl,
    logo: row.logo as Prospect["logo"],
    logoUrl: row.logoUrl,
    borderRadius: row.borderRadius as Prospect["borderRadius"],
    primaryColor: row.primaryColor,
    primaryHoverColor: row.primaryHoverColor,
    secondaryColor: row.secondaryColor,
    accentColor: row.accentColor,
    pageBackground: row.pageBackground,
    background: row.background,
    foreground: row.foreground,
    mutedTextColor: row.mutedTextColor,
    borderColor: row.borderColor,
    rowBackground: row.rowBackground,
    rowHoverBackground: row.rowHoverBackground,
    gradientFrom: row.gradientFrom,
    gradientTo: row.gradientTo,
    domain: row.domain,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PostgresShareLinkService implements ShareLinkService {
  private readonly client: ShareLinkPrismaClient;

  constructor(client?: ShareLinkPrismaClient) {
    this.client =
      client ?? (defaultPrisma as unknown as ShareLinkPrismaClient);
  }

  async mint(input: MintShareLinkInput): Promise<ShareLink> {
    const demoConfig = await this.client.demoConfig.findUnique({
      where: { id: input.demoConfigId },
    });
    if (!demoConfig) throw new DemoConfigNotFoundError(input.demoConfigId);

    const prospect = await this.client.prospect.findUnique({
      where: { id: input.prospectId },
    });
    if (!prospect) throw new ShareLinkProspectNotFoundError(input.prospectId);

    // Reuse-or-create: one stable link per (user, demoConfig, prospect) while
    // active, so re-minting hands back the same URL instead of sprawling.
    const existing = await this.client.shareLink.findFirst({
      where: {
        userId: input.userId,
        demoConfigId: input.demoConfigId,
        prospectId: input.prospectId,
        status: "active",
      },
    });
    if (existing) return toShareLink(existing);

    const token = nanoid(21);
    const created = await this.client.shareLink.create({
      data: {
        token,
        demoConfigId: input.demoConfigId,
        prospectId: input.prospectId,
        userId: input.userId,
        status: "active",
      },
    });
    return toShareLink(created);
  }

  async resolveByToken(token: string): Promise<ShareLinkWithContext | null> {
    const row = await this.client.shareLink.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!row) return null;
    if (row.status !== "active") return null;
    if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) return null;
    if (!row.user) return null;

    const prospect = await this.client.prospect.findUnique({
      where: { id: row.prospectId },
    });
    if (!prospect) return null;

    return {
      ...toShareLink(row),
      user: toGtmUser(row.user),
      prospect: toProspect(prospect),
    };
  }

  async get(id: string): Promise<ShareLink | null> {
    const row = await this.client.shareLink.findUnique({ where: { id } });
    return row ? toShareLink(row) : null;
  }

  async findByToken(token: string): Promise<ShareLink | null> {
    const row = await this.client.shareLink.findUnique({ where: { token } });
    return row ? toShareLink(row) : null;
  }

  async revoke(id: string): Promise<ShareLink> {
    const updated = await this.client.shareLink.update({
      where: { id },
      data: { status: "revoked" },
    });
    return toShareLink(updated);
  }

  async countByUser(userId: string): Promise<number> {
    return this.client.shareLink.count({ where: { userId } });
  }
}
