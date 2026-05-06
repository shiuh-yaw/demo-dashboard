/**
 * Redis-backed RemittanceConfigService.
 *
 * Phase 2-remittance parity baseline. Stored under a separate keyspace
 * (`remittance-v2`) from the legacy `StoredRemittanceConfig` shape used
 * by `apps/dashboard/src/lib/actions/remittance.ts` — the two coexist
 * concurrently until the legacy actions are retired in a follow-up PR.
 *
 * The Postgres equivalent (`../postgres/remittance.ts`) implements the
 * same `RemittanceConfigService` contract; both pass the parity test
 * suite at `__tests__/remittance.parity.test.ts`.
 */

import { createId } from "@paralleldrive/cuid2";
import { getRedis, REDIS_KEYS, type RedisClient } from "@/lib/redis";
import type {
  CreateRemittanceConfigInput,
  RemittanceConfigListOptions,
  RemittanceConfigRecord,
  RemittanceConfigService,
  UpdateRemittanceConfigInput,
} from "../types";

/**
 * Wire-format for a RemittanceConfig row in Redis. Timestamps are
 * stringified ISO-8601 because Upstash and ioredis serialise to JSON;
 * Date round-trips break silently. We hydrate to Date at the service
 * boundary.
 */
interface StoredRemittanceConfigRow {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  brandId: string;
  config: unknown;
  createdAt: string;
  updatedAt: string;
}

function toRecord(stored: StoredRemittanceConfigRow): RemittanceConfigRecord {
  return {
    id: stored.id,
    ownerId: stored.ownerId,
    name: stored.name,
    description: stored.description,
    brandId: stored.brandId,
    config: stored.config,
    createdAt: new Date(stored.createdAt),
    updatedAt: new Date(stored.updatedAt),
  };
}

export class RedisRemittanceConfigService implements RemittanceConfigService {
  private readonly redis: RedisClient;

  constructor(redis?: RedisClient) {
    this.redis = redis ?? getRedis();
  }

  async create(
    input: CreateRemittanceConfigInput,
  ): Promise<RemittanceConfigRecord> {
    const id = createId();
    const now = new Date().toISOString();
    const stored: StoredRemittanceConfigRow = {
      id,
      ownerId: input.ownerId,
      name: input.name,
      description: input.description ?? null,
      brandId: input.brandId,
      config: input.config,
      createdAt: now,
      updatedAt: now,
    };
    await this.redis.set(REDIS_KEYS.remittanceConfigV2(id), stored);
    await this.redis.sadd(REDIS_KEYS.remittanceConfigV2List, id);
    return toRecord(stored);
  }

  async get(id: string): Promise<RemittanceConfigRecord | null> {
    const stored = await this.redis.get<StoredRemittanceConfigRow>(
      REDIS_KEYS.remittanceConfigV2(id),
    );
    return stored ? toRecord(stored) : null;
  }

  async list(
    options: RemittanceConfigListOptions = {},
  ): Promise<RemittanceConfigRecord[]> {
    const ids = await this.redis.smembers(REDIS_KEYS.remittanceConfigV2List);
    if (ids.length === 0) return [];
    const fetched = await Promise.all(
      ids.map((id) =>
        this.redis.get<StoredRemittanceConfigRow>(
          REDIS_KEYS.remittanceConfigV2(id),
        ),
      ),
    );
    let rows = fetched.filter(
      (r): r is StoredRemittanceConfigRow => r !== null,
    );
    if (options.ownerId) {
      const ownerId = options.ownerId;
      rows = rows.filter((r) => r.ownerId === ownerId);
    }
    if (options.brandId) {
      const brandId = options.brandId;
      rows = rows.filter((r) => r.brandId === brandId);
    }
    rows.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    return rows.map(toRecord);
  }

  async update(
    id: string,
    input: UpdateRemittanceConfigInput,
  ): Promise<RemittanceConfigRecord> {
    const existing = await this.redis.get<StoredRemittanceConfigRow>(
      REDIS_KEYS.remittanceConfigV2(id),
    );
    if (!existing) {
      throw new Error(`RemittanceConfig not found: ${id}`);
    }
    const updated: StoredRemittanceConfigRow = {
      ...existing,
      ...Object.fromEntries(
        Object.entries(input).filter(([, v]) => v !== undefined),
      ),
      updatedAt: new Date().toISOString(),
    } as StoredRemittanceConfigRow;
    await this.redis.set(REDIS_KEYS.remittanceConfigV2(id), updated);
    return toRecord(updated);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.redis.get<StoredRemittanceConfigRow>(
      REDIS_KEYS.remittanceConfigV2(id),
    );
    if (!existing) {
      throw new Error(`RemittanceConfig not found: ${id}`);
    }
    await this.redis.del(REDIS_KEYS.remittanceConfigV2(id));
    await this.redis.srem(REDIS_KEYS.remittanceConfigV2List, id);
  }

  async upsertWithId(
    id: string,
    input: CreateRemittanceConfigInput,
  ): Promise<RemittanceConfigRecord> {
    const existing = await this.redis.get<StoredRemittanceConfigRow>(
      REDIS_KEYS.remittanceConfigV2(id),
    );
    const now = new Date().toISOString();
    const stored: StoredRemittanceConfigRow = existing
      ? {
          id,
          ownerId: input.ownerId,
          name: input.name,
          description: input.description ?? null,
          brandId: input.brandId,
          config: input.config,
          createdAt: existing.createdAt,
          updatedAt: now,
        }
      : {
          id,
          ownerId: input.ownerId,
          name: input.name,
          description: input.description ?? null,
          brandId: input.brandId,
          config: input.config,
          createdAt: now,
          updatedAt: now,
        };
    await this.redis.set(REDIS_KEYS.remittanceConfigV2(id), stored);
    await this.redis.sadd(REDIS_KEYS.remittanceConfigV2List, id);
    return toRecord(stored);
  }
}
