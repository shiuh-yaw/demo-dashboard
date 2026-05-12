/**
 * Redis-backed DemoConfigService.
 *
 * Parity baseline for the unified Postgres `DemoConfig` table. One
 * service handles every demo kind (earn, wallet, trade, visa-direct,
 * checkout, remittance); rows are stored under
 * `demo-dashboard:demo-config:<kind>:<id>` with a per-kind id set and
 * a per-`(ownerId, kind)` index so `list({ ownerId, kind })` stays
 * cheap.
 *
 * The Postgres equivalent (`../postgres/demo-configs.ts`) implements
 * the same `DemoConfigService` contract; both pass the parity test
 * suite at `__tests__/demo-configs.parity.test.ts`.
 *
 * Initial keyspace is intentionally separate from the legacy per-type
 * Redis stores (`demo-dashboard:earn:<id>`, etc.) — the action-layer
 * cutover is a deferred follow-up PR. Until then, the two coexist.
 */

import { createId } from "@paralleldrive/cuid2";

import { getRedis, REDIS_KEYS, type RedisClient } from "@/lib/redis";

import { parseDemoConfigPayload } from "../demo-config-schemas";
import type {
  CreateDemoConfigInput,
  DemoConfigKind,
  DemoConfigListOptions,
  DemoConfigRecord,
  DemoConfigService,
  UpdateDemoConfigInput,
} from "../types";

/**
 * Wire-format for a DemoConfig row in Redis. Timestamps are stringified
 * ISO-8601 because Upstash + ioredis serialise to JSON; Date round-trips
 * break silently. Hydrate at the service boundary.
 */
interface StoredDemoConfigRow {
  id: string;
  kind: DemoConfigKind;
  ownerId: string;
  name: string | null;
  description: string | null;
  brandId: string;
  themeOverrides: unknown | null;
  config: unknown;
  createdAt: string;
  updatedAt: string;
}

function toRecord(stored: StoredDemoConfigRow): DemoConfigRecord {
  return {
    id: stored.id,
    kind: stored.kind,
    ownerId: stored.ownerId,
    name: stored.name,
    description: stored.description,
    brandId: stored.brandId,
    themeOverrides: stored.themeOverrides ?? null,
    config: stored.config,
    createdAt: new Date(stored.createdAt),
    updatedAt: new Date(stored.updatedAt),
  };
}

/**
 * Optional constructor options. `enableLegacyFallback` defaults to `true`
 * so the action layer (TD-002) sees pre-cutover rows. The backfill sets it
 * to `false` so its existence-probe (`get(id) -> existing ? deduped : created`)
 * only sees rows already migrated into the v2 keyspace.
 */
export interface RedisDemoConfigServiceOptions {
  /** Default `true`. */
  enableLegacyFallback?: boolean;
}

export class RedisDemoConfigService implements DemoConfigService {
  private readonly redis: RedisClient;
  private readonly enableLegacyFallback: boolean;

  constructor(redis?: RedisClient, options: RedisDemoConfigServiceOptions = {}) {
    this.redis = redis ?? getRedis();
    this.enableLegacyFallback = options.enableLegacyFallback ?? true;
  }

  async create(input: CreateDemoConfigInput): Promise<DemoConfigRecord> {
    parseDemoConfigPayload(input.kind, input.config);
    const id = createId();
    const now = new Date().toISOString();
    const stored: StoredDemoConfigRow = {
      id,
      kind: input.kind,
      ownerId: input.ownerId,
      name: input.name ?? null,
      description: input.description ?? null,
      brandId: input.brandId,
      themeOverrides: input.themeOverrides ?? null,
      config: input.config,
      createdAt: now,
      updatedAt: now,
    };
    await this.persist(stored);
    return toRecord(stored);
  }

  async get(id: string): Promise<DemoConfigRecord | null> {
    // Without `kind` we can't address the row directly — but the row is
    // self-describing so we fall back to scanning each kind's keyspace.
    // The kind-scoped `demoConfig(kind, id)` key is the fast path; this
    // path only matters for the rare `get(id)` without a kind hint.
    for (const kind of ALL_KINDS) {
      const stored = await this.redis.get<StoredDemoConfigRow>(
        REDIS_KEYS.demoConfig(kind, id),
      );
      if (stored) return toRecord(stored);
    }
    // TD-002 read-fallback: until the action-layer cutover writes every
    // row through this service, production has rows under the legacy
    // per-kind keyspaces (`dashboard:earn:<id>`, etc.). Probe each one
    // before declaring a miss. No lazy upsert into v2 — the
    // `backfill:demo-configs` script is the authoritative migration path
    // (a read-time write would race the backfill and complicate brand
    // resolution).
    //
    // The backfill itself disables this fallback via the constructor
    // option — it needs `get(id) === null` for unmigrated ids so it
    // creates fresh rows instead of marking them deduped.
    if (this.enableLegacyFallback) {
      return this.tryReadLegacy(id);
    }
    return null;
  }

