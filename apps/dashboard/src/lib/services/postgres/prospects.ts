/**
 * Postgres-backed ProspectService (Prisma + Supabase via @dynamic-demos/db).
 *
 * Routed in via the USE_POSTGRES_PROSPECTS flag (see services/index.ts).
 * Both this and RedisProspectService satisfy the same parity test suite at
 * `../__tests__/prospects.parity.test.ts`.
 *
 * Phase 2-brand-cutover (2026-05-06): the row carries every field the
 * legacy `ProspectProfile` aggregate carried (visual theme, logo
 * discriminator, demo-config id mirrors). See types.ts for the full
 * shape and lib/services/prospect-mapper.ts for the projection back to
 * the ProspectProfile aggregate consumers expect.
 *
 * D-013: this module never opens its own connection — it relies on the
 * `prisma` singleton from @dynamic-demos/db so pool usage stays correct.
 * D-015: only apps/dashboard imports @dynamic-demos/db.
 */

import { prisma as defaultPrisma } from "@dynamic-demos/db";
import {
  DEFAULT_TEAM_ID,
  type Prospect,
  type ProspectBorderRadius,
  type ProspectListOptions,
  type ProspectLogoKind,
  type ProspectService,
  type ProspectStatus,
  type CreateProspectInput,
  type UpdateProspectInput,
} from "../types";

/** Fields that flow identically through create/update/upsert. */
type ProspectWritable = {
  ownerId: string;
  teamId: string;
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
  demoEarnId: string | null;
  demoCheckoutsId: string | null;
  demoWalletId: string | null;
  demoRemittanceId: string | null;
  domain: string | null;
  notes: string | null;
};

/**
 * Minimal subset of the Prisma client used by PostgresProspectService.
 * Lets unit tests inject an in-memory fake without dragging
 * @prisma/client into the test environment. The real `PrismaClient`
 * from @dynamic-demos/db structurally satisfies this interface.
 */
export interface ProspectPrismaClient {
  prospect: {
    create(args: {
      data: Partial<ProspectWritable> & {
        ownerId: string;
        name: string;
        primaryColor: string;
      };
    }): Promise<Prospect>;
    findUnique(args: { where: { id: string } }): Promise<Prospect | null>;
    findMany(args?: {
      where?: { ownerId?: string };
      orderBy?: { createdAt?: "asc" | "desc" };
    }): Promise<Prospect[]>;
    update(args: {
      where: { id: string };
      data: Partial<ProspectWritable>;
    }): Promise<Prospect>;
    delete(args: { where: { id: string } }): Promise<Prospect>;
    upsert(args: {
      where: { id: string };
      create: Partial<ProspectWritable> & {
        id: string;
        ownerId: string;
        name: string;
        primaryColor: string;
      };
      update: Partial<ProspectWritable>;
    }): Promise<Prospect>;
  };
}

/**
 * Normalise a `CreateProspectInput` into the fields the Prisma delegate
 * accepts. `undefined` is widened to `null` for the columns that accept
 * null so the row always has explicit values; `logo` defaults to
 * "dynamic" so callers that don't care about the discriminator still
 * land a valid row.
 */
function fromCreateInput(input: CreateProspectInput): ProspectWritable {
  return {
    ownerId: input.ownerId,
    teamId: input.teamId ?? DEFAULT_TEAM_ID,
    createdById: input.createdById ?? null,
    status: input.status ?? "ACTIVE",
    name: input.name,
    description: input.description ?? null,
    companyUrl: input.companyUrl ?? null,
    logo: input.logo ?? "dynamic",
    logoUrl: input.logoUrl ?? null,
    borderRadius: input.borderRadius ?? null,
    primaryColor: input.primaryColor,
    primaryHoverColor: input.primaryHoverColor ?? null,
    secondaryColor: input.secondaryColor ?? null,
    accentColor: input.accentColor ?? null,
    pageBackground: input.pageBackground ?? null,
    background: input.background ?? null,
    foreground: input.foreground ?? null,
    mutedTextColor: input.mutedTextColor ?? null,
    borderColor: input.borderColor ?? null,
    rowBackground: input.rowBackground ?? null,
    rowHoverBackground: input.rowHoverBackground ?? null,
    gradientFrom: input.gradientFrom ?? null,
    gradientTo: input.gradientTo ?? null,
    demoEarnId: input.demoEarnId ?? null,
    demoCheckoutsId: input.demoCheckoutsId ?? null,
    demoWalletId: input.demoWalletId ?? null,
    demoRemittanceId: input.demoRemittanceId ?? null,
    domain: input.domain ?? null,
    notes: input.notes ?? null,
  };
}

/**
 * Reduce an `UpdateProspectInput` to only the fields the caller set. Each
 * `undefined` is dropped so the Prisma update only touches the columns
 * the caller explicitly named — including allowing explicit `null` to
 * clear a column.
 */
function fromUpdateInput(input: UpdateProspectInput): Partial<ProspectWritable> {
  const data: Partial<ProspectWritable> = {};
  const keys: ReadonlyArray<keyof UpdateProspectInput> = [
    "teamId",
    "createdById",
    "status",
    "name",
    "description",
    "companyUrl",
    "logo",
    "logoUrl",
    "borderRadius",
    "primaryColor",
    "primaryHoverColor",
    "secondaryColor",
    "accentColor",
    "pageBackground",
    "background",
    "foreground",
    "mutedTextColor",
    "borderColor",
    "rowBackground",
    "rowHoverBackground",
    "gradientFrom",
    "gradientTo",
    "demoEarnId",
    "demoCheckoutsId",
    "demoWalletId",
    "demoRemittanceId",
    "domain",
    "notes",
  ];
  for (const key of keys) {
    if (input[key] !== undefined) {
      (data as Record<string, unknown>)[key] = input[key];
    }
  }
  return data;
}

export class PostgresProspectService implements ProspectService {
  private readonly client: ProspectPrismaClient;

  constructor(client?: ProspectPrismaClient) {
    this.client = client ?? (defaultPrisma as unknown as ProspectPrismaClient);
  }

  async create(input: CreateProspectInput): Promise<Prospect> {
    return this.client.prospect.create({ data: fromCreateInput(input) });
  }

  async get(id: string): Promise<Prospect | null> {
    return this.client.prospect.findUnique({ where: { id } });
  }

  async list(options: ProspectListOptions = {}): Promise<Prospect[]> {
    return this.client.prospect.findMany({
      where: options.ownerId ? { ownerId: options.ownerId } : undefined,
      orderBy: { createdAt: "asc" },
    });
  }

  async update(id: string, input: UpdateProspectInput): Promise<Prospect> {
    return this.client.prospect.update({
      where: { id },
      data: fromUpdateInput(input),
    });
  }

  async delete(id: string): Promise<void> {
    await this.client.prospect.delete({ where: { id } });
  }

  async upsertWithId(id: string, input: CreateProspectInput): Promise<Prospect> {
    const data = fromCreateInput(input);
    return this.client.prospect.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
  }
}
