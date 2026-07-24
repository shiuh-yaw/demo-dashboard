/**
 * Postgres-backed DemoConfigService (Prisma + Supabase via @dynamic-demos/db).
 *
 * Single class for every demo kind (earn, wallet, trade, visa-direct,
 * checkout, remittance). `kind` is a plain TEXT column on the
 * `DemoConfig` table; the closed set is enforced via the Zod
 * discriminated union in `../demo-config-schemas.ts`. Replaces what
 * would otherwise be one service-per-table.
 *
 * The sole DemoConfigService implementation (see services/index.ts);
 * behavioural coverage at `../__tests__/demo-configs.postgres.test.ts`.
 *
 * D-013: this module never opens its own connection — it relies on the
 * `prisma` singleton from `@dynamic-demos/db`.
 * D-015: only `apps/dashboard` imports `@dynamic-demos/db`.
 */

import { prisma as defaultPrisma, type Prisma } from "@dynamic-demos/db";

import { parseDemoConfigPayload } from "../demo-config-schemas";
import type {
  CreateDemoConfigInput,
  DemoConfigKind,
  DemoConfigListOptions,
  DemoConfigRecord,
  DemoConfigService,
  Page,
  UpdateDemoConfigInput,
} from "../types";
import { clampLimit, pageArgs, toPage, type PageArgs } from "./pagination";

/**
 * Internal row shape returned by Prisma. Mirrors the `DemoConfig` model
 * exactly. Kept private — the service surface is `DemoConfigRecord`.
 * `kind` is `string` here (the DB column is TEXT); the service narrows
 * to `DemoConfigKind` after Zod validation at the boundary.
 */
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

/**
 * Minimal subset of the Prisma client used by `PostgresDemoConfigService`.
 * Lets unit tests inject an in-memory fake without dragging
 * `@prisma/client` into the test environment. The real `PrismaClient`
 * from `@dynamic-demos/db` structurally satisfies this interface.
 */
export interface DemoConfigPrismaClient {
  demoConfig: {
    create(args: {
      data: {
        kind: string;
        ownerId: string;
        createdById?: string | null;
        name?: string | null;
        description?: string | null;
        prospectId: string | null;
        isPrimary?: boolean;
        themeOverrides?: unknown | null;
        config: unknown;
      };
    }): Promise<DemoConfigRow>;
    findUnique(args: { where: { id: string } }): Promise<DemoConfigRow | null>;
    findMany(
      args?: { where?: Prisma.DemoConfigWhereInput } & Partial<PageArgs>,
    ): Promise<DemoConfigRow[]>;
    update(args: {
      where: { id: string };
      data: Partial<{
        createdById: string | null;
        name: string | null;
        description: string | null;
        prospectId: string | null;
        isPrimary: boolean;
        themeOverrides: unknown | null;
        config: unknown;
      }>;
    }): Promise<DemoConfigRow>;
    delete(args: { where: { id: string } }): Promise<DemoConfigRow>;
    upsert(args: {
      where: { id: string };
      create: {
        id: string;
        kind: string;
        ownerId: string;
        createdById?: string | null;
        name?: string | null;
        description?: string | null;
        prospectId: string | null;
        isPrimary?: boolean;
        themeOverrides?: unknown | null;
        config: unknown;
      };
      update: Partial<{
        ownerId: string;
        createdById: string | null;
        name: string | null;
        description: string | null;
        prospectId: string | null;
        isPrimary: boolean;
        themeOverrides: unknown | null;
        config: unknown;
      }>;
    }): Promise<DemoConfigRow>;
  };
}

/** ANDs scope `where` + `kind` + `prospectId` without clobbering a nested OR/AND on `where`. */
function buildListWhere(options: DemoConfigListOptions): Prisma.DemoConfigWhereInput {
  const clauses: Prisma.DemoConfigWhereInput[] = [];
  if (options.where) clauses.push(options.where);
  if (options.kind) clauses.push({ kind: options.kind });
  if (options.prospectId) clauses.push({ prospectId: options.prospectId });
  if (clauses.length === 0) return {};
  if (clauses.length === 1) return clauses[0]!;
  return { AND: clauses };
}