  /**
   * Read a row from the legacy per-kind Redis keyspaces. Returns a
   * synthesised `DemoConfigRecord` so callers see one shape; the
   * `brandId` is empty for legacy rows (they predate Brand records) and
   * the mapper layer is responsible for hydrating Brand at the action
   * boundary.
   */
  private async tryReadLegacy(
    id: string,
  ): Promise<DemoConfigRecord | null> {
    for (const probe of LEGACY_PROBES) {
      const raw = await this.redis.get<LegacyConfigShape>(probe.key(id));
      if (raw) return legacyToRecord(probe.kind, id, raw);
    }
    return null;
  }

  async list(
    options: DemoConfigListOptions = {},
  ): Promise<DemoConfigRecord[]> {
    // Pick the cheapest index given the filter combo.
    const ids: string[] = [];
    const kinds: DemoConfigKind[] = options.kind ? [options.kind] : ALL_KINDS;

    if (options.ownerId) {
      // Owner index narrows by both owner and kind in one shot per kind.
      for (const kind of kinds) {
        const owned = await this.redis.smembers(
          REDIS_KEYS.demoConfigOwnerKindIndex(options.ownerId, kind),
        );
        for (const id of owned) ids.push(`${kind}:${id}`);
      }
    } else {
      for (const kind of kinds) {
        const all = await this.redis.smembers(
          REDIS_KEYS.demoConfigKindList(kind),
        );
        for (const id of all) ids.push(`${kind}:${id}`);
      }
    }

    if (ids.length === 0) return [];

    const fetched = await Promise.all(
      ids.map(async (composite) => {
        const [kind, id] = splitComposite(composite);
        return this.redis.get<StoredDemoConfigRow>(
          REDIS_KEYS.demoConfig(kind, id),
        );
      }),
    );
    let rows = fetched.filter((r): r is StoredDemoConfigRow => r !== null);
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
    input: UpdateDemoConfigInput,
  ): Promise<DemoConfigRecord> {
    const existing = await this.findRowAcrossKinds(id);
    if (!existing) {
      throw new Error(`DemoConfig not found: ${id}`);
    }
    if (input.config !== undefined) {
      parseDemoConfigPayload(existing.kind, input.config);
    }
    const updated: StoredDemoConfigRow = {
      ...existing,
      ...Object.fromEntries(
        Object.entries(input).filter(([, v]) => v !== undefined),
      ),
      updatedAt: new Date().toISOString(),
    } as StoredDemoConfigRow;
    await this.redis.set(
      REDIS_KEYS.demoConfig(updated.kind, updated.id),
      updated,
    );
    return toRecord(updated);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.findRowAcrossKinds(id);
    if (!existing) {
      throw new Error(`DemoConfig not found: ${id}`);
    }
    await this.redis.del(REDIS_KEYS.demoConfig(existing.kind, id));
    await this.redis.srem(REDIS_KEYS.demoConfigKindList(existing.kind), id);
    await this.redis.srem(
      REDIS_KEYS.demoConfigOwnerKindIndex(existing.ownerId, existing.kind),
      id,
    );
  }

  async upsertWithId(
    id: string,
    input: CreateDemoConfigInput,
  ): Promise<DemoConfigRecord> {
    parseDemoConfigPayload(input.kind, input.config);
    const existing = await this.redis.get<StoredDemoConfigRow>(
      REDIS_KEYS.demoConfig(input.kind, id),
    );
    const now = new Date().toISOString();
    const stored: StoredDemoConfigRow = existing
      ? {
          id,
          kind: input.kind,
          ownerId: input.ownerId,
          name: input.name ?? null,
          description: input.description ?? null,
          brandId: input.brandId,
          themeOverrides: input.themeOverrides ?? null,
          config: input.config,
          createdAt: existing.createdAt,
          updatedAt: now,
        }
      : {
          id,
          kind: input.kind,
          ownerId: input.ownerId,
          name: input.name ?? null,
          description: input.description ?? null,
          brandId: input.brandId,
          themeOverrides: input.themeOverrides ?? null,
          config: input.config,
          createdAt: now,
          updatedAt: now,
        };
    await this.persist(stored);
    return toRecord(stored);
  }

