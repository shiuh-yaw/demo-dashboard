/**
 * Postgres-backed BrandService (Prisma + Supabase via @dynamic-demos/db).
 *
 * Routed in via the USE_POSTGRES_BRANDS flag (see services/index.ts).
 * Both this and RedisBrandService satisfy the same parity test suite at
 * `../__tests__/brands.parity.test.ts`.
 *
 * D-013: this module never opens its own connection — it relies on the
 * `prisma` singleton from @dynamic-demos/db so pool usage stays correct.
 * D-015: only apps/dashboard imports @dynamic-demos/db.
 */

import { prisma as defaultPrisma } from "@dynamic-demos/db";
import type {
  Brand,
  BrandListOptions,
  BrandService,
  CreateBrandInput,
  UpdateBrandInput,
} from "../types";

/**
 * Minimal subset of the Prisma client used by PostgresBrandService.
 * Lets unit tests inject an in-memory fake without dragging
 * @prisma/client into the test environment. The real `PrismaClient`
 * from @dynamic-demos/db structurally satisfies this interface.
 */
export interface BrandPrismaClient {
  brand: {
    create(args: {
      data: {
        ownerId: string;
        name: string;
        description?: string | null;
        primaryColor: string;
        secondaryColor?: string | null;
        accentColor?: string | null;
        logoUrl?: string | null;
      };
    }): Promise<Brand>;
    findUnique(args: { where: { id: string } }): Promise<Brand | null>;
    findMany(args?: {
      where?: { ownerId?: string };
      orderBy?: { createdAt?: "asc" | "desc" };
    }): Promise<Brand[]>;
    update(args: {
      where: { id: string };
      data: Partial<{
        name: string;
        description: string | null;
        primaryColor: string;
        secondaryColor: string | null;
        accentColor: string | null;
        logoUrl: string | null;
      }>;
    }): Promise<Brand>;
    delete(args: { where: { id: string } }): Promise<Brand>;
  };
}

export class PostgresBrandService implements BrandService {
  private readonly client: BrandPrismaClient;

  constructor(client?: BrandPrismaClient) {
    this.client = client ?? (defaultPrisma as unknown as BrandPrismaClient);
  }

  async create(input: CreateBrandInput): Promise<Brand> {
    return this.client.brand.create({
      data: {
        ownerId: input.ownerId,
        name: input.name,
        description: input.description ?? null,
        primaryColor: input.primaryColor,
        secondaryColor: input.secondaryColor ?? null,
        accentColor: input.accentColor ?? null,
        logoUrl: input.logoUrl ?? null,
      },
    });
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
    const data: Parameters<BrandPrismaClient["brand"]["update"]>[0]["data"] =
      {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.primaryColor !== undefined)
      data.primaryColor = input.primaryColor;
    if (input.secondaryColor !== undefined)
      data.secondaryColor = input.secondaryColor;
    if (input.accentColor !== undefined) data.accentColor = input.accentColor;
    if (input.logoUrl !== undefined) data.logoUrl = input.logoUrl;
    return this.client.brand.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.client.brand.delete({ where: { id } });
  }
}
