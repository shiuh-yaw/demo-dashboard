/**
 * Postgres-backed TransactionRecordService (Prisma + Supabase via @dynamic-demos/db).
 *
 * The sole TransactionRecordService implementation (see services/index.ts);
 * behavioural coverage at `__tests__/transactions.postgres.test.ts`.
 *
 * State validation lives at this boundary: `assertValidTransition` from
 * `@dynamic-demos/transactions` runs before every state-mutating write
 * (D-010). The DB stores the canonical state string verbatim — never
 * widen acceptable values here.
 *
 * D-013: never opens its own connection — relies on the `prisma` singleton
 * from `@dynamic-demos/db`. D-015: only `apps/dashboard` imports the db
 * package; demo apps fetch via the dashboard API.
 */

import { prisma as defaultPrisma } from "@dynamic-demos/db";
import {
  TransactionState,
  assertValidTransition,
} from "@dynamic-demos/transactions";

import type {
  CreateTransactionRecordInput,
  TransactionRecord,
  TransactionRecordListOptions,
  TransactionRecordService,
  UpdateTransactionPayloadInput,
  UpdateTransactionStateInput,
} from "../types";

/**
 * Internal row shape returned by Prisma. Mirrors the `Transaction` model
 * exactly. Kept private — the service surface is `TransactionRecord`.
 */
interface TransactionRow {
  id: string;
  kind: string;
  state: string;
  demoInstanceId: string | null;
  prospectId: string | null;
  parentTransactionId: string | null;
  payload: unknown;
  refs: unknown;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Minimal subset of the Prisma client used by PostgresTransactionRecordService.
 * Lets unit tests inject an in-memory fake without dragging
 * `@prisma/client` into the test environment. The real client from
 * `@dynamic-demos/db` structurally satisfies this interface.
 */
export interface TransactionPrismaClient {
  transaction: {
    create(args: {
      data: {
        kind: string;
        state: string;
        demoInstanceId?: string | null;
        prospectId?: string | null;
        parentTransactionId?: string | null;
        payload: unknown;
        refs: unknown;
      };
    }): Promise<TransactionRow>;
    findUnique(args: {
      where: { id: string };
    }): Promise<TransactionRow | null>;
    findMany(args?: {
      where?: {
        demoInstanceId?: string;
        prospectId?: string;
        state?: string | { in: string[] };
        kind?: string;
        parentTransactionId?: string;
      };
      orderBy?: { createdAt?: "asc" | "desc" };
    }): Promise<TransactionRow[]>;
    update(args: {
      where: { id: string };
      data: Partial<{
        state: string;
        payload: unknown;
        refs: unknown;
        demoInstanceId: string | null;
        prospectId: string | null;
      }>;
    }): Promise<TransactionRow>;
    delete(args: { where: { id: string } }): Promise<TransactionRow>;
  };
}

function toTransactionRecord(row: TransactionRow): TransactionRecord {
  return {
    id: row.id,
    kind: row.kind,
    state: row.state as TransactionState,
    demoInstanceId: row.demoInstanceId,
    prospectId: row.prospectId,
    parentTransactionId: row.parentTransactionId,
    payload: row.payload,
    refs: row.refs,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PostgresTransactionRecordService
  implements TransactionRecordService
{
  private readonly client: TransactionPrismaClient;

  constructor(client?: TransactionPrismaClient) {
    this.client =
      client ?? (defaultPrisma as unknown as TransactionPrismaClient);
  }

  async create(
    input: CreateTransactionRecordInput,
  ): Promise<TransactionRecord> {
    const row = await this.client.transaction.create({
      data: {
        kind: input.kind,
        state: input.state ?? TransactionState.initialized,
        demoInstanceId: input.demoInstanceId ?? null,
        prospectId: input.prospectId ?? null,
        parentTransactionId: input.parentTransactionId ?? null,
        payload: input.payload ?? {},
        refs: input.refs ?? {},
      },
    });
    return toTransactionRecord(row);
  }

  async get(id: string): Promise<TransactionRecord | null> {
    const row = await this.client.transaction.findUnique({ where: { id } });
    return row ? toTransactionRecord(row) : null;
  }

  async list(
    options: TransactionRecordListOptions = {},
  ): Promise<TransactionRecord[]> {
    const where: NonNullable<
      Parameters<TransactionPrismaClient["transaction"]["findMany"]>[0]
    >["where"] = {};
    if (options.demoInstanceId) where.demoInstanceId = options.demoInstanceId;
    if (options.prospectId) where.prospectId = options.prospectId;
    if (options.kind) where.kind = options.kind;
    if (options.parentTransactionId)
      where.parentTransactionId = options.parentTransactionId;
    if (options.state) {
      where.state = Array.isArray(options.state)
        ? { in: options.state as string[] }
        : (options.state as string);
    }
    const rows = await this.client.transaction.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toTransactionRecord);
  }

  async updateState(
    id: string,
    input: UpdateTransactionStateInput,
  ): Promise<TransactionRecord> {
    const existing = await this.client.transaction.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new Error(`TransactionRecord not found: ${id}`);
    }
    // Boundary-validate every state change. `assertValidTransition` throws
    // `IllegalTransitionError` if `from → to` is not allowed; we let it
    // propagate so callers can distinguish illegal-from-other failures.
    assertValidTransition(
      existing.state as TransactionState,
      input.state,
    );
    const row = await this.client.transaction.update({
      where: { id },
      data: { state: input.state },
    });
    return toTransactionRecord(row);
  }

  async updatePayload(
    id: string,
    input: UpdateTransactionPayloadInput,
  ): Promise<TransactionRecord> {
    const data: Parameters<
      TransactionPrismaClient["transaction"]["update"]
    >[0]["data"] = {};
    if (input.payload !== undefined) data.payload = input.payload;
    if (input.refs !== undefined) data.refs = input.refs;
    if (input.demoInstanceId !== undefined)
      data.demoInstanceId = input.demoInstanceId;
    if (input.prospectId !== undefined) data.prospectId = input.prospectId;
    const row = await this.client.transaction.update({
      where: { id },
      data,
    });
    return toTransactionRecord(row);
  }

  async delete(id: string): Promise<void> {
    await this.client.transaction.delete({ where: { id } });
  }
}
