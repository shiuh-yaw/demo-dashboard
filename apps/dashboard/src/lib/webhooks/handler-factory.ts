/**
 * Generic webhook receiver framework (Phase 5A, D-011).
 *
 * Composes the standard receiver pipeline once so each provider's route
 * handler stays a few lines:
 *
 *   1. Rate limit (optional). Reject with 429 before any work.
 *   2. Capture raw body bytes. Some providers sign the bytes verbatim.
 *   3. Verify signature against the provider's secret. Throws → 401.
 *      Bad signatures are an attack signal — log under
 *      `[security:webhook-signature-failure]` for SIEM ingestion.
 *   4. Parse + normalize via provider-supplied callbacks.
 *   5. Dedup via Redis SETNX (TTL=7d). Duplicate → 200 ack, no DB write.
 *   6. Persist via `WebhookEventService.create`. The DB unique
 *      `(provider, providerEventId)` is the durable dedup; if Redis
 *      missed (cold cache, eviction) and a duplicate slips through,
 *      the service throws `DuplicateWebhookEventError` and we still
 *      ack with 200.
 *   7. Optionally advance the referenced transaction's state via
 *      `assertValidTransition` then `transactionRecordService.updateState`.
 *      Illegal transitions are persisted as `processingStatus=failed`
 *      with the error message — provider still sees a 200 ack so it
 *      doesn't keep retrying a delivery we've decided not to honor.
 *   8. Mark the event row as `processed` / `ignored` / `failed`.
 *   9. Return 200 fast. Heavy reconciliation (when needed) is fanned
 *      out via QStash from outside this framework.
 *
 * Errors past signature verification surface as 500 so the provider
 * retries; 401/429 are intentional rejections.
 */

import { TransactionState } from "@dynamic-demos/transactions";
import { IllegalTransitionError } from "@dynamic-demos/transactions";

import {
  DuplicateWebhookEventError as DuplicateRedisError,
  dedupOrThrow,
  type WebhookDedupClient,
} from "./idempotency";
import type { CanonicalWebhookEvent, WebhookLogger } from "./types";
import {
  DuplicateWebhookEventError as DuplicateDbError,
  type TransactionRecordService,
  type WebhookEventService,
} from "@/lib/services/types";

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

/** Minimal Ratelimit-like surface so we don't depend on `@upstash/ratelimit` here. */
export interface WebhookRateLimiter {
  limit(identifier: string): Promise<{ success: boolean }>;
}

/**
 * Verify the request's signature. Implementations MUST throw on failure
 * (missing headers, bad timestamp, no matching signature). The framework
 * swallows the throw and returns 401.
 */
export type VerifySignatureFn = (input: {
  body: string;
  headers: Headers;
  secret: string;
}) => void | Promise<void>;

/** Translate the parsed payload into the framework's canonical shape. */
export type NormalizeFn = (input: {
  body: unknown;
  headers: Headers;
}) => CanonicalWebhookEvent | Promise<CanonicalWebhookEvent>;

export interface CreateWebhookHandlerOptions {
  /** Stable provider key. Used for dedup namespace, logging, DB column. */
  provider: string;
  /** Provider-supplied webhook secret (read from env in route files). */
  secret: string;
  verifySignature: VerifySignatureFn;
  normalize: NormalizeFn;
  webhookEventService: WebhookEventService;
  transactionRecordService: TransactionRecordService;
  redis: WebhookDedupClient;
  /**
   * Optional rate limit. When present the limiter is consulted before any
   * other work; rejected calls return 429 without touching the body.
   */
  rateLimit?: {
    /** Compute the limiter identifier (typically remote IP). */
    identifier: (req: Request) => string;
    limiter: WebhookRateLimiter;
  };
  logger?: WebhookLogger;
}

export type WebhookHandler = (req: Request) => Promise<Response>;

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

const DEFAULT_LOGGER: WebhookLogger = {
  info: (line) => console.info(line),
  error: (line, err) => {
    if (err !== undefined) console.error(line, err);
    else console.error(line);
  },
};

