/**
 * Postgres-backed RemittanceConfigService (Prisma + Supabase via @dynamic-demos/db).
 *
 * Routed in via the USE_POSTGRES_REMITTANCE flag (see services/index.ts).
 * Both this and `RedisRemittanceConfigService` satisfy the same parity test
 * suite at `../__tests__/remittance.parity.test.ts`.
 *
 * D-013: this module never opens its own connection — it relies on the
 * `prisma` singleton from `@dynamic-demos/db` so pool usage stays correct.
 * D-015: only `apps/dashboard` imports `@dynamic-demos/db`.
 */

import { prisma as defaultPrisma } from "@dynamic-demos/db";
import type {
  CreateRemittanceConfigInput,
  RemittanceConfigListOptions,
  RemittanceConfigRecord,
  RemittanceConfigService,
  UpdateRemittanceConfigInput,
} from "../types";

/**
 * Internal row shape returned by Prisma. Mirrors the `RemittanceConfig`
 * model exactly. Kept private — the service surface is
 * `RemittanceConfigRecord`.
 */
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

/**
 * Minimal subset of the Prisma client used by
 * `PostgresRemittanceConfigService`. Lets unit tests inject an in-memory
 * fake without dragging `@prisma/client` into the test environment. The
 * real `PrismaClient` from `@dynamic-demos/db` structurally satisfies
 * this interface.
 */
export interface RemittanceConfigPrismaClient {
  remittanceConfig: {
    create(args: {
      data: {
        ownerId: string;
        name: string;
        description?: string | null;
        brandId: string;
        config: unknown;
      };
    }): Promise<RemittanceConfigRow>;
    findUnique(args: {
      where: { id: string };
    }): Promise<RemittanceConfigRow | null>;
    findMany(args?: {
      where?: { ownerId?: string; brandId?: string };
      orderBy?: { createdAt?: "asc" | "desc" };
    }): Promise<RemittanceConfigRow[]>;
    update(args: {
      where: { id: string };
      data: Partial<{
        name: string;
        description: string | null;
        brandId: string;
        config: unknown;
      }>;
    }): Promise<RemittanceConfigRow>;
    delete(args: { where: { id: string } }): Promise<RemittanceConfigRow>;
    upsert(args: {
      where: { id: string };
      create: {
        id: string;
        ownerId: string;
        name: string;
        description?: string | null;
        brandId: string;
        config: unknown;
      };
      update: Partial<{
        ownerId: string;
        name: string;
        description: string | null;
        brandId: string;
        config: unknown;
      }>;
    }): Promise<RemittanceConfigRow>;
  };
}

function toRecord(row: RemittanceConfigRow): RemittanceConfigRecord {
  return {
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    description: row.description,
    brandId: row.brandId,
    config: row.config,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PostgresRemittanceConfigService
  implements RemittanceConfigService
{
  private readonly client: RemittanceConfigPrismaClient;

  constructor(client?: RemittanceConfigPrismaClient) {
    this.client =
      client ?? (defaultPrisma as unknown as RemittanceConfigPrismaClient);
  }

  async create(
    input: CreateRemittanceConfigInput,
  ): Promise<RemittanceConfigRecord> {
    const row = await this.client.remittanceConfig.create({
      data: {
        ownerId: input.ownerId,
        name: input.name,
        description: input.description ?? null,
        brandId: input.brandId,
        config: input.config,
      },
    });
    return toRecord(row);
  }

  async get(id: string): Promise<RemittanceConfigRecord | null> {
    const row = await this.client.remittanceConfig.findUnique({
      where: { id },
    });
    return row ? toRecord(row) : null;
  }

  async list(
    options: RemittanceConfigListOptions = {},
  ): Promise<RemittanceConfigRecord[]> {
    const where: { ownerId?: string; brandId?: string } = {};
    if (options.ownerId) where.ownerId = options.ownerId;
    if (options.brandId) where.brandId = options.brandId;
    const rows = await this.client.remittanceConfig.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toRecord);
  }

  async update(
    id: string,
    input: UpdateRemittanceConfigInput,
  ): Promise<RemittanceConfigRecord> {
    const data: Parameters<
      RemittanceConfigPrismaClient["remittanceConfig"]["update"]
    >[0]["data"] = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.brandId !== undefined) data.brandId = input.brandId;
    if (input.config !== undefined) data.config = input.config;
    const row = await this.client.remittanceConfig.update({
      where: { id },
      data,
    });
    return toRecord(row);
  }

  async delete(id: string): Promise<void> {
    await this.client.remittanceConfig.delete({ where: { id } });
  }

  async upsertWithId(
    id: string,
    input: CreateRemittanceConfigInput,
  ): Promise<RemittanceConfigRecord> {
    const row = await this.client.remittanceConfig.upsert({
      where: { id },
      create: {
        id,
        ownerId: input.ownerId,
        name: input.name,
        description: input.description ?? null,
        brandId: input.brandId,
        config: input.config,
      },
      update: {
        ownerId: input.ownerId,
        name: input.name,
        description: input.description ?? null,
        brandId: input.brandId,
        config: input.config,
      },
    });
    return toRecord(row);
  }
}