  /**
   * Writes the row + maintains the per-kind id set + the
   * (ownerId, kind) index. Treats `sadd` as idempotent (it is) so the
   * "first write" and "re-write same id" paths share code.
   */
  private async persist(stored: StoredDemoConfigRow): Promise<void> {
    await this.redis.set(REDIS_KEYS.demoConfig(stored.kind, stored.id), stored);
    await this.redis.sadd(REDIS_KEYS.demoConfigKindList(stored.kind), stored.id);
    await this.redis.sadd(
      REDIS_KEYS.demoConfigOwnerKindIndex(stored.ownerId, stored.kind),
      stored.id,
    );
  }

  /**
   * Locate a row by id when the caller didn't supply a kind. Iterates
   * across every kind's keyspace; cheap because `kind` is a small
   * closed set.
   */
  private async findRowAcrossKinds(
    id: string,
  ): Promise<StoredDemoConfigRow | null> {
    for (const kind of ALL_KINDS) {
      const stored = await this.redis.get<StoredDemoConfigRow>(
        REDIS_KEYS.demoConfig(kind, id),
      );
      if (stored) return stored;
    }
    return null;
  }
}

/**
 * Local copy of the closed kind set. Pulled out of the Zod schemas
 * module so this file only depends on `types.ts` for the type — the
 * runtime list lives here to avoid a circular `demo-config-schemas →
 * types → demo-config-schemas` loop when callers import both.
 */
const ALL_KINDS: DemoConfigKind[] = [
  "earn",
  "wallet",
  "trade",
  "visa-direct",
  "checkout",
  "remittance",
];

function splitComposite(composite: string): [DemoConfigKind, string] {
  // Composite is `${kind}:${id}`. `kind` itself never contains `:`
  // (closed set, see ALL_KINDS), so the first separator is the boundary.
  const idx = composite.indexOf(":");
  return [
    composite.slice(0, idx) as DemoConfigKind,
    composite.slice(idx + 1),
  ];
}

// ============================================================================
// Legacy-keyspace read fallback (TD-002)
// ============================================================================
//
// Every legacy `Stored<Kind>Config` row shares the same outer shape — `id`,
// `name`, `ownerId`, `createdAt`, `updatedAt`, and a kind-specific `config`
// payload. That's enough to synthesise a `DemoConfigRecord` without writing
// new code per kind. The mapper layer (action boundary) is responsible for
// re-projecting the synthesised record back onto the kind-specific
// `StoredXConfig` shape and for hydrating the linked Brand.
//
// Synthesised rows carry `brandId = ""` (legacy rows predate Brand records).
// The action mapper either resolves a Brand on the fly (read path) or
// triggers a brand-resolve + write-through on the next update — neither
// happens here so the fallback stays read-only.

interface LegacyConfigShape {
  id: string;
  name?: string | null;
  description?: string | null;
  ownerId?: string | null;
  config: unknown;
  createdAt?: string;
  updatedAt?: string;
}

interface LegacyProbe {
  kind: DemoConfigKind;
  key: (id: string) => string;
}

const LEGACY_PROBES: readonly LegacyProbe[] = [
  { kind: "earn", key: REDIS_KEYS.earnConfig },
  { kind: "wallet", key: REDIS_KEYS.walletConfig },
  { kind: "trade", key: REDIS_KEYS.tradeConfig },
  { kind: "visa-direct", key: REDIS_KEYS.visaDirectConfig },
  { kind: "checkout", key: REDIS_KEYS.checkoutConfig },
  { kind: "remittance", key: REDIS_KEYS.remittanceConfig },
];

function legacyToRecord(
  kind: DemoConfigKind,
  id: string,
  raw: LegacyConfigShape,
): DemoConfigRecord {
  const createdAt = raw.createdAt
    ? new Date(raw.createdAt)
    : new Date(0);
  const updatedAt = raw.updatedAt
    ? new Date(raw.updatedAt)
    : createdAt;
  return {
    id,
    kind,
    ownerId: raw.ownerId ?? "",
    name: raw.name ?? null,
    description: raw.description ?? null,
    brandId: "",
    themeOverrides: null,
    config: raw.config,
    createdAt,
    updatedAt,
  };
}
