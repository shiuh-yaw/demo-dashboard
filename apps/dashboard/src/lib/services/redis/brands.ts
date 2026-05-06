/**
 * Redis-backed BrandService.
 *
 * Phase 2-brands parity baseline. Stored under a separate keyspace
 * (`brand-v2`) from the legacy `BrandProfile` aggregate in
 * `lib/actions/brands.ts` — they're different shapes and live concurrently
 * until the legacy aggregate is retired.
 *
 * The Postgres equivalent (`../postgres/brands.ts`) implements the same
 * BrandService contract; both pass the parity test suite at
 * `__tests__/brands.parity.test.ts`.
 */

import { createId } from "@paralleldrive/cuid2";
import { getRedis, REDIS_KEYS, type RedisClient } from "@/lib/redis";
import type {
  Brand,
  BrandListOptions,
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
  primaryColor: string;
  secondaryColor: string | null;
  accentColor: string | null;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

function toBrand(stored: StoredBrand): Brand {
  return {
    ...stored,
    createdAt: new Date(stored.createdAt),
    updatedAt: new Date(stored.updatedAt),
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
      ownerId: input.ownerId,
      name: input.name,
      description: input.description ?? null,
      primaryColor: input.primaryColor,
      secondaryColor: input.secondaryColor ?? null,
      accentColor: input.accentColor ?? null,
      logoUrl: input.logoUrl ?? null,
      createdAt: now,
      updatedAt: now,
    };
    await this.redis.set(REDIS_KEYS.brandRecord(id), stored);
    await this.redis.sadd(REDIS_KEYS.brandRecordList, id);
    return toBrand(stored);
  }

  async get(id: string): Promise<Brand | null> {
    const stored = await this.redis.get<StoredBrand>(
      REDIS_KEYS.brandRecord(id),
    );
    return stored ? toBrand(stored) : null;
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
    return rows.map(toBrand);
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
    return toBrand(updated);
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
}
