/**
 * Minimal in-memory fake for the prisma.brand delegate.
 *
 * Why a hand-rolled fake instead of the real PrismaClient?
 *   The Postgres BrandService depends on a small slice of the delegate:
 *   create, findUnique, findMany (with optional `where.ownerId`), update,
 *   and delete. Mocking that surface is a few dozen lines and avoids
 *   pulling Prisma + Postgres into a unit test. Real-database integration
 *   tests belong in a separate suite (out of scope for this PR).
 *
 * The shape here exactly matches the `BrandPrismaClient` interface the
 * service expects, so structural typing keeps the fake honest.
 */

import type { Brand } from "../types";

interface CreateArgs {
  data: {
    ownerId: string;
    name: string;
    description?: string | null;
    primaryColor: string;
    secondaryColor?: string | null;
    accentColor?: string | null;
    logoUrl?: string | null;
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
  data: Partial<{
    name: string;
    description: string | null;
    primaryColor: string;
    secondaryColor: string | null;
    accentColor: string | null;
    logoUrl: string | null;
  }>;
}

interface DeleteArgs {
  where: { id: string };
}

interface UpsertArgs {
  where: { id: string };
  create: {
    id: string;
    ownerId: string;
    name: string;
    description?: string | null;
    primaryColor: string;
    secondaryColor?: string | null;
    accentColor?: string | null;
    logoUrl?: string | null;
  };
  update: Partial<{
    ownerId: string;
    name: string;
    description: string | null;
    primaryColor: string;
    secondaryColor: string | null;
    accentColor: string | null;
    logoUrl: string | null;
  }>;
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

export function createFakePrisma(): FakePrismaClient {
  const store = new Map<string, Brand>();
  let counter = 0;
  const nextId = () => `cuid_${++counter}`;
  // Each call returns a fresh Date; tests force monotonicity with a
  // small await between create and update.
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
          description: data.description ?? null,
          primaryColor: data.primaryColor,
          secondaryColor: data.secondaryColor ?? null,
          accentColor: data.accentColor ?? null,
          logoUrl: data.logoUrl ?? null,
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
          // Mirrors Prisma's RecordNotFoundError shape just enough for
          // service-layer error handling assertions in the parity suite.
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
            description: create.description ?? null,
            primaryColor: create.primaryColor,
            secondaryColor: create.secondaryColor ?? null,
            accentColor: create.accentColor ?? null,
            logoUrl: create.logoUrl ?? null,
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
