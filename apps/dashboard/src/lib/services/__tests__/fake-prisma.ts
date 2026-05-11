/**
 * Minimal in-memory fake for the prisma.brand delegate.
 *
 * Why a hand-rolled fake instead of the real PrismaClient?
 *   The Postgres BrandService depends on a small slice of the delegate:
 *   create, findUnique, findMany (with optional `where.ownerId`), update,
 *   delete, upsert. Mocking that surface is a few dozen lines and avoids
 *   pulling Prisma + Postgres into a unit test. Real-database integration
 *   tests belong in a separate suite (out of scope for this PR).
 *
 * The shape here exactly matches the `BrandPrismaClient` interface the
 * service expects, so structural typing keeps the fake honest.
 *
 * Phase 2-brand-cutover (2026-05-06): expanded to cover the wider Brand
 * row (full visual theme + demo-config id mirrors).
 */

import type { Brand, BrandBorderRadius, BrandLogoKind } from "../types";

interface BrandWritable {
  ownerId: string;
  name: string;
  description: string | null;
  companyUrl: string | null;
  logo: BrandLogoKind;
  logoUrl: string | null;
  borderRadius: BrandBorderRadius | null;
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
}

interface CreateArgs {
  data: Partial<BrandWritable> & {
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
  data: Partial<BrandWritable>;
}

interface DeleteArgs {
  where: { id: string };
}

interface UpsertArgs {
  where: { id: string };
  create: Partial<BrandWritable> & {
    id: string;
    ownerId: string;
    name: string;
    primaryColor: string;
  };
  update: Partial<BrandWritable>;
}

export interface FakePrismaBrandDelegate {
  create(args: CreateArgs): Promise<Brand>;
  findUnique(args: FindUniqueArgs): Promise<Brand | null>;
  findMany(args?: FindManyArgs): Promise<Brand[]>;
  update(args: UpdateArgs): Promise<Brand>;
  delete(args: DeleteArgs): Promise<Brand>;
  upsert(args: UpsertArgs): Promise<Brand>;
}

export interface FakePrismaClient {
  brand: FakePrismaBrandDelegate;
}

/**
 * Build a Brand row's nullable fields, defaulting any field the caller
 * omitted to the same null/discriminator the real Postgres column does.
 * Keeps the fake equivalent to the database when callers under-specify
 * input.
 */
function applyNullDefaults(
  data: Partial<BrandWritable>,
): Omit<BrandWritable, "ownerId" | "name" | "primaryColor"> {
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
  };
}

export function createFakePrisma(): FakePrismaClient {
  const store = new Map<string, Brand>();
  let counter = 0;
  const nextId = () => `cuid_${++counter}`;
  const now = () => new Date();

  return {
    brand: {
      async create({ data }) {
        const id = nextId();
        const ts = now();
        const row: Brand = {
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
        const updated: Brand = {
          ...existing,
          ...Object.fromEntries(
            Object.entries(data).filter(([, v]) => v !== undefined),
          ),
          updatedAt: now(),
        } as Brand;
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
          const row: Brand = {
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
        const updated: Brand = {
          ...existing,
          ...Object.fromEntries(
            Object.entries(update).filter(([, v]) => v !== undefined),
          ),
          updatedAt: now(),
        } as Brand;
        store.set(where.id, updated);
        return { ...updated };
      },
    },
  };
}
