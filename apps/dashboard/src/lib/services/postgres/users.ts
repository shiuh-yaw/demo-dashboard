/**
 * Postgres-backed GtmUserService (Prisma + Supabase via @dynamic-demos/db).
 * The single internal-person entity, created lazily on first verified
 * sign-in. Postgres-only by design: there is no legacy Redis equivalent
 * for this table, so (unlike `ProspectService`) there is no cutover flag.
 *
 * Exports `GtmUser`/`GtmUserService`, not `User`/`UserService` - those TS
 * names are already taken by the legacy `RedisUserService`
 * (`redis/users.ts`), which tracks per-checkout wallet users (address,
 * chainIds, tx stats) - a completely different domain from this GTM
 * SE/operator identity record.
 *
 * D-013: this module never opens its own connection - it relies on the
 * `prisma` singleton from @dynamic-demos/db. D-015: only apps/dashboard
 * imports @dynamic-demos/db.
 */

import { z } from "zod";

import { prisma as defaultPrisma } from "@dynamic-demos/db";
import {
  DynamicUserIdConflictError,
  InvalidSchedulingUrlError,
  type ClaimLegacyRecordsResult,
  type GtmUser,
  type GtmUserRole,
  type GtmUserService,
  type UpdateGtmUserInput,
} from "../types";
import type { UserRow } from "./row-types";

/**
 * https-only scheduling URL. Rejects `javascript:`, `http://`, and every
 * other non-https scheme - `z.string().url()` alone would accept them.
 */
const schedulingUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "schedulingUrl must be an https:// URL");

/**
 * Minimal subset of the Prisma client used by PostgresGtmUserService. Lets
 * unit tests inject an in-memory fake. The real `PrismaClient` from
 * @dynamic-demos/db structurally satisfies this interface.
 */
export interface UserPrismaClient {
  user: {
    findUnique(
      args: { where: { id: string } } | { where: { email: string } },
    ): Promise<UserRow | null>;
    findMany(args: {
      where: { dynamicUserId: { in: string[] } };
    }): Promise<UserRow[]>;
    create(args: {
      data: {
        email: string;
        /// Omitted on create so the Postgres/Prisma schema default
        /// (`MEMBER`) applies - role seeding (OWNER/ADMIN allowlists)
        /// happens elsewhere.
        role?: string;
        displayName?: string | null;
        avatarUrl?: string | null;
        schedulingUrl?: string | null;
      };
    }): Promise<UserRow>;
    update(args: {
      where: { id: string };
      data: Partial<{
        displayName: string | null;
        avatarUrl: string | null;
        schedulingUrl: string | null;
        role: string;
        dynamicUserId: string | null;
      }>;
    }): Promise<UserRow>;
  };
  /**
   * `updateMany` on the two legacy-owned tables. `claimLegacyRecords`
   * issues one call per table; the count feeds the returned tallies.
   */
  prospect: {
    updateMany(args: {
      where: { ownerId: string; createdById: null };
      data: { createdById: string };
    }): Promise<{ count: number }>;
  };
  demoConfig: {
    updateMany(args: {
      where: { ownerId: string; createdById: null };
      data: { createdById: string };
    }): Promise<{ count: number }>;
  };
}

/**
 * Detect Prisma's "unique constraint failed" error without dragging the
 * full `PrismaClientKnownRequestError` runtime into the service file.
 * Code `P2002` is documented in the Prisma error reference - checking by
 * `code` is robust to message-copy changes across Prisma versions.
 */
function isUniqueConstraintError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const code = (err as { code?: unknown }).code;
  return code === "P2002";
}

