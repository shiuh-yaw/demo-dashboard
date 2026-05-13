/**
 * Shared in-memory fakes for the magic-send service tests.
 *
 * No real Redis, Postgres, viem, or Dynamic SDK is touched here. The
 * fakes are kept tiny — they satisfy exactly the interfaces the
 * service consumes, nothing more.
 */

import type {
  TransactionRecord,
  TransactionRecordService,
  CreateTransactionRecordInput,
  UpdateTransactionStateInput,
  UpdateTransactionPayloadInput,
  TransactionRecordListOptions,
} from "@/lib/services/types";
import { assertValidTransition, type TransactionState } from "@dynamic-demos/transactions";

import type {
  MagicSendRedisClient,
} from "../intents";
import type {
  UserOpExecutor,
  UserOpExecutorRequest,
  UserOpExecutorResult,
  VaultAdapter,
  VaultTransferRequest,
  VaultTransferResult,
} from "../types";

// ---------------------------------------------------------------------------
// Postgres fake — drives `transactionRecordService`
// ---------------------------------------------------------------------------

export class FakeTransactionRecordService implements TransactionRecordService {
  private rows = new Map<string, TransactionRecord>();
  private counter = 0;
  private nowFn: () => Date;

  constructor(nowFn?: () => Date) {
    this.nowFn = nowFn ?? (() => new Date());
  }

  setClock(nowFn: () => Date): void {
    this.nowFn = nowFn;
  }

  snapshot(): TransactionRecord[] {
    return Array.from(this.rows.values()).map((r) => ({ ...r }));
  }

  async create(input: CreateTransactionRecordInput): Promise<TransactionRecord> {
    const id = `tx_${++this.counter}`;
    const ts = this.nowFn();
    const row: TransactionRecord = {
      id,
      kind: input.kind,
      state: (input.state ?? "initialized") as TransactionState,
      demoInstanceId: input.demoInstanceId ?? null,
      brandId: input.brandId ?? null,
      parentTransactionId: input.parentTransactionId ?? null,
      payload: input.payload ?? {},
      refs: input.refs ?? {},
      createdAt: ts,
      updatedAt: ts,
    };
    this.rows.set(id, row);
    return { ...row };
  }

  async get(id: string): Promise<TransactionRecord | null> {
    const row = this.rows.get(id);
    return row ? { ...row } : null;
  }

  async list(
    options: TransactionRecordListOptions = {},
  ): Promise<TransactionRecord[]> {
    let rows = Array.from(this.rows.values());
    if (options.kind) rows = rows.filter((r) => r.kind === options.kind);
    if (options.demoInstanceId)
      rows = rows.filter((r) => r.demoInstanceId === options.demoInstanceId);
    if (options.brandId) rows = rows.filter((r) => r.brandId === options.brandId);
    if (options.parentTransactionId)
      rows = rows.filter(
        (r) => r.parentTransactionId === options.parentTransactionId,
      );
    if (options.state) {
      const states = Array.isArray(options.state)
        ? options.state
        : [options.state];
      rows = rows.filter((r) => states.includes(r.state));
    }
    return rows.map((r) => ({ ...r }));
  }

  async updateState(
    id: string,
    input: UpdateTransactionStateInput,
  ): Promise<TransactionRecord> {
    const row = this.rows.get(id);
    if (!row) throw new Error(`TransactionRecord not found: ${id}`);
    assertValidTransition(row.state, input.state);
    const next: TransactionRecord = {
      ...row,
      state: input.state,
      updatedAt: this.nowFn(),
    };
    this.rows.set(id, next);
    return { ...next };
  }

  async updatePayload(
    id: string,
    input: UpdateTransactionPayloadInput,
  ): Promise<TransactionRecord> {
    const row = this.rows.get(id);
    if (!row) throw new Error(`TransactionRecord not found: ${id}`);
    const next: TransactionRecord = {
      ...row,
      payload: input.payload !== undefined ? input.payload : row.payload,
      refs: input.refs !== undefined ? input.refs : row.refs,
      demoInstanceId:
        input.demoInstanceId !== undefined
          ? input.demoInstanceId
          : row.demoInstanceId,
      brandId: input.brandId !== undefined ? input.brandId : row.brandId,
      updatedAt: this.nowFn(),
    };
    this.rows.set(id, next);
    return { ...next };
  }

  async delete(id: string): Promise<void> {
    this.rows.delete(id);
  }
}

// ---------------------------------------------------------------------------
// Redis fake
// ---------------------------------------------------------------------------

export class FakeRedis implements MagicSendRedisClient {
  private store = new Map<string, string>();

  async set(
    key: string,
    value: string,
    options?: { nx?: boolean; ex?: number },
  ): Promise<string | null> {
    if (options?.nx && this.store.has(key)) {
      return null;
    }
    this.store.set(key, value);
    return "OK";
  }

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  snapshot(): Record<string, string> {
    return Object.fromEntries(this.store.entries());
  }
}

// ---------------------------------------------------------------------------
// Vault fake — records transfer calls; never touches a chain.
// ---------------------------------------------------------------------------

export class FakeVault implements VaultAdapter {
  public calls: VaultTransferRequest[] = [];
  private nextHash: `0x${string}` = "0xaaaa";
  private mode: "ok" | "throw" = "ok";
  private throwMsg = "fake-vault-failure";

  setNextHash(h: `0x${string}`): void {
    this.nextHash = h;
  }

  willThrow(msg = "fake-vault-failure"): void {
    this.mode = "throw";
    this.throwMsg = msg;
  }

  reset(): void {
    this.calls = [];
    this.mode = "ok";
  }

  async transfer(req: VaultTransferRequest): Promise<VaultTransferResult> {
    this.calls.push(req);
    if (this.mode === "throw") throw new Error(this.throwMsg);
    return { txHash: this.nextHash };
  }
}

// ---------------------------------------------------------------------------
// UserOp executor fake — records calls; never touches a bundler.
// ---------------------------------------------------------------------------

export class FakeUserOpExecutor implements UserOpExecutor {
  public calls: UserOpExecutorRequest[] = [];
  private nextHash: `0x${string}` = "0xbbbb";
  private mode: "ok" | "throw" = "ok";
  private throwMsg = "fake-userop-failure";

  setNextHash(h: `0x${string}`): void {
    this.nextHash = h;
  }

  willThrow(msg = "fake-userop-failure"): void {
    this.mode = "throw";
    this.throwMsg = msg;
  }

  reset(): void {
    this.calls = [];
    this.mode = "ok";
  }

  async send(req: UserOpExecutorRequest): Promise<UserOpExecutorResult> {
    this.calls.push(req);
    if (this.mode === "throw") throw new Error(this.throwMsg);
    return { bundleHash: this.nextHash };
  }
}
