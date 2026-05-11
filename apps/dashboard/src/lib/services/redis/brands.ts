/**
 * Redis-backed BrandService.
 *
 * Phase 2-brands parity baseline. Stored under a separate keyspace
 * (`brand-v2`) from the legacy `BrandProfile` aggregate in
 * `lib/actions/brands.ts`. After Phase 2-brand-cutover (2026-05-06)
 * the legacy aggregate is a thin wrapper over this service when
 * `USE_POSTGRES_BRANDS` is false; both backends carry the same row
 * shape.
 *
 * The Postgres equivalent (`../postgres/brands.ts`) implements the same
 * BrandService contract; both pass the parity test suite at
 * `__tests__/brands.parity.test.ts`.
 */

import { createId } from "@paralleldrive/cuid2";
import { getRedis, REDIS_KEYS, type RedisClient } from "@/lib/redis";
import type {
  Brand,
  BrandBorderRadius,
  BrandListOptions,
  BrandLogoKind,
  BrandService,
  CreateBrandInput,
  UpdateBrandInput,
} from "../types";

/**
 * Wire-format for a Brand row in Redis. Timestamps are stringified ISO-8601
 * because Upstash and ioredis serialise to JSON; Date round-trips break
 * silently. We hydrate to Date at the service boundary.
 */
interface StoredBrand {
  id: string;
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
  createdAt: string;
  updatedAt: string;
}

function hydrate(stored: StoredBrand): Brand {
  return {
    ...stored,
    createdAt: new Date(stored.createdAt),
    updatedAt: new Date(stored.updatedAt),
  };
}

/**
 * Build a fully-defaulted `StoredBrand` (minus timestamps + id) from a
 * `CreateBrandInput`. Mirrors `fromCreateInput` in the Postgres impl so
 * both backends serialise the same nulls when callers omit fields.
 */
function fromCreateInput(
  input: CreateBrandInput,
): Omit<StoredBrand, "id" | "createdAt" | "updatedAt"> {
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

export class RedisBrandService implements BrandService {
  private readonly redis: RedisClient;

  constructor(redis?: RedisClient) {
    this.redis = redis ?? getRedis();
  }

  async create(input: CreateBrandInput): Promise<Brand> {
    const id = createId();
    const now = new Date().toISOString();
    const stored: StoredBrand = {
      id,
      ...fromCreateInput(input),
      createdAt: now,
      updatedAt: now,
    };
    await this.redis.set(REDIS_KEYS.brandRecord(id), stored);
    await this.redis.sadd(REDIS_KEYS.brandRecordList, id);
    return hydrate(stored);
  }

  async get(id: string): Promise<Brand | null> {
    const stored = await this.redis.get<StoredBrand>(
      REDIS_KEYS.brandRecord(id),
    );
    return stored ? hydrate(stored) : null;
  }

  async list(options: BrandListOptions = {}): Promise<Brand[]> {
    const ids = await this.redis.smembers(REDIS_KEYS.brandRecordList);
    if (ids.length === 0) return [];
    const fetched = await Promise.all(
      ids.map((id) =>
        this.redis.get<StoredBrand>(REDIS_KEYS.brandRecord(id)),
      ),
    );
    let rows = fetched.filter((b): b is StoredBrand => b !== null);
    if (options.ownerId) {
      const ownerId = options.ownerId;
      rows = rows.filter((b) => b.ownerId === ownerId);
    }
    rows.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    return rows.map(hydrate);
  }

  async update(id: string, input: UpdateBrandInput): Promise<Brand> {
    const existing = await this.redis.get<StoredBrand>(
      REDIS_KEYS.brandRecord(id),
    );
    if (!existing) {
      throw new Error(`Brand not found: ${id}`);
    }
    const updated: StoredBrand = {
      ...existing,
      ...Object.fromEntries(
        Object.entries(input).filter(([, v]) => v !== undefined),
      ),
      updatedAt: new Date().toISOString(),
    } as StoredBrand;
    await this.redis.set(REDIS_KEYS.brandRecord(id), updated);
    return hydrate(updated);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.redis.get<StoredBrand>(
      REDIS_KEYS.brandRecord(id),
    );
    if (!existing) {
      throw new Error(`Brand not found: ${id}`);
    }
    await this.redis.del(REDIS_KEYS.brandRecord(id));
    await this.redis.srem(REDIS_KEYS.brandRecordList, id);
  }

  async upsertWithId(id: string, input: CreateBrandInput): Promise<Brand> {
    const existing = await this.redis.get<StoredBrand>(
      REDIS_KEYS.brandRecord(id),
    );
    const now = new Date().toISOString();
    const base = fromCreateInput(input);
    const stored: StoredBrand = existing
      ? { id, ...base, createdAt: existing.createdAt, updatedAt: now }
      : { id, ...base, createdAt: now, updatedAt: now };
    await this.redis.set(REDIS_KEYS.brandRecord(id), stored);
    await this.redis.sadd(REDIS_KEYS.brandRecordList, id);
    return hydrate(stored);
  }
}
