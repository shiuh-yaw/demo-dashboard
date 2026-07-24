/**
 * Minimal in-memory fake for the `prisma.user` delegate used by
 * `PostgresGtmUserService`. Hand-rolled rather than the real PrismaClient
 * because the service only depends on a small slice of the delegate
 * (findUnique by id/email, findMany by dynamicUserId, create, update).
 * Real-database coverage lives in the CI migration dry-run job.
 */

import type { UserPrismaClient } from "../postgres/users";
import type { UserRow } from "../postgres/row-types";

/**
 * Mimic Prisma's "P2002" error so the service-layer's create-then-catch
 * race fallback (see `PostgresGtmUserService.getOrCreateByEmail`) is
 * exercised by tests without depending on the real
 * `PrismaClientKnownRequestError`.
 */
class FakePrismaUniqueViolation extends Error {
  public readonly code = "P2002";
  constructor(target: string) {
    super(`Unique constraint failed on ${target}`);
    this.name = "PrismaClientKnownRequestError";
  }
}

/** Multi-key comparator matching Prisma's `orderBy: [{a:"desc"},{b:"desc"}]` shape. */
function compareByOrderBy(
  a: UserRow,
  b: UserRow,
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

/** Minimal legacy-owned row the claimLegacyRecords updateMany fakes filter on. */
interface OwnedRow {
  id: string;
  ownerId: string;
  createdById: string | null;
}

export function createFakeUserPrisma(): UserPrismaClient & {
  __users: Map<string, UserRow>;
  __prospects: Map<string, OwnedRow>;
  __demoConfigs: Map<string, OwnedRow>;
} {
  const store = new Map<string, UserRow>();
  const prospects = new Map<string, OwnedRow>();
  const demoConfigs = new Map<string, OwnedRow>();
  let counter = 0;
  const nextId = () => `user_${++counter}`;
  const now = () => new Date();

  const claimIn = (
    rows: Map<string, OwnedRow>,
    where: { ownerId: string; createdById: null },
    data: { createdById: string },
  ) => {
    let count = 0;
    for (const row of rows.values()) {
      if (row.ownerId === where.ownerId && row.createdById === null) {
        row.createdById = data.createdById;
        count++;
      }
    }
    return { count };
  };

  return {
    __users: store,
    __prospects: prospects,
    __demoConfigs: demoConfigs,
    prospect: {
      async updateMany({ where, data }) {
        return claimIn(prospects, where, data);
      },
    },
    demoConfig: {
      async updateMany({ where, data }) {
        return claimIn(demoConfigs, where, data);
      },
    },
    user: {
      async findUnique(args) {
        if ("id" in args.where) {
          return store.get(args.where.id) ?? null;
        }
        const email = args.where.email;
        for (const row of store.values()) {
          if (row.email === email) return { ...row };
        }
        return null;
      },
      async findMany(args) {
        const subs = args?.where?.dynamicUserId?.in;
        let rows = Array.from(store.values()).filter((row) =>
          subs ? row.dynamicUserId && subs.includes(row.dynamicUserId) : true,
        );
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
        return rows.map((row) => ({ ...row }));
      },
      async create({ data }) {
        // Enforce the `User.email` unique constraint, mirroring
        // Postgres - the service always attempts `create` first (see
        // `getOrCreateByEmail`), relying on this to signal an existing
        // row via P2002 rather than a pre-flight `findUnique`.
        for (const row of store.values()) {
          if (row.email === data.email) {
            throw new FakePrismaUniqueViolation("User_email_key");
          }
        }
        const id = nextId();
        const ts = now();
        const row: UserRow = {
          id,
          email: data.email,
          dynamicUserId: null,
          // Mirrors the Postgres/Prisma schema default (`Role.MEMBER`)
          // when the caller omits `role`.
          role: data.role ?? "MEMBER",
          deactivatedAt: null,
          displayName: data.displayName ?? null,
          avatarUrl: data.avatarUrl ?? null,
          schedulingUrl: data.schedulingUrl ?? null,
          createdAt: ts,
          updatedAt: ts,
        };
        store.set(id, row);
        return { ...row };
      },
      async update({ where, data }) {
        const existing = store.get(where.id);
        if (!existing) {
          throw new Error(`Record to update not found. id=${where.id}`);
        }
        const updated: UserRow = {
          ...existing,
          ...Object.fromEntries(
            Object.entries(data).filter(([, v]) => v !== undefined),
          ),
          updatedAt: now(),
        } as UserRow;
        store.set(where.id, updated);
        return { ...updated };
      },
    },
  };
}
