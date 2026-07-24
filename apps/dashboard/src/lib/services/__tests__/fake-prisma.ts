/**
 * Minimal in-memory fake for the prisma.prospect delegate.
 *
 * Why a hand-rolled fake instead of the real PrismaClient?
 *   The Postgres ProspectService depends on a small slice of the delegate:
 *   create, findUnique, findMany (where incl. nested OR/AND/`{in}`, orderBy,
 *   take, skip, cursor), update, delete, upsert. Mocking that surface is a
 *   few dozen lines and avoids pulling Prisma + Postgres into a unit test.
 *   Real-database integration tests belong in a separate suite (out of
 *   scope for this PR).
 *
 * The shape here exactly matches the `ProspectPrismaClient` interface the
 * service expects, so structural typing keeps the fake honest.
 *
 * Phase 2-brand-cutover (2026-05-06): expanded to cover the wider Prospect
 * row (full visual theme + demo-config id mirrors).
 */

import {
  type Prospect,
  type ProspectBorderRadius,
  type ProspectLogoKind,
  type ProspectStatus,
} from "../types";

interface ProspectWritable {
  ownerId: string;
  teamId: string | null;
  createdById: string | null;
  status: ProspectStatus;
  name: string;
  description: string | null;
  companyUrl: string | null;
  logo: ProspectLogoKind;
  logoUrl: string | null;
  borderRadius: ProspectBorderRadius | null;
  primaryColor: string;
  primaryHoverColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  pageBackground: string | null;
  background: string | null;
  foreground: string | null;
  mutedTextColor: string | null;
  borderColor: string | null;
  rowBackground: string | null;
  rowHoverBackground: string | null;
  gradientFrom: string | null;
  gradientTo: string | null;
  domain: string | null;
  notes: string | null;
}

interface CreateArgs {
  data: Partial<ProspectWritable> & {
    ownerId: string;
    name: string;
    primaryColor: string;
  };
}

interface FindUniqueArgs {
  where: { id: string };
}

/** Loose where-fragment shape: enough of Prisma's operators for these tests
 * (OR/AND, plain equality incl. null/"", `{ in: [...] }`) - not a full emulation. */
type FakeWhere = Record<string, unknown>;

interface FindManyArgs {
  where?: FakeWhere;
  orderBy?: Array<Record<string, "asc" | "desc">>;
  take?: number;
  skip?: number;
  cursor?: { id: string };
}

/** Recursively matches a row against a where-fragment: OR/AND, equality, `{in}`. */
function matchesWhere(row: Prospect, where?: FakeWhere): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, value]) => {
    if (key === "OR") {
      return (value as FakeWhere[]).some((clause) => matchesWhere(row, clause));
    }
    if (key === "AND") {
      return (value as FakeWhere[]).every((clause) => matchesWhere(row, clause));
    }
    const rowValue = (row as unknown as Record<string, unknown>)[key];
    if (value !== null && typeof value === "object" && "in" in (value as object)) {
      return (value as { in: unknown[] }).in.includes(rowValue);
    }
    return rowValue === value;
  });
}

