/**
 * Postgres-backed BrandService (Prisma + Supabase via @dynamic-demos/db).
 *
 * Routed in via the USE_POSTGRES_BRANDS flag (see services/index.ts).
 * Both this and RedisBrandService satisfy the same parity test suite at
 * `../__tests__/brands.parity.test.ts`.
 *
 * Phase 2-brand-cutover (2026-05-06): the row carries every field the
 * legacy `BrandProfile` aggregate carried (visual theme, logo
 * discriminator, demo-config id mirrors). See types.ts for the full
 * shape and lib/services/brand-mapper.ts for the projection back to
 * the BrandProfile aggregate consumers expect.
 *
 * D-013: this module never opens its own connection — it relies on the
 * `prisma` singleton from @dynamic-demos/db so pool usage stays correct.
 * D-015: only apps/dashboard imports @dynamic-demos/db.
 */

import { prisma as defaultPrisma } from "@dynamic-demos/db";
import type {
  Brand,
  BrandBorderRadius,
  BrandListOptions,
  BrandLogoKind,
  BrandService,
  CreateBrandInput,
  UpdateBrandInput,
} from "../types";

/** Fields that flow identically through create/update/upsert. */
type BrandWritable = {
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
};

/**
 * Minimal subset of the Prisma client used by PostgresBrandService.
 * Lets unit tests inject an in-memory fake without dragging
 * @prisma/client into the test environment. The real `PrismaClient`
 * from @dynamic-demos/db structurally satisfies this interface.
 */
export interface BrandPrismaClient {
  brand: {
    create(args: {
      data: Partial<BrandWritable> & {
        ownerId: string;
        name: string;
        primaryColor: string;
      };
    }): Promise<Brand>;
    findUnique(args: { where: { id: string } }): Promise<Brand | null>;
    findMany(args?: {
      where?: { ownerId?: string };
      orderBy?: { createdAt?: "asc" | "desc" };
    }): Promise<Brand[]>;
    update(args: {
      where: { id: string };
      data: Partial<BrandWritable>;
    }): Promise<Brand>;
    delete(args: { where: { id: string } }): Promise<Brand>;
    upsert(args: {
      where: { id: string };
      create: Partial<BrandWritable> & {
        id: string;
        ownerId: string;
        name: string;
        primaryColor: string;
      };
      update: Partial<BrandWritable>;
    }): Promise<Brand>;
  };
}

/**
 * Normalise a `CreateBrandInput` into the fields the Prisma delegate
 * accepts. `undefined` is widened to `null` for the columns that accept
 * null so the row always has explicit values; `logo` defaults to
 * "dynamic" so callers that don't care about the discriminator still
 * land a valid row.
 */
function fromCreateInput(input: CreateBrandInput): BrandWritable {
  return {
    ownerId: input.ownerId,
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
  };
}

/**
 * Reduce an `UpdateBrandInput` to only the fields the caller set. Each
 * `undefined` is dropped so the Prisma update only touches the columns
 * the caller explicitly named — including allowing explicit `null` to
 * clear a column.
 */
function fromUpdateInput(input: UpdateBrandInput): Partial<BrandWritable> {
  const data: Partial<BrandWritable> = {};
  const keys: ReadonlyArray<keyof UpdateBrandInput> = [
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
  ];
  for (const key of keys) {
    if (input[key] !== undefined) {
      (data as Record<string, unknown>)[key] = input[key];
    }
  }
  return data;
}

export class PostgresBrandService implements BrandService {
  private readonly client: BrandPrismaClient;

  constructor(client?: BrandPrismaClient) {
    this.client = client ?? (defaultPrisma as unknown as BrandPrismaClient);
  }

  async create(input: CreateBrandInput): Promise<Brand> {
    return this.client.brand.create({ data: fromCreateInput(input) });
  }

  async get(id: string): Promise<Brand | null> {
    return this.client.brand.findUnique({ where: { id } });
  }

  async list(options: BrandListOptions = {}): Promise<Brand[]> {
    return this.client.brand.findMany({
      where: options.ownerId ? { ownerId: options.ownerId } : undefined,
      orderBy: { createdAt: "asc" },
    });
  }

  async update(id: string, input: UpdateBrandInput): Promise<Brand> {
    return this.client.brand.update({
      where: { id },
      data: fromUpdateInput(input),
    });
  }

  async delete(id: string): Promise<void> {
    await this.client.brand.delete({ where: { id } });
  }

  async upsertWithId(id: string, input: CreateBrandInput): Promise<Brand> {
    const data = fromCreateInput(input);
    return this.client.brand.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
  }
}