function toRecord(row: DemoConfigRow): DemoConfigRecord {
  return {
    id: row.id,
    // The DB stores `kind` as plain TEXT; Zod validation at the write
    // boundary keeps the column constrained to `DemoConfigKind`. Reads
    // trust the boundary held.
    kind: row.kind as DemoConfigKind,
    ownerId: row.ownerId,
    createdById: row.createdById,
    name: row.name,
    description: row.description,
    prospectId: row.prospectId,
    isPrimary: row.isPrimary,
    themeOverrides: row.themeOverrides ?? null,
    config: row.config,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PostgresDemoConfigService implements DemoConfigService {
  private readonly client: DemoConfigPrismaClient;

  constructor(client?: DemoConfigPrismaClient) {
    this.client =
      client ?? (defaultPrisma as unknown as DemoConfigPrismaClient);
  }

  async create(input: CreateDemoConfigInput): Promise<DemoConfigRecord> {
    // Validate (kind, config) against the discriminated union. Throws
    // ZodError on shape violations; bubbles up to the caller.
    parseDemoConfigPayload(input.kind, input.config);
    const row = await this.client.demoConfig.create({
      data: {
        kind: input.kind,
        ownerId: input.ownerId,
        createdById: input.createdById ?? null,
        name: input.name ?? null,
        description: input.description ?? null,
        prospectId: input.prospectId,
        isPrimary: input.isPrimary ?? false,
        themeOverrides: input.themeOverrides ?? null,
        config: input.config,
      },
    });
    return toRecord(row);
  }

  async get(id: string): Promise<DemoConfigRecord | null> {
    const row = await this.client.demoConfig.findUnique({ where: { id } });
    return row ? toRecord(row) : null;
  }

  async list(options: DemoConfigListOptions = {}): Promise<Page<DemoConfigRecord>> {
    const limit = clampLimit(options.limit);
    const rows = await this.client.demoConfig.findMany({
      where: buildListWhere(options),
      ...pageArgs(options),
    });
    return toPage(rows.map(toRecord), limit);
  }

  /** Unpaginated projection - see `DemoConfigService.listIdKinds`. */
  async listIdKinds(where: Prisma.DemoConfigWhereInput): Promise<
    {
      id: string;
      kind: DemoConfigKind;
      prospectId: string | null;
      isPrimary: boolean;
      updatedAt: Date;
    }[]
  > {
    const rows = await this.client.demoConfig.findMany({ where });
    return rows.map((row) => ({
      id: row.id,
      kind: row.kind as DemoConfigKind,
      prospectId: row.prospectId,
      isPrimary: row.isPrimary,
      updatedAt: row.updatedAt,
    }));
  }

  async update(
    id: string,
    input: UpdateDemoConfigInput,
  ): Promise<DemoConfigRecord> {
    // If `config` is being changed, re-validate against the current
    // record's `kind`. `kind` itself is immutable at the service
    // boundary - there's no UpdateDemoConfigInput.kind field.
    if (input.config !== undefined) {
      const existing = await this.client.demoConfig.findUnique({
        where: { id },
      });
      if (!existing) {
        throw new Error(`DemoConfig not found: ${id}`);
      }
      parseDemoConfigPayload(existing.kind as DemoConfigKind, input.config);
    }
    const data: Parameters<
      DemoConfigPrismaClient["demoConfig"]["update"]
    >[0]["data"] = {};
    if (input.createdById !== undefined) data.createdById = input.createdById;
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.prospectId !== undefined) data.prospectId = input.prospectId;
    if (input.isPrimary !== undefined) data.isPrimary = input.isPrimary;
    if (input.themeOverrides !== undefined)
      data.themeOverrides = input.themeOverrides;
    if (input.config !== undefined) data.config = input.config;
    const row = await this.client.demoConfig.update({
      where: { id },
      data,
    });
    return toRecord(row);
  }

  async delete(id: string): Promise<void> {
    await this.client.demoConfig.delete({ where: { id } });
  }

  async upsertWithId(
    id: string,
    input: CreateDemoConfigInput,
  ): Promise<DemoConfigRecord> {
    parseDemoConfigPayload(input.kind, input.config);
    const row = await this.client.demoConfig.upsert({
      where: { id },
      create: {
        id,
        kind: input.kind,
        ownerId: input.ownerId,
        createdById: input.createdById ?? null,
        name: input.name ?? null,
        description: input.description ?? null,
        prospectId: input.prospectId,
        isPrimary: input.isPrimary ?? false,
        themeOverrides: input.themeOverrides ?? null,
        config: input.config,
      },
      update: {
        ownerId: input.ownerId,
        createdById: input.createdById ?? null,
        name: input.name ?? null,
        description: input.description ?? null,
        prospectId: input.prospectId,
        isPrimary: input.isPrimary ?? false,
        themeOverrides: input.themeOverrides ?? null,
        config: input.config,
      },
    });
    return toRecord(row);
  }
}
