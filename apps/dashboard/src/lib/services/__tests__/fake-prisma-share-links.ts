/**
 * Minimal in-memory fake for the `prisma.shareLink` / `prisma.demoConfig` /
 * `prisma.prospect` slices used by `PostgresShareLinkService`. Hand-rolled
 * rather than the real PrismaClient - the service only needs existence
 * checks on demoConfig/prospect (for `mint`) plus the `shareLink` CRUD +
 * `user` include (for `resolveByToken`). Real-database coverage lives in
 * the CI migration dry-run job.
 */

import type { ShareLinkPrismaClient } from "../postgres/share-links";
import type { ProspectRow, UserRow } from "../postgres/row-types";

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

function makeProspectRow(id: string): ProspectRow {
  const ts = new Date();
  return {
    id,
    ownerId: "owner-1",
    teamId: "team_gtm_default",
    createdById: null,
    status: "ACTIVE",
    name: `Prospect ${id}`,
    description: null,
    companyUrl: null,
    logo: "dynamic",
    logoUrl: null,
    borderRadius: null,
    primaryColor: "#000000",
    primaryHoverColor: null,
    secondaryColor: null,
    accentColor: null,
    pageBackground: null,
    background: null,
    foreground: null,
    mutedTextColor: null,
    borderColor: null,
    rowBackground: null,
    rowHoverBackground: null,
    gradientFrom: null,
    gradientTo: null,
    demoEarnId: null,
    demoCheckoutsId: null,
    demoWalletId: null,
    demoRemittanceId: null,
    domain: null,
    notes: null,
    createdAt: ts,
    updatedAt: ts,
  };
}

function makeUserRow(id: string): UserRow {
  const ts = new Date();
  return {
    id,
    email: `${id}@example.com`,
    dynamicUserId: null,
    displayName: null,
    avatarUrl: null,
    schedulingUrl: null,
    role: "MEMBER",
    deactivatedAt: null,
    createdAt: ts,
    updatedAt: ts,
  };
}

export interface FakeShareLinkPrismaOptions {
  /** Ids that should resolve as existing DemoConfig rows. */
  demoConfigIds?: string[];
  /** Ids that should resolve as existing Prospect rows. */
  prospectIds?: string[];
  /** Ids that should resolve as existing User rows (for the `user` include). */
  userIds?: string[];
}

export function createFakeShareLinkPrisma(
  options: FakeShareLinkPrismaOptions = {},
): ShareLinkPrismaClient & { __shareLinks: Map<string, ShareLinkRow> } {
  const shareLinks = new Map<string, ShareLinkRow>();
  const demoConfigs = new Set(options.demoConfigIds ?? []);
  const prospects = new Map<string, ProspectRow>(
    (options.prospectIds ?? []).map((id) => [id, makeProspectRow(id)]),
  );
  const users = new Map<string, UserRow>(
    (options.userIds ?? []).map((id) => [id, makeUserRow(id)]),
  );
  let counter = 0;
  const nextId = () => `sl_${++counter}`;
  const now = () => new Date();

  return {
    __shareLinks: shareLinks,
    shareLink: {
      async create({ data }) {
        const id = nextId();
        const row: ShareLinkRow = {
          id,
          token: data.token,
          demoConfigId: data.demoConfigId,
          prospectId: data.prospectId,
          userId: data.userId,
          status: data.status,
          expiresAt: null,
          createdAt: now(),
        };
        shareLinks.set(id, row);
        return { ...row };
      },
      async findUnique({ where, include }) {
        let row: ShareLinkRow | undefined;
        if (where.id) {
          row = shareLinks.get(where.id);
        } else if (where.token) {
          row = Array.from(shareLinks.values()).find(
            (r) => r.token === where.token,
          );
        }
        if (!row) return null;
        if (include?.user) {
          const user = users.get(row.userId);
          return { ...row, user: user ? { ...user } : undefined };
        }
        return { ...row };
      },
      async update({ where, data }) {
        const existing = shareLinks.get(where.id);
        if (!existing) {
          throw new Error(`Record to update not found. id=${where.id}`);
        }
        const updated: ShareLinkRow = { ...existing, status: data.status };
        shareLinks.set(where.id, updated);
        return { ...updated };
      },
    },
    demoConfig: {
      async findUnique({ where }) {
        return demoConfigs.has(where.id) ? { id: where.id } : null;
      },
    },
    prospect: {
      async findUnique({ where }) {
        const row = prospects.get(where.id);
        return row ? { ...row } : null;
      },
    },
  };
}
