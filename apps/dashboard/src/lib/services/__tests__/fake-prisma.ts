/**
 * Minimal in-memory fake for the prisma.prospect delegate.
 *
 * Why a hand-rolled fake instead of the real PrismaClient?
 *   The Postgres ProspectService depends on a small slice of the delegate:
 *   create, findUnique, findMany (with optional `where.ownerId`), update,
 *   delete, upsert. Mocking that surface is a few dozen lines and avoids
 *   pulling Prisma + Postgres into a unit test. Real-database integration
 *   tests belong in a separate suite (out of scope for this PR).
 *
 * The shape here exactly matches the `ProspectPrismaClient` interface the
 * service expects, so structural typing keeps the fake honest.
 *
 * Phase 2-brand-cutover (2026-05-06): expanded to cover the wider Prospect
 * row (full visual theme + demo-config id mirrors).
 */

import type { Prospect, ProspectBorderRadius, ProspectLogoKind } from "../types";

interface ProspectWritable {
  ownerId: string;
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
  demoEarnId: string | null;
  demoCheckoutsId: string | null;
  demoWalletId: string | null;
  demoRemittanceId: string | null;
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

interface FindManyArgs {
  where?: { ownerId?: string };
  orderBy?: { createdAt?: "asc" | "desc" };
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

export interface FakePrismaClient {
  prospect: FakePrismaProspectDelegate;
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
    demoEarnId: data.demoEarnId ?? null,
    demoCheckoutsId: data.demoCheckoutsId ?? null,
    demoWalletId: data.demoWalletId ?? null,
    demoRemittanceId: data.demoRemittanceId ?? null,
    domain: data.domain ?? null,
    notes: data.notes ?? null,
  };
}

export function createFakePrisma(): FakePrismaClient {
  const store = new Map<string, Prospect>();
  let counter = 0;
  const nextId = () => `cuid_${++counter}`;
  const now = () => new Date();

  return {
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
        let rows = Array.from(store.values());
        if (args?.where?.ownerId) {
          const ownerId = args.where.ownerId;
          rows = rows.filter((b) => b.ownerId === ownerId);
        }
        rows.sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
        );
        if (args?.orderBy?.createdAt === "desc") rows.reverse();
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
