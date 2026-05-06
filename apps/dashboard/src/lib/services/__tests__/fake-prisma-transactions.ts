/**
 * Minimal in-memory fake for the prisma.transaction and prisma.webhookEvent
 * delegates used by `PostgresTransactionRecordService` and
 * `PostgresWebhookEventService`.
 *
 * Why a hand-rolled fake instead of the real PrismaClient?
 *   The Postgres services depend on a small slice of each delegate. Mocking
 *   that surface is a few hundred lines and avoids pulling Prisma + a real
 *   Postgres instance into a unit test. Real-database integration tests
 *   belong in a separate suite (out of scope for this PR — covered by the
 *   `db-migration-dryrun` CI job that applies the migration to a fresh
 *   Postgres container).
 *
 * The shape here matches the `TransactionPrismaClient` /
 * `WebhookEventPrismaClient` interfaces exactly, so structural typing
 * keeps the fake honest.
 */

import type {
  TransactionPrismaClient,
} from "../postgres/transactions";
import type {
  WebhookEventPrismaClient,
} from "../postgres/webhook-events";

interface TransactionRow {
  id: string;
  kind: string;
  state: string;
  demoInstanceId: string | null;
  brandId: string | null;
  parentTransactionId: string | null;
  payload: unknown;
  refs: unknown;
  createdAt: Date;
  updatedAt: Date;
}

interface WebhookEventRow {
  id: string;
  provider: string;
  providerEventId: string;
  eventType: string;
  occurredAt: Date;
  receivedAt: Date;
  signatureValid: boolean;
  rawPayload: unknown;
  normalizedPayload: unknown;
  transactionId: string | null;
  demoInstanceId: string | null;
  brandId: string | null;
  processingStatus: string;
  processingError: string | null;
  processedAt: Date | null;
}

/**
 * Mimic Prisma's "P2002" error so the service-layer's
 * `DuplicateWebhookEventError` translation is exercised by the parity
 * suite without depending on the real `PrismaClientKnownRequestError`.
 */
class FakePrismaUniqueViolation extends Error {
  public readonly code = "P2002";
  constructor(target: string) {
    super(`Unique constraint failed on ${target}`);
    this.name = "PrismaClientKnownRequestError";
  }
}

export interface FakeTransactionPrismaClient
  extends TransactionPrismaClient,
    WebhookEventPrismaClient {}

