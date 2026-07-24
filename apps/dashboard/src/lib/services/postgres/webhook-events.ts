/**
 * Postgres-backed WebhookEventService (Prisma + Supabase via @dynamic-demos/db).
 *
 * Postgres-only by design: the webhook audit trail must be durable from
 * day one (D-011). Requires `DATABASE_URL` populated.
 *
 * Dedup primitive: a unique index on `(provider, providerEventId)` lets
 * the receiver call `create` blindly and catch `DuplicateWebhookEventError`
 * to short-circuit retries without a separate "exists" round-trip.
 */

import { prisma as defaultPrisma } from "@dynamic-demos/db";

import {
  DuplicateWebhookEventError,
  type CreateWebhookEventInput,
  type MarkWebhookEventProcessedInput,
  type WebhookEventListOptions,
  type WebhookEventRecord,
  type WebhookEventService,
  type WebhookProcessingStatus,
} from "../types";

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
  prospectId: string | null;
  processingStatus: string;
  processingError: string | null;
  processedAt: Date | null;
}

/**
 * Minimal subset of the Prisma client used by this service. Lets unit
 * tests inject an in-memory fake. The real client structurally satisfies
 * this interface.
 */
export interface WebhookEventPrismaClient {
  webhookEvent: {
    create(args: {
      data: {
        provider: string;
        providerEventId: string;
        eventType: string;
        occurredAt: Date;
        signatureValid: boolean;
        rawPayload: unknown;
        normalizedPayload: unknown;
        transactionId?: string | null;
        demoInstanceId?: string | null;
        prospectId?: string | null;
        processingStatus?: string;
      };
    }): Promise<WebhookEventRow>;
    findUnique(
      args:
        | { where: { id: string } }
        | {
            where: {
              provider_providerEventId: {
                provider: string;
                providerEventId: string;
              };
            };
          },
    ): Promise<WebhookEventRow | null>;
    findMany(args?: {
      where?: {
        provider?: string;
        transactionId?: string;
        processingStatus?: string;
        receivedAt?: { gte?: Date; lte?: Date };
      };
      orderBy?: { receivedAt?: "asc" | "desc" };
    }): Promise<WebhookEventRow[]>;
    update(args: {
      where: { id: string };
      data: Partial<{
        processingStatus: string;
        processingError: string | null;
        processedAt: Date | null;
      }>;
    }): Promise<WebhookEventRow>;
  };
}

function toWebhookEvent(row: WebhookEventRow): WebhookEventRecord {
  return {
    id: row.id,
    provider: row.provider,
    providerEventId: row.providerEventId,
    eventType: row.eventType,
    occurredAt: row.occurredAt,
    receivedAt: row.receivedAt,
    signatureValid: row.signatureValid,
    rawPayload: row.rawPayload,
    normalizedPayload: row.normalizedPayload,
    transactionId: row.transactionId,
    demoInstanceId: row.demoInstanceId,
    prospectId: row.prospectId,
    processingStatus: row.processingStatus as WebhookProcessingStatus,
    processingError: row.processingError,
    processedAt: row.processedAt,
  };
}

/**
 * Detect Prisma's "unique constraint failed" error without dragging the
 * full `PrismaClientKnownRequestError` runtime into the service file.
 * Code `P2002` is documented in the Prisma error reference — checking by
 * `code` is robust to message-copy changes across Prisma versions.
 */
function isUniqueConstraintError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const code = (err as { code?: unknown }).code;
  return code === "P2002";
}

export class PostgresWebhookEventService implements WebhookEventService {
  private readonly client: WebhookEventPrismaClient;

  constructor(client?: WebhookEventPrismaClient) {
    this.client =
      client ?? (defaultPrisma as unknown as WebhookEventPrismaClient);
  }

  async create(input: CreateWebhookEventInput): Promise<WebhookEventRecord> {
    try {
      const row = await this.client.webhookEvent.create({
        data: {
          provider: input.provider,
          providerEventId: input.providerEventId,
          eventType: input.eventType,
          occurredAt: input.occurredAt,
          signatureValid: input.signatureValid,
          rawPayload: input.rawPayload,
          normalizedPayload: input.normalizedPayload,
          transactionId: input.transactionId ?? null,
          demoInstanceId: input.demoInstanceId ?? null,
          prospectId: input.prospectId ?? null,
          processingStatus: input.processingStatus ?? "pending",
        },
      });
      return toWebhookEvent(row);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new DuplicateWebhookEventError(
          input.provider,
          input.providerEventId,
        );
      }
      throw err;
    }
  }

  async get(id: string): Promise<WebhookEventRecord | null> {
    const row = await this.client.webhookEvent.findUnique({ where: { id } });
    return row ? toWebhookEvent(row) : null;
  }

  async findByProviderEvent(
    provider: string,
    providerEventId: string,
  ): Promise<WebhookEventRecord | null> {
    const row = await this.client.webhookEvent.findUnique({
      where: { provider_providerEventId: { provider, providerEventId } },
    });
    return row ? toWebhookEvent(row) : null;
  }

  async list(
    options: WebhookEventListOptions = {},
  ): Promise<WebhookEventRecord[]> {
    const where: NonNullable<
      Parameters<WebhookEventPrismaClient["webhookEvent"]["findMany"]>[0]
    >["where"] = {};
    if (options.provider) where.provider = options.provider;
    if (options.transactionId) where.transactionId = options.transactionId;
    if (options.processingStatus)
      where.processingStatus = options.processingStatus;
    if (options.receivedAfter || options.receivedBefore) {
      where.receivedAt = {};
      if (options.receivedAfter) where.receivedAt.gte = options.receivedAfter;
      if (options.receivedBefore) where.receivedAt.lte = options.receivedBefore;
    }
    const rows = await this.client.webhookEvent.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { receivedAt: "asc" },
    });
    return rows.map(toWebhookEvent);
  }

  async markProcessed(
    id: string,
    input: MarkWebhookEventProcessedInput,
  ): Promise<WebhookEventRecord> {
    const row = await this.client.webhookEvent.update({
      where: { id },
      data: {
        processingStatus: input.processingStatus,
        processingError: input.processingError ?? null,
        processedAt: input.processedAt ?? new Date(),
      },
    });
    return toWebhookEvent(row);
  }
}
