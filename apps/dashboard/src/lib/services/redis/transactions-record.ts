/**
 * Redis-backed TransactionRecordService — parity baseline for the canonical
 * state-machine carrier introduced in Phase 2-transactions (D-010).
 *
 * Stored under a separate keyspace (`tx-v2`) from the legacy LI.FI checkout
 * `Transaction` shape (`RedisTransactionService` in `./transactions.ts`).
 * The two shapes coexist; this service is the migration target for
 * `USE_POSTGRES_TRANSACTIONS` and the parity backend behind the flag.
 *
 * State validation lives at this boundary: every state-mutating method
 * calls `assertValidTransition` from `@dynamic-demos/transactions` before
 * writing. Same enforcement as the Postgres impl — diverging would defeat
 * the parity test guarantee.
 */

import { createId } from "@paralleldrive/cuid2";
import {
  TransactionState,
  assertValidTransition,
} from "@dynamic-demos/transactions";

import { getRedis, REDIS_KEYS, type RedisClient } from "@/lib/redis";

import type {
  CreateTransactionRecordInput,
  TransactionRecord,
  TransactionRecordListOptions,
  TransactionRecordService,
  UpdateTransactionPayloadInput,
  UpdateTransactionStateInput,
} from "../types";

/**
 * Wire-format for a TransactionRecord row in Redis. Timestamps are
 * stringified ISO-8601 because Upstash and ioredis serialise to JSON; Date
 * round-trips break silently. We hydrate to Date at the service boundary.
 */
interface StoredTransactionRecord {
  id: string;
  kind: string;
  state: TransactionState;
  demoInstanceId: string | null;
  brandId: string | null;
  parentTransactionId: string | null;
  payload: unknown;
  refs: unknown;
  createdAt: string;
  updatedAt: string;
}

function toRecord(stored: StoredTransactionRecord): TransactionRecord {
  return {
    id: stored.id,
    kind: stored.kind,
    state: stored.state,
    demoInstanceId: stored.demoInstanceId,
    brandId: stored.brandId,
    parentTransactionId: stored.parentTransactionId,
    payload: stored.payload,
    refs: stored.refs,
    createdAt: new Date(stored.createdAt),
    updatedAt: new Date(stored.updatedAt),
  };
}

export class RedisTransactionRecordService
  implements TransactionRecordService
{
  private readonly redis: RedisClient;

  constructor(redis?: RedisClient) {
    this.redis = redis ?? getRedis();
  }

  async create(
    input: CreateTransactionRecordInput,
  ): Promise<TransactionRecord> {
    const id = createId();
    const now = new Date().toISOString();
    const stored: StoredTransactionRecord = {
      id,
      kind: input.kind,
      state: input.state ?? TransactionState.initialized,
      demoInstanceId: input.demoInstanceId ?? null,
      brandId: input.brandId ?? null,
      parentTransactionId: input.parentTransactionId ?? null,
      payload: input.payload ?? {},
      refs: input.refs ?? {},
      createdAt: now,
      updatedAt: now,
    };
    await this.redis.set(REDIS_KEYS.transactionRecord(id), stored);
    await this.redis.sadd(REDIS_KEYS.transactionRecordList, id);
    return toRecord(stored);
  }

  async get(id: string): Promise<TransactionRecord | null> {
    const stored = await this.redis.get<StoredTransactionRecord>(
      REDIS_KEYS.transactionRecord(id),
    );
    return stored ? toRecord(stored) : null;
  }

  async list(
    options: TransactionRecordListOptions = {},
  ): Promise<TransactionRecord[]> {
    const ids = await this.redis.smembers(REDIS_KEYS.transactionRecordList);
    if (ids.length === 0) return [];
    const fetched = await Promise.all(
      ids.map((id) =>
        this.redis.get<StoredTransactionRecord>(
          REDIS_KEYS.transactionRecord(id),
        ),
      ),
    );
    let rows = fetched.filter(
      (r): r is StoredTransactionRecord => r !== null,
    );
    if (options.demoInstanceId) {
      const demoInstanceId = options.demoInstanceId;
      rows = rows.filter((r) => r.demoInstanceId === demoInstanceId);
    }
    if (options.brandId) {
      const brandId = options.brandId;
      rows = rows.filter((r) => r.brandId === brandId);
    }
    if (options.kind) {
      const kind = options.kind;
      rows = rows.filter((r) => r.kind === kind);
    }
    if (options.parentTransactionId) {
      const parentId = options.parentTransactionId;
      rows = rows.filter((r) => r.parentTransactionId === parentId);
    }
    if (options.state) {
      const states = Array.isArray(options.state)
        ? options.state
        : [options.state];
      rows = rows.filter((r) => states.includes(r.state));
    }
    rows.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    return rows.map(toRecord);
  }

  async updateState(
    id: string,
    input: UpdateTransactionStateInput,
  ): Promise<TransactionRecord> {
    const existing = await this.redis.get<StoredTransactionRecord>(
      REDIS_KEYS.transactionRecord(id),
    );
    if (!existing) {
      throw new Error(`TransactionRecord not found: ${id}`);
    }
    // Validate the transition at the boundary. Throws
    // `IllegalTransitionError` from the state machine on illegal `from → to`.
    assertValidTransition(existing.state, input.state);
    const updated: StoredTransactionRecord = {
      ...existing,
      state: input.state,
      updatedAt: new Date().toISOString(),
    };
    await this.redis.set(REDIS_KEYS.transactionRecord(id), updated);
    return toRecord(updated);
  }

  async updatePayload(
    id: string,
    input: UpdateTransactionPayloadInput,
  ): Promise<TransactionRecord> {
    const existing = await this.redis.get<StoredTransactionRecord>(
      REDIS_KEYS.transactionRecord(id),
    );
    if (!existing) {
      throw new Error(`TransactionRecord not found: ${id}`);
    }
    const updated: StoredTransactionRecord = {
      ...existing,
      payload: input.payload !== undefined ? input.payload : existing.payload,
      refs: input.refs !== undefined ? input.refs : existing.refs,
      demoInstanceId:
        input.demoInstanceId !== undefined
          ? input.demoInstanceId
          : existing.demoInstanceId,
      brandId:
        input.brandId !== undefined ? input.brandId : existing.brandId,
      updatedAt: new Date().toISOString(),
    };
    await this.redis.set(REDIS_KEYS.transactionRecord(id), updated);
    return toRecord(updated);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.redis.get<StoredTransactionRecord>(
      REDIS_KEYS.transactionRecord(id),
    );
    if (!existing) {
      throw new Error(`TransactionRecord not found: ${id}`);
    }
    await this.redis.del(REDIS_KEYS.transactionRecord(id));
    await this.redis.srem(REDIS_KEYS.transactionRecordList, id);
  }
}