/** Multi-key comparator matching Prisma's `orderBy: [{a:"desc"},{b:"desc"}]` shape. */
function compareByOrderBy(
  a: Prospect,
  b: Prospect,
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

interface UpdateArgs {
  where: { id: string };
  data: Partial<ProspectWritable>;
}

interface DeleteArgs {
  where: { id: string };
}

interface UpsertArgs {
  where: { id: string };
  create: Partial<ProspectWritable> & {
    id: string;
    ownerId: string;
    name: string;
    primaryColor: string;
  };
  update: Partial<ProspectWritable>;
}

export interface FakePrismaProspectDelegate {
  create(args: CreateArgs): Promise<Prospect>;
  findUnique(args: FindUniqueArgs): Promise<Prospect | null>;
  findMany(args?: FindManyArgs): Promise<Prospect[]>;
  update(args: UpdateArgs): Promise<Prospect>;
  delete(args: DeleteArgs): Promise<Prospect>;
  upsert(args: UpsertArgs): Promise<Prospect>;
}

/** The theme-column subset mirrored onto the 1:1 `ProspectTheme` row. */
type ProspectThemeFields = Pick<
  ProspectWritable,
  | "borderRadius"
  | "primaryColor"
  | "primaryHoverColor"
  | "secondaryColor"
  | "accentColor"
  | "pageBackground"
  | "background"
  | "foreground"
  | "mutedTextColor"
  | "borderColor"
  | "rowBackground"
  | "rowHoverBackground"
  | "gradientFrom"
  | "gradientTo"
>;

type ProspectThemeRow = { prospectId: string } & ProspectThemeFields;

export interface FakePrismaProspectThemeDelegate {
  findUnique(args: {
    where: { prospectId: string };
  }): Promise<ProspectThemeRow | null>;
  findMany(args: {
    where: { prospectId: { in: string[] } };
  }): Promise<ProspectThemeRow[]>;
  upsert(args: {
    where: { prospectId: string };
    create: { prospectId: string } & ProspectThemeFields;
    update: ProspectThemeFields;
  }): Promise<ProspectThemeRow>;
}

export interface FakePrismaClient {
  prospect: FakePrismaProspectDelegate;
  prospectTheme: FakePrismaProspectThemeDelegate;
}

/**
 * Build a Prospect row's nullable fields, defaulting any field the caller
 * omitted to the same null/discriminator the real Postgres column does.
 * Keeps the fake equivalent to the database when callers under-specify
 * input.
 */
function applyNullDefaults(
  data: Partial<ProspectWritable>,
): Omit<ProspectWritable, "ownerId" | "name" | "primaryColor"> {
  return {
    teamId: data.teamId ?? null,
    createdById: data.createdById ?? null,
    status: data.status ?? "ACTIVE",
    description: data.description ?? null,
    companyUrl: data.companyUrl ?? null,
    logo: data.logo ?? "dynamic",
    logoUrl: data.logoUrl ?? null,
    borderRadius: data.borderRadius ?? null,
    primaryHoverColor: data.primaryHoverColor ?? null,
    secondaryColor: data.secondaryColor ?? null,
    accentColor: data.accentColor ?? null,
    pageBackground: data.pageBackground ?? null,
    background: data.background ?? null,
    foreground: data.foreground ?? null,
    mutedTextColor: data.mutedTextColor ?? null,
    borderColor: data.borderColor ?? null,
    rowBackground: data.rowBackground ?? null,
    rowHoverBackground: data.rowHoverBackground ?? null,
    gradientFrom: data.gradientFrom ?? null,
    gradientTo: data.gradientTo ?? null,
    domain: data.domain ?? null,
    notes: data.notes ?? null,
  };
}

export function createFakePrisma(): FakePrismaClient {
  const store = new Map<string, Prospect>();
  const themeStore = new Map<string, ProspectThemeRow>();
  let counter = 0;
  const nextId = () => `cuid_${++counter}`;
  const now = () => new Date();

  return {
    prospectTheme: {
      async findUnique({ where }) {
        const row = themeStore.get(where.prospectId);
        return row ? { ...row } : null;
      },
      async findMany({ where }) {
        const ids = new Set(where.prospectId.in);
        return Array.from(themeStore.values())
          .filter((row) => ids.has(row.prospectId))
          .map((row) => ({ ...row }));
      },
      async upsert({ where, create, update }) {
        const existing = themeStore.get(where.prospectId);
        const row: ProspectThemeRow = existing
          ? { ...existing, ...update }
          : { ...create };
        themeStore.set(where.prospectId, row);
        return { ...row };
      },
    },
    prospect: {
      async create({ data }) {
        const id = nextId();
        const ts = now();
        const row: Prospect = {
          id,
          ownerId: data.ownerId,
          name: data.name,
          primaryColor: data.primaryColor,
          ...applyNullDefaults(data),
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
          matchesWhere(row, args?.where),
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
        const updated: Prospect = {
          ...existing,
          ...Object.fromEntries(
            Object.entries(data).filter(([, v]) => v !== undefined),
          ),
          updatedAt: now(),
        } as Prospect;
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
          const row: Prospect = {
            id: where.id,
            ownerId: create.ownerId,
            name: create.name,
            primaryColor: create.primaryColor,
            ...applyNullDefaults(create),
            createdAt: ts,
            updatedAt: ts,
          };
          store.set(where.id, row);
          return { ...row };
        }
        const updated: Prospect = {
          ...existing,
          ...Object.fromEntries(
            Object.entries(update).filter(([, v]) => v !== undefined),
          ),
          updatedAt: now(),
        } as Prospect;
        store.set(where.id, updated);
        return { ...updated };
      },
    },
  };
}
