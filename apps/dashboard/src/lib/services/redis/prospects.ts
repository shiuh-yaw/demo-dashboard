/**
 * Redis-backed ProspectService.
 *
 * Phase 2-brands parity baseline. Stored under a separate keyspace
 * (`prospect-v2`) from the legacy `ProspectProfile` aggregate in
 * `lib/actions/prospects.ts`. After Phase 2-brand-cutover (2026-05-06)
 * the legacy aggregate is a thin wrapper over this service when
 * `USE_POSTGRES_PROSPECTS` is false; both backends carry the same row
 * shape.
 *
 * The Postgres equivalent (`../postgres/prospects.ts`) implements the same
 * ProspectService contract; both pass the parity test suite at
 * `__tests__/prospects.parity.test.ts`.
 */

import { createId } from "@paralleldrive/cuid2";
import { getRedis, REDIS_KEYS, type RedisClient } from "@/lib/redis";
import type {
  Prospect,
  ProspectBorderRadius,
  ProspectListOptions,
  ProspectLogoKind,
  ProspectService,
  CreateProspectInput,
  UpdateProspectInput,
} from "../types";

/**
 * Wire-format for a Prospect row in Redis. Timestamps are stringified ISO-8601
 * because Upstash and ioredis serialise to JSON; Date round-trips break
 * silently. We hydrate to Date at the service boundary.
 */
interface StoredProspect {
  id: string;
  ownerId: string;
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
  createdAt: string;
  updatedAt: string;
}

function hydrate(stored: StoredProspect): Prospect {
  return {
    ...stored,
    createdAt: new Date(stored.createdAt),
    updatedAt: new Date(stored.updatedAt),
  };
}

/**
 * Build a fully-defaulted `StoredProspect` (minus timestamps + id) from a
 * `CreateProspectInput`. Mirrors `fromCreateInput` in the Postgres impl so
 * both backends serialise the same nulls when callers omit fields.
 */
function fromCreateInput(
  input: CreateProspectInput,
): Omit<StoredProspect, "id" | "createdAt" | "updatedAt"> {
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
    domain: input.domain ?? null,
    notes: input.notes ?? null,
  };
}

export class RedisProspectService implements ProspectService {
  private readonly redis: RedisClient;

  constructor(redis?: RedisClient) {
    this.redis = redis ?? getRedis();
  }

  async create(input: CreateProspectInput): Promise<Prospect> {
    const id = createId();
    const now = new Date().toISOString();
    const stored: StoredProspect = {
      id,
      ...fromCreateInput(input),
      createdAt: now,
      updatedAt: now,
    };
    await this.redis.set(REDIS_KEYS.prospectRecord(id), stored);
    await this.redis.sadd(REDIS_KEYS.prospectRecordList, id);
    return hydrate(stored);
  }

  async get(id: string): Promise<Prospect | null> {
    const stored = await this.redis.get<StoredProspect>(
      REDIS_KEYS.prospectRecord(id),
    );
    return stored ? hydrate(stored) : null;
  }

  async list(options: ProspectListOptions = {}): Promise<Prospect[]> {
    const ids = await this.redis.smembers(REDIS_KEYS.prospectRecordList);
    if (ids.length === 0) return [];
    const fetched = await Promise.all(
      ids.map((id) =>
        this.redis.get<StoredProspect>(REDIS_KEYS.prospectRecord(id)),
      ),
    );
    let rows = fetched.filter((b): b is StoredProspect => b !== null);
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

  async update(id: string, input: UpdateProspectInput): Promise<Prospect> {
    const existing = await this.redis.get<StoredProspect>(
      REDIS_KEYS.prospectRecord(id),
    );
    if (!existing) {
      throw new Error(`Prospect not found: ${id}`);
    }
    const updated: StoredProspect = {
      ...existing,
      ...Object.fromEntries(
        Object.entries(input).filter(([, v]) => v !== undefined),
      ),
      updatedAt: new Date().toISOString(),
    } as StoredProspect;
    await this.redis.set(REDIS_KEYS.prospectRecord(id), updated);
    return hydrate(updated);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.redis.get<StoredProspect>(
      REDIS_KEYS.prospectRecord(id),
    );
    if (!existing) {
      throw new Error(`Prospect not found: ${id}`);
    }
    await this.redis.del(REDIS_KEYS.prospectRecord(id));
    await this.redis.srem(REDIS_KEYS.prospectRecordList, id);
  }

  async upsertWithId(id: string, input: CreateProspectInput): Promise<Prospect> {
    const existing = await this.redis.get<StoredProspect>(
      REDIS_KEYS.prospectRecord(id),
    );
    const now = new Date().toISOString();
    const base = fromCreateInput(input);
    const stored: StoredProspect = existing
      ? { id, ...base, createdAt: existing.createdAt, updatedAt: now }
      : { id, ...base, createdAt: now, updatedAt: now };
    await this.redis.set(REDIS_KEYS.prospectRecord(id), stored);
    await this.redis.sadd(REDIS_KEYS.prospectRecordList, id);
    return hydrate(stored);
  }
}
