/**
 * Minimal in-memory fake for the `prisma.demoConfig` delegate used by
 * `PostgresDemoConfigService`. Carries every demo kind (earn, wallet,
 * trade, visa-direct, checkout, remittance) on the unified table.
 *
 * Hand-rolled rather than the real PrismaClient because the service
 * only depends on a small slice of the delegate (create, findUnique,
 * findMany with a where fragment incl. nested OR/AND/`{in}`/the `prospect`
 * relation, orderBy, take, skip, cursor, update, delete, upsert).
 * Real-database coverage lives in the CI migration dry-run job.
 *
 * The shape here matches `DemoConfigPrismaClient` exactly so structural
 * typing keeps the fake honest.
 *
 * The `prospect` relation filter (as emitted by `demoConfigActiveScopeWhere`) is
 * evaluated against a caller-supplied set of minimal Prospect projections -
 * a config whose `prospectId` isn't in that set never matches a `prospect`
 * clause, exactly like a real LEFT JOIN against an absent/unseeded row.
 */

import type { DemoConfigPrismaClient } from "../postgres/demo-configs";

interface DemoConfigRow {
  id: string;
  kind: string;
  ownerId: string;
  createdById: string | null;
  name: string | null;
  description: string | null;
  prospectId: string | null;
  isPrimary: boolean;
  themeOverrides: unknown | null;
  config: unknown;
  createdAt: Date;
  updatedAt: Date;
}

/** Minimal Prospect projection - enough of the row for `{ prospect: {...} }` where clauses. */
export interface FakeProspectProjection {
  id: string;
  teamId: string | null;
  ownerId: string;
  createdById: string | null;
}

/** Loose where-fragment shape: enough of Prisma's operators for these tests
 * (OR/AND, plain equality incl. null/"", `{ in: [...] }`, the `prospect`
 * relation) - not a full emulation. Mirrors `fake-prisma.ts`'s matcher. */
type FakeWhere = Record<string, unknown>;

/** Recursively matches a row against a where-fragment: OR/AND, equality,
 * `{in}`, and the `prospect` relation (resolved via `prospectsById`). */
function matchesWhere(
  row: Record<string, unknown>,
  where: FakeWhere | undefined,
  prospectsById: Map<string, FakeProspectProjection>,
): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, value]) => {
    if (key === "OR") {
      return (value as FakeWhere[]).some((clause) =>
        matchesWhere(row, clause, prospectsById),
      );
    }
    if (key === "AND") {
      return (value as FakeWhere[]).every((clause) =>
        matchesWhere(row, clause, prospectsById),
      );
    }
    if (key === "prospect") {
      const prospectId = row.prospectId as string | null;
      if (prospectId === null) return false;
      const prospect = prospectsById.get(prospectId);
      if (!prospect) return false;
      return matchesWhere(
        prospect as unknown as Record<string, unknown>,
        value as FakeWhere,
        prospectsById,
      );
    }
    const rowValue = row[key];
    if (value !== null && typeof value === "object" && "in" in (value as object)) {
      return (value as { in: unknown[] }).in.includes(rowValue);
    }
    return rowValue === value;
  });
}

/** Multi-key comparator matching Prisma's `orderBy: [{a:"desc"},{b:"desc"}]` shape. */
function compareByOrderBy(
  a: DemoConfigRow,
  b: DemoConfigRow,
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

/**
 * @param prospects Minimal Prospect projections for evaluating `{ prospect:
 *   {...} }` relation filters. Defaults to none - tests that don't exercise
 *   the `prospect` clause can omit it entirely.
 */
export function createFakeDemoConfigPrisma(
  prospects: FakeProspectProjection[] = [],
): DemoConfigPrismaClient {
  const store = new Map<string, DemoConfigRow>();
  const prospectsById = new Map(prospects.map((p) => [p.id, p]));
  let counter = 0;
  const nextId = () => `dc_${++counter}`;
  const now = () => new Date();

  return {
    demoConfig: {
      async create({ data }) {
        const id = nextId();
        const ts = now();
        const row: DemoConfigRow = {
          id,
          kind: data.kind,
          ownerId: data.ownerId,
          createdById: data.createdById ?? null,
          name: data.name ?? null,
          description: data.description ?? null,
          prospectId: data.prospectId,
          isPrimary: data.isPrimary ?? false,
          themeOverrides: data.themeOverrides ?? null,
          config: data.config,
          createdAt: ts,
          updatedAt: ts,
        };
        store.set(id, row);
        return { ...row };
      },
      async findUnique({ where }) {
        const row = store.get(where.id);
        return row ? { ...row } : null;
      },
      async findMany(args) {
        let rows = Array.from(store.values()).filter((row) =>
          matchesWhere(
            row as unknown as Record<string, unknown>,
            args?.where as FakeWhere | undefined,
            prospectsById,
          ),
        );
        if (args?.orderBy && args.orderBy.length > 0) {
          rows.sort((a, b) => compareByOrderBy(a, b, args.orderBy!));
        }
        if (args?.cursor?.id) {
          const idx = rows.findIndex((r) => r.id === args.cursor!.id);
          rows = idx === -1 ? [] : rows.slice(idx + (args.skip ?? 0));
        }
        if (typeof args?.take === "number") rows = rows.slice(0, args.take);
        return rows.map((r) => ({ ...r }));
      },
      async update({ where, data }) {
        const existing = store.get(where.id);
        if (!existing) {
          throw new Error(`Record to update not found. id=${where.id}`);
        }
        const updated: DemoConfigRow = {
          ...existing,
          ...Object.fromEntries(
            Object.entries(data).filter(([, v]) => v !== undefined),
          ),
          updatedAt: now(),
        } as DemoConfigRow;
        store.set(where.id, updated);
        return { ...updated };
      },
      async delete({ where }) {
        const existing = store.get(where.id);
        if (!existing) {
          throw new Error(`Record to delete not found. id=${where.id}`);
        }
        store.delete(where.id);
        return { ...existing };
      },
      async upsert({ where, create, update }) {
        const existing = store.get(where.id);
        if (!existing) {
          const ts = now();
          const row: DemoConfigRow = {
            id: where.id,
            kind: create.kind,
            ownerId: create.ownerId,
            createdById: create.createdById ?? null,
            name: create.name ?? null,
            description: create.description ?? null,
            prospectId: create.prospectId,
            isPrimary: create.isPrimary ?? false,
            themeOverrides: create.themeOverrides ?? null,
            config: create.config,
            createdAt: ts,
            updatedAt: ts,
          };
          store.set(where.id, row);
          return { ...row };
        }
        const updated: DemoConfigRow = {
          ...existing,
          ...Object.fromEntries(
            Object.entries(update).filter(([, v]) => v !== undefined),
          ),
          updatedAt: now(),
        } as DemoConfigRow;
        store.set(where.id, updated);
        return { ...updated };
      },
    },
  };
}