function toGtmUser(row: UserRow): GtmUser {
  return {
    id: row.id,
    email: row.email,
    dynamicUserId: row.dynamicUserId,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    schedulingUrl: row.schedulingUrl,
    role: row.role as GtmUserRole,
    deactivatedAt: row.deactivatedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PostgresGtmUserService implements GtmUserService {
  private readonly client: UserPrismaClient;

  constructor(client?: UserPrismaClient) {
    this.client = client ?? (defaultPrisma as unknown as UserPrismaClient);
  }

  async getOrCreateByEmail(email: string): Promise<GtmUser> {
    const normalized = email.trim().toLowerCase();
    try {
      // `role` is intentionally omitted - the schema default (`MEMBER`)
      // applies. Role seeding (OWNER/ADMIN allowlists) happens elsewhere.
      const created = await this.client.user.create({
        data: { email: normalized },
      });
      return toGtmUser(created);
    } catch (err) {
      if (!isUniqueConstraintError(err)) throw err;
      // Lost the create race to a concurrent getOrCreateByEmail for the
      // same email (unique `email` collision, P2002) - the winner's row
      // now exists; read and return it instead of throwing.
      const existing = await this.client.user.findUnique({
        where: { email: normalized },
      });
      if (!existing) {
        // Pathological: the winning row should be visible by now.
        // Re-throw the original error rather than fabricate a user.
        throw err;
      }
      return toGtmUser(existing);
    }
  }

  async get(id: string): Promise<GtmUser | null> {
    const row = await this.client.user.findUnique({ where: { id } });
    return row ? toGtmUser(row) : null;
  }

  async update(id: string, input: UpdateGtmUserInput): Promise<GtmUser> {
    if (input.schedulingUrl !== undefined && input.schedulingUrl !== null) {
      const result = schedulingUrlSchema.safeParse(input.schedulingUrl);
      if (!result.success) {
        throw new InvalidSchedulingUrlError(
          result.error.issues[0]?.message ?? "invalid schedulingUrl",
        );
      }
    }

    if (input.dynamicUserId !== undefined && input.dynamicUserId !== null) {
      // Write-once: once a non-null dynamicUserId is stored, refuse to
      // overwrite it with a different value. Same-value writes are
      // allowed (idempotent).
      const existing = await this.client.user.findUnique({ where: { id } });
      if (
        existing?.dynamicUserId != null &&
        existing.dynamicUserId !== input.dynamicUserId
      ) {
        throw new DynamicUserIdConflictError(
          id,
          existing.dynamicUserId,
          input.dynamicUserId,
        );
      }
    }

    const data: Partial<{
      displayName: string | null;
      avatarUrl: string | null;
      schedulingUrl: string | null;
      dynamicUserId: string | null;
    }> = {};
    if (input.displayName !== undefined) data.displayName = input.displayName;
    if (input.schedulingUrl !== undefined)
      data.schedulingUrl = input.schedulingUrl;
    if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl;
    if (input.dynamicUserId !== undefined)
      data.dynamicUserId = input.dynamicUserId;

    const updated = await this.client.user.update({ where: { id }, data });
    return toGtmUser(updated);
  }

  async setRole(id: string, role: GtmUserRole): Promise<GtmUser> {
    const updated = await this.client.user.update({
      where: { id },
      data: { role },
    });
    return toGtmUser(updated);
  }

  async resolveByDynamicIds(subs: string[]): Promise<Map<string, GtmUser>> {
    if (subs.length === 0) return new Map();
    const rows = await this.client.user.findMany({
      where: { dynamicUserId: { in: subs } },
    });
    const resolved = new Map<string, GtmUser>();
    for (const row of rows) {
      if (row.dynamicUserId) resolved.set(row.dynamicUserId, toGtmUser(row));
    }
    return resolved;
  }

  async claimLegacyRecords(
    user: Pick<GtmUser, "id" | "dynamicUserId">,
  ): Promise<ClaimLegacyRecordsResult> {
    // No sub means nothing joins the legacy `ownerId` values yet.
    if (!user.dynamicUserId) return { prospects: 0, demoConfigs: 0 };
    const where = { ownerId: user.dynamicUserId, createdById: null } as const;
    const data = { createdById: user.id };
    const [prospects, demoConfigs] = await Promise.all([
      this.client.prospect.updateMany({ where, data }),
      this.client.demoConfig.updateMany({ where, data }),
    ]);
    return { prospects: prospects.count, demoConfigs: demoConfigs.count };
  }
}