export function createWebhookHandler(
  opts: CreateWebhookHandlerOptions,
): WebhookHandler {
  const {
    provider,
    secret,
    verifySignature,
    normalize,
    webhookEventService,
    transactionRecordService,
    redis,
    rateLimit,
    logger = DEFAULT_LOGGER,
  } = opts;

  return async function handle(req: Request): Promise<Response> {
    const startedAt = Date.now();

    // 1. Rate limit (optional)
    if (rateLimit) {
      const id = rateLimit.identifier(req);
      const result = await rateLimit.limiter.limit(id);
      if (!result.success) {
        logger.info(
          `[webhook:${provider}] rate-limited identifier=${id} durMs=${Date.now() - startedAt}`,
        );
        return new Response("Too many requests", { status: 429 });
      }
    }

    // 2. Capture raw body bytes (Web streams: read once)
    const rawBody = await req.text();

    // 3. Verify signature
    try {
      await verifySignature({ body: rawBody, headers: req.headers, secret });
    } catch (err) {
      logger.error(
        `[security:webhook-signature-failure] provider=${provider} reason=${stringifyErr(err)}`,
        err,
      );
      return new Response("Invalid signature", { status: 401 });
    }

    // 4. Parse + normalize
    let parsed: unknown;
    try {
      parsed = rawBody.length === 0 ? {} : JSON.parse(rawBody);
    } catch (err) {
      logger.error(
        `[webhook:${provider}] invalid-json reason=${stringifyErr(err)}`,
        err,
      );
      return new Response("Invalid JSON", { status: 400 });
    }

    let canonical: CanonicalWebhookEvent;
    try {
      canonical = await normalize({ body: parsed, headers: req.headers });
    } catch (err) {
      logger.error(
        `[webhook:${provider}] normalize-failed reason=${stringifyErr(err)}`,
        err,
      );
      return new Response("Cannot normalize event", { status: 400 });
    }

    // 5. Redis SETNX dedup. Duplicate inside the 7d window → 200 ack.
    try {
      await dedupOrThrow(redis, provider, canonical.providerEventId);
    } catch (err) {
      if (err instanceof DuplicateRedisError) {
        logger.info(
          `[webhook:${provider}] received eventId=${canonical.providerEventId} type=${canonical.eventType} dedup=true durMs=${Date.now() - startedAt} signatureValid=true status=processed`,
        );
        return new Response("Duplicate (acked)", { status: 200 });
      }
      logger.error(
        `[webhook:${provider}] redis-dedup-failed reason=${stringifyErr(err)}`,
        err,
      );
      // Fall through — DB unique constraint still protects us.
    }

    // 6. Persist the event row
    let eventId: string;
    try {
      const created = await webhookEventService.create({
        provider,
        providerEventId: canonical.providerEventId,
        eventType: canonical.eventType,
        occurredAt: canonical.occurredAt,
        signatureValid: true,
        rawPayload: canonical.rawPayload,
        normalizedPayload: canonical.normalizedPayload,
        transactionId: canonical.transactionId ?? null,
        demoInstanceId: canonical.demoInstanceId ?? null,
        brandId: canonical.brandId ?? null,
      });
      eventId = created.id;
    } catch (err) {
      if (err instanceof DuplicateDbError) {
        // Redis missed but DB caught the duplicate. Ack and move on.
        logger.info(
          `[webhook:${provider}] received eventId=${canonical.providerEventId} type=${canonical.eventType} dedup=true durMs=${Date.now() - startedAt} signatureValid=true status=processed`,
        );
        return new Response("Duplicate (acked)", { status: 200 });
      }
      logger.error(
        `[webhook:${provider}] persist-failed reason=${stringifyErr(err)}`,
        err,
      );
      return new Response("Persist failed", { status: 500 });
    }

    // 7. Route — advance transaction state if applicable
    let processingStatus: "processed" | "ignored" | "failed" = "processed";
    let processingError: string | null = null;

    if (!canonical.transactionId) {
      // No matching local transaction. Persist for audit, do nothing else.
      processingStatus = "ignored";
    } else if (canonical.canonicalState === null) {
      // Transaction-shaped event but the normalizer couldn't map a state
      // (e.g. KYC update). Still treat as processed; no transition needed.
      processingStatus = "processed";
    } else {
      try {
        await transactionRecordService.updateState(canonical.transactionId, {
          state: canonical.canonicalState,
        });
      } catch (err) {
        if (err instanceof IllegalTransitionError) {
          processingStatus = "failed";
          processingError = err.message;
          logger.error(
            `[webhook:${provider}] illegal-transition transactionId=${canonical.transactionId} from=${err.from} to=${err.to}`,
            err,
          );
        } else {
          processingStatus = "failed";
          processingError = stringifyErr(err);
          logger.error(
            `[webhook:${provider}] transition-failed transactionId=${canonical.transactionId} reason=${stringifyErr(err)}`,
            err,
          );
        }
      }
    }

    // 8. Mark the event row processed/ignored/failed
    try {
      await webhookEventService.markProcessed(eventId, {
        processingStatus,
        processingError,
      });
    } catch (err) {
      logger.error(
        `[webhook:${provider}] mark-processed-failed eventId=${eventId} reason=${stringifyErr(err)}`,
        err,
      );
      // Don't 500 here — the event row exists and will be reconciled
      // by the audit query. Provider still gets a successful ack.
    }

    logger.info(
      `[webhook:${provider}] received eventId=${canonical.providerEventId} type=${canonical.eventType} dedup=false durMs=${Date.now() - startedAt} signatureValid=true status=${processingStatus}`,
    );

    return new Response("OK", { status: 200 });
  };
}

function stringifyErr(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

// Re-export `TransactionState` so route files can import the canonical
// machine without pulling `@dynamic-demos/transactions` directly. Avoids
// drift between provider routes.
export { TransactionState };
