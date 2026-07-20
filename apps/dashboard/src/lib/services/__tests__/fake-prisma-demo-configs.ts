/**
 * Minimal in-memory fake for the `prisma.demoConfig` delegate used by
 * `PostgresDemoConfigService`. Carries every demo kind (earn, wallet,
 * trade, visa-direct, checkout, remittance) on the unified table.
 *
 * Hand-rolled rather than the real PrismaClient because the service
 * only depends on a small slice of the delegate (create, findUnique,
 * findMany with `where.kind`, update, delete, upsert). Real-database
 * coverage lives in the CI migration dry-run job.
 *
 * The shape here matches `DemoConfigPrismaClient` exactly so structural
 * typing keeps the fake honest.
 */

import type { DemoConfigPrismaClient } from "../postgres/demo-configs";

interface DemoConfigRow {
  id: string;
  kind: string;
  ownerId: string;
  name: string | null;
  description: string | null;
  prospectId: string;
  themeOverrides: unknown | null;
  config: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export function createFakeDemoConfigPrisma(): DemoConfigPrismaClient {
  const store = new Map<string, DemoConfigRow>();
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
          name: data.name ?? null,
          description: data.description ?? null,
          prospectId: data.prospectId,
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
        let rows = Array.from(store.values());
        if (args?.where?.ownerId) {
          const ownerId = args.where.ownerId;
          rows = rows.filter((r) => r.ownerId === ownerId);
        }
        if (args?.where?.kind) {
          const kind = args.where.kind;
          rows = rows.filter((r) => r.kind === kind);
        }
        if (args?.where?.prospectId) {
          const prospectId = args.where.prospectId;
          rows = rows.filter((r) => r.prospectId === prospectId);
        }
        rows.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        if (args?.orderBy?.createdAt === "desc") rows.reverse();
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
            name: create.name ?? null,
            description: create.description ?? null,
            prospectId: create.prospectId,
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