export function createFakeTransactionPrisma(): FakeTransactionPrismaClient {
  const transactions = new Map<string, TransactionRow>();
  const webhookEvents = new Map<string, WebhookEventRow>();
  let txCounter = 0;
  let weCounter = 0;
  const nextTxId = () => `tx_${++txCounter}`;
  const nextWeId = () => `we_${++weCounter}`;
  const now = () => new Date();

  return {
    transaction: {
      async create({ data }) {
        const id = nextTxId();
        const ts = now();
        const row: TransactionRow = {
          id,
          kind: data.kind,
          state: data.state,
          demoInstanceId: data.demoInstanceId ?? null,
          brandId: data.brandId ?? null,
          parentTransactionId: data.parentTransactionId ?? null,
          payload: data.payload,
          refs: data.refs,
          createdAt: ts,
          updatedAt: ts,
        };
        transactions.set(id, row);
        return { ...row };
      },
      async findUnique({ where }) {
        const row = transactions.get(where.id);
        return row ? { ...row } : null;
      },
      async findMany(args) {
        let rows = Array.from(transactions.values());
        const where = args?.where;
        if (where?.demoInstanceId !== undefined) {
          rows = rows.filter((r) => r.demoInstanceId === where.demoInstanceId);
        }
        if (where?.brandId !== undefined) {
          rows = rows.filter((r) => r.brandId === where.brandId);
        }
        if (where?.kind !== undefined) {
          rows = rows.filter((r) => r.kind === where.kind);
        }
        if (where?.parentTransactionId !== undefined) {
          rows = rows.filter(
            (r) => r.parentTransactionId === where.parentTransactionId,
          );
        }
        if (where?.state !== undefined) {
          if (typeof where.state === "string") {
            rows = rows.filter((r) => r.state === where.state);
          } else if ("in" in where.state) {
            const states = where.state.in;
            rows = rows.filter((r) => states.includes(r.state));
          }
        }
        rows.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        if (args?.orderBy?.createdAt === "desc") rows.reverse();
        return rows.map((r) => ({ ...r }));
      },
      async update({ where, data }) {
        const existing = transactions.get(where.id);
        if (!existing) {
          throw new Error(`Record to update not found. id=${where.id}`);
        }
        const updated: TransactionRow = {
          ...existing,
          ...Object.fromEntries(
            Object.entries(data).filter(([, v]) => v !== undefined),
          ),
          updatedAt: now(),
        } as TransactionRow;
        transactions.set(where.id, updated);
        return { ...updated };
      },
      async delete({ where }) {
        const existing = transactions.get(where.id);
        if (!existing) {
          throw new Error(`Record to delete not found. id=${where.id}`);
        }
        transactions.delete(where.id);
        return { ...existing };
      },
    },
    webhookEvent: {
      async create({ data }) {
        // Enforce the (provider, providerEventId) unique constraint.
        for (const r of webhookEvents.values()) {
          if (
            r.provider === data.provider &&
            r.providerEventId === data.providerEventId
          ) {
            throw new FakePrismaUniqueViolation(
              "WebhookEvent_provider_providerEventId_key",
            );
          }
        }
        const id = nextWeId();
        const ts = now();
        const row: WebhookEventRow = {
          id,
          provider: data.provider,
          providerEventId: data.providerEventId,
          eventType: data.eventType,
          occurredAt: data.occurredAt,
          receivedAt: ts,
          signatureValid: data.signatureValid,
          rawPayload: data.rawPayload,
          normalizedPayload: data.normalizedPayload,
          transactionId: data.transactionId ?? null,
          demoInstanceId: data.demoInstanceId ?? null,
          brandId: data.brandId ?? null,
          processingStatus: data.processingStatus ?? "pending",
          processingError: null,
          processedAt: null,
        };
        webhookEvents.set(id, row);
        return { ...row };
      },
      async findUnique(args) {
        if ("id" in args.where) {
          const row = webhookEvents.get(args.where.id);
          return row ? { ...row } : null;
        }
        const { provider, providerEventId } =
          args.where.provider_providerEventId;
        for (const r of webhookEvents.values()) {
          if (r.provider === provider && r.providerEventId === providerEventId) {
            return { ...r };
          }
        }
        return null;
      },
      async findMany(args) {
        let rows = Array.from(webhookEvents.values());
        const where = args?.where;
        if (where?.provider) rows = rows.filter((r) => r.provider === where.provider);
        if (where?.transactionId !== undefined) {
          rows = rows.filter((r) => r.transactionId === where.transactionId);
        }
        if (where?.processingStatus) {
          rows = rows.filter(
            (r) => r.processingStatus === where.processingStatus,
          );
        }
        if (where?.receivedAt?.gte) {
          const gte = where.receivedAt.gte.getTime();
          rows = rows.filter((r) => r.receivedAt.getTime() >= gte);
        }
        if (where?.receivedAt?.lte) {
          const lte = where.receivedAt.lte.getTime();
          rows = rows.filter((r) => r.receivedAt.getTime() <= lte);
        }
        rows.sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());
        if (args?.orderBy?.receivedAt === "desc") rows.reverse();
        return rows.map((r) => ({ ...r }));
      },
      async update({ where, data }) {
        const existing = webhookEvents.get(where.id);
        if (!existing) {
          throw new Error(`Record to update not found. id=${where.id}`);
        }
        const updated: WebhookEventRow = {
          ...existing,
          ...Object.fromEntries(
            Object.entries(data).filter(([, v]) => v !== undefined),
          ),
        } as WebhookEventRow;
        webhookEvents.set(where.id, updated);
        return { ...updated };
      },
    },
  };
}
