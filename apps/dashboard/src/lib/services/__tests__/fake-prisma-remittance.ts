/**
 * Minimal in-memory fake for the `prisma.remittanceConfig` delegate used
 * by `PostgresRemittanceConfigService`. Mirrors the existing
 * `fake-prisma.ts` (brands) and `fake-prisma-transactions.ts` patterns.
 *
 * Why a hand-rolled fake instead of the real PrismaClient? The Postgres
 * service depends on a small slice of the delegate (create, findUnique,
 * findMany, update, delete, upsert). Mocking that surface is a few dozen
 * lines and avoids pulling Prisma + a real Postgres into the unit tests.
 * Real-database integration coverage lives in the `db-migration-dryrun`
 * CI job that applies the migration to a fresh container.
 *
 * The shape here matches the `RemittanceConfigPrismaClient` interface
 * exactly, so structural typing keeps the fake honest.
 */

import type { RemittanceConfigPrismaClient } from "../postgres/remittance";

interface RemittanceConfigRow {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  brandId: string;
  config: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export function createFakeRemittancePrisma(): RemittanceConfigPrismaClient {
  const store = new Map<string, RemittanceConfigRow>();
  let counter = 0;
  const nextId = () => `rc_${++counter}`;
  // Each call returns a fresh Date; tests force monotonicity with a small
  // await between create and update (matches fake-prisma.ts brand fake).
  const now = () => new Date();

  return {
    remittanceConfig: {
      async create({ data }) {
        const id = nextId();
        const ts = now();
        const row: RemittanceConfigRow = {
          id,
          ownerId: data.ownerId,
          name: data.name,
          description: data.description ?? null,
          brandId: data.brandId,
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
        let rows = Array.from(store.values());
        if (args?.where?.ownerId) {
          const ownerId = args.where.ownerId;
          rows = rows.filter((r) => r.ownerId === ownerId);
        }
        if (args?.where?.brandId) {
          const brandId = args.where.brandId;
          rows = rows.filter((r) => r.brandId === brandId);
        }
        rows.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
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
        const updated: RemittanceConfigRow = {
          ...existing,
          ...Object.fromEntries(
            Object.entries(data).filter(([, v]) => v !== undefined),
          ),
          updatedAt: now(),
        } as RemittanceConfigRow;
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
          const row: RemittanceConfigRow = {
            id: where.id,
            ownerId: create.ownerId,
            name: create.name,
            description: create.description ?? null,
            brandId: create.brandId,
            config: create.config,
            createdAt: ts,
            updatedAt: ts,
          };
          store.set(where.id, row);
          return { ...row };
        }
        const updated: RemittanceConfigRow = {
          ...existing,
          ...Object.fromEntries(
            Object.entries(update).filter(([, v]) => v !== undefined),
          ),
          updatedAt: now(),
        } as RemittanceConfigRow;
        store.set(where.id, updated);
        return { ...updated };
      },
    },
  };
}
