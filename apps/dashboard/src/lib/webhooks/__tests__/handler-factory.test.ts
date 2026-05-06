/**
 * Fixture-replay tests for the generic webhook handler factory.
 *
 * Covers all six branches called out in the Phase 5A acceptance criteria:
 *   1. Valid signature + new event → 200, WebhookEvent row created,
 *      transaction state advanced.
 *   2. Valid signature + duplicate event (Redis SETNX hit) → 200, no
 *      new row.
 *   3. Invalid signature → 401, no row.
 *   4. Rate-limit exceeded → 429.
 *   5. Unrouted (no matching transaction) → 200, row with
 *      processingStatus=ignored.
 *   6. Illegal state transition → 200, row with processingStatus=failed,
 *      `processingError` populated.
 *
 * Tests replay a real-shape BlindPay `payout.complete` payload signed with
 * a test secret, but the framework itself is provider-agnostic.
 */

import { createHmac } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { TransactionState } from "@dynamic-demos/transactions";

import { PostgresTransactionRecordService } from "@/lib/services/postgres/transactions";
import { PostgresWebhookEventService } from "@/lib/services/postgres/webhook-events";
import { createFakeTransactionPrisma } from "@/lib/services/__tests__/fake-prisma-transactions";

import { createWebhookHandler } from "../handler-factory";
import type { CanonicalWebhookEvent } from "../types";
import type { WebhookDedupClient } from "../idempotency";

// ---------------------------------------------------------------------------
// Test infrastructure
// ---------------------------------------------------------------------------

const TEST_SECRET = "whsec_dGVzdC1zZWNyZXQ"; // base64("test-secret")

function createFakeRedis(): WebhookDedupClient {
  const store = new Map<string, string>();
  return {
    async set(key, value, options) {
      if (options?.nx && store.has(key)) return null;
      store.set(key, value);
      return "OK";
    },
  };
}

function buildSignature(
  body: string,
  messageId: string,
  timestamp: string,
  secretBase64: string,
): string {
  const key = Buffer.from(secretBase64, "base64");
  const signed = `${messageId}.${timestamp}.${body}`;
  const digest = createHmac("sha256", key).update(signed).digest("base64");
  return `v1,${digest}`;
}

interface BuildRequestOpts {
  body: unknown;
  messageId?: string;
  timestamp?: string;
  signature?: string;
  // When set, signs the body with the wrong secret.
  badSignature?: boolean;
}

function buildRequest({
  body,
  messageId = "evt_test_1",
  timestamp = String(Math.floor(Date.now() / 1000)),
  signature,
  badSignature,
}: BuildRequestOpts): Request {
  const raw = JSON.stringify(body);
  const secret = badSignature
    ? "whsec_d3Jvbmctc2VjcmV0" // base64("wrong-secret")
    : TEST_SECRET.replace(/^whsec_/, "");
  const sig = signature ?? buildSignature(raw, messageId, timestamp, secret);
  return new Request("http://localhost/api/webhooks/test", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "svix-id": messageId,
      "svix-timestamp": timestamp,
      "svix-signature": sig,
    },
    body: raw,
  });
}

interface HandlerHarness {
  prisma: ReturnType<typeof createFakeTransactionPrisma>;
  webhookEventService: PostgresWebhookEventService;
  transactionRecordService: PostgresTransactionRecordService;
  redis: WebhookDedupClient;
  errors: unknown[];
  infos: unknown[];
}

function createHarness(): HandlerHarness {
  const prisma = createFakeTransactionPrisma();
  return {
    prisma,
    webhookEventService: new PostgresWebhookEventService(prisma),
    transactionRecordService: new PostgresTransactionRecordService(prisma),
    redis: createFakeRedis(),
    errors: [],
    infos: [],
  };
}

interface TestNormalizeArgs {
  body: unknown;
  headers: Headers;
}

function testVerifySignature({ body, headers, secret }: {
  body: string;
  headers: Headers;
  secret: string;
}): void {
  const id = headers.get("svix-id");
  const ts = headers.get("svix-timestamp");
  const sigHeader = headers.get("svix-signature");
  if (!id || !ts || !sigHeader) {
    throw new Error("missing svix headers");
  }
  const expected = buildSignature(
    body,
    id,
    ts,
    secret.replace(/^whsec_/, ""),
  );
  if (sigHeader.trim() !== expected) {
    throw new Error("signature mismatch");
  }
}

function testNormalize(
  { body, headers }: TestNormalizeArgs,
): CanonicalWebhookEvent {
  const payload = body as {
    type?: string;
    data?: { id?: string; status?: string; transactionId?: string };
  };
  const messageId = headers.get("svix-id") ?? "";
  const timestamp = Number(headers.get("svix-timestamp") ?? 0);
  const status = payload.data?.status ?? null;
  return {
    providerEventId: messageId,
    eventType: payload.type ?? "unknown",
    occurredAt: new Date(timestamp * 1000),
    rawPayload: body,
    normalizedPayload: payload,
    resourceId: payload.data?.id ?? null,
    transactionId: payload.data?.transactionId ?? null,
    canonicalState: mapStatus(status),
  };
}

function mapStatus(status: string | null): TransactionState | null {
  if (!status) return null;
  switch (status) {
    case "submitted":
      return TransactionState.submitted;
    case "pending":
      return TransactionState.pending;
    case "completed":
      return TransactionState.confirmed;
    case "failed":
      return TransactionState.failed;
    case "cancelled":
      return TransactionState.cancelled;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createWebhookHandler", () => {
  it("returns 200, persists the event, and advances transaction state on a valid new event", async () => {
    const harness = createHarness();
    const tx = await harness.transactionRecordService.create({
      kind: "payout",
      state: TransactionState.submitted,
    });

    const handler = createWebhookHandler({
      provider: "blindpay",
      secret: TEST_SECRET,
      verifySignature: testVerifySignature,
      normalize: testNormalize,
      webhookEventService: harness.webhookEventService,
      transactionRecordService: harness.transactionRecordService,
      redis: harness.redis,
      logger: {
        info: (line) => harness.infos.push(line),
        error: (line) => harness.errors.push(line),
      },
    });

    const req = buildRequest({
      body: {
        type: "payout.complete",
        data: { id: "po_1", status: "pending", transactionId: tx.id },
      },
    });

    const res = await handler(req);
    expect(res.status).toBe(200);

    const events = await harness.webhookEventService.list();
    expect(events).toHaveLength(1);
    expect(events[0]!.signatureValid).toBe(true);
    expect(events[0]!.processingStatus).toBe("processed");
    expect(events[0]!.transactionId).toBe(tx.id);

    const after = await harness.transactionRecordService.get(tx.id);
    expect(after!.state).toBe(TransactionState.pending);
  });

  it("acks duplicate deliveries with 200 and does not create a second WebhookEvent row", async () => {
    const harness = createHarness();
    const tx = await harness.transactionRecordService.create({
      kind: "payout",
      state: TransactionState.submitted,
    });

    const handler = createWebhookHandler({
      provider: "blindpay",
      secret: TEST_SECRET,
      verifySignature: testVerifySignature,
      normalize: testNormalize,
      webhookEventService: harness.webhookEventService,
      transactionRecordService: harness.transactionRecordService,
      redis: harness.redis,
      logger: {
        info: (line) => harness.infos.push(line),
        error: (line) => harness.errors.push(line),
      },
    });

    const req1 = buildRequest({
      body: {
        type: "payout.complete",
        data: { id: "po_1", status: "pending", transactionId: tx.id },
      },
      messageId: "evt_dup_1",
    });
    const res1 = await handler(req1);
    expect(res1.status).toBe(200);

    // Same event id replays. Build a fresh Request because Request bodies
    // are single-shot in Web Streams.
    const req2 = buildRequest({
      body: {
        type: "payout.complete",
        data: { id: "po_1", status: "pending", transactionId: tx.id },
      },
      messageId: "evt_dup_1",
    });
    const res2 = await handler(req2);
    expect(res2.status).toBe(200);

    const events = await harness.webhookEventService.list();
    expect(events).toHaveLength(1);
  });

  it("returns 401 and does not persist anything when signature is invalid", async () => {
    const harness = createHarness();

    const handler = createWebhookHandler({
      provider: "blindpay",
      secret: TEST_SECRET,
      verifySignature: testVerifySignature,
      normalize: testNormalize,
      webhookEventService: harness.webhookEventService,
      transactionRecordService: harness.transactionRecordService,
      redis: harness.redis,
      logger: {
        info: (line) => harness.infos.push(line),
        error: (line) => harness.errors.push(line),
      },
    });

    const req = buildRequest({
      body: { type: "payout.complete", data: { id: "po_1", status: "pending" } },
      badSignature: true,
    });

    const res = await handler(req);
    expect(res.status).toBe(401);

    const events = await harness.webhookEventService.list();
    expect(events).toHaveLength(0);

    // Security alert path is exercised on bad signatures.
    expect(harness.errors.some((e) =>
      typeof e === "string" && e.includes("[security:webhook-signature-failure]"),
    )).toBe(true);
  });

  it("returns 429 when the rate limiter rejects the request", async () => {
    const harness = createHarness();

    const limit = vi.fn(async () => ({ success: false }));

    const handler = createWebhookHandler({
      provider: "blindpay",
      secret: TEST_SECRET,
      verifySignature: testVerifySignature,
      normalize: testNormalize,
      webhookEventService: harness.webhookEventService,
      transactionRecordService: harness.transactionRecordService,
      redis: harness.redis,
      rateLimit: {
        identifier: () => "test-ip",
        limiter: { limit },
      },
      logger: {
        info: (line) => harness.infos.push(line),
        error: (line) => harness.errors.push(line),
      },
    });

    const req = buildRequest({
      body: { type: "payout.complete", data: { id: "po_1", status: "pending" } },
    });
    const res = await handler(req);
    expect(res.status).toBe(429);

    expect(limit).toHaveBeenCalledWith("test-ip");
    const events = await harness.webhookEventService.list();
    expect(events).toHaveLength(0);
  });

  it("persists with processingStatus=ignored when no transaction matches", async () => {
    const harness = createHarness();

    const handler = createWebhookHandler({
      provider: "blindpay",
      secret: TEST_SECRET,
      verifySignature: testVerifySignature,
      normalize: testNormalize,
      webhookEventService: harness.webhookEventService,
      transactionRecordService: harness.transactionRecordService,
      redis: harness.redis,
      logger: {
        info: (line) => harness.infos.push(line),
        error: (line) => harness.errors.push(line),
      },
    });

    const req = buildRequest({
      body: {
        type: "payout.complete",
        // Note: no transactionId in payload — receiver cannot resolve.
        data: { id: "po_unmatched", status: "pending" },
      },
    });

    const res = await handler(req);
    expect(res.status).toBe(200);

    const events = await harness.webhookEventService.list();
    expect(events).toHaveLength(1);
    expect(events[0]!.processingStatus).toBe("ignored");
    expect(events[0]!.transactionId).toBeNull();
  });

  it("persists with processingStatus=failed when the canonical transition is illegal", async () => {
    const harness = createHarness();
    // Transaction is already terminal; any further state assignment is illegal.
    const tx = await harness.transactionRecordService.create({
      kind: "payout",
      state: TransactionState.confirmed,
    });

    const handler = createWebhookHandler({
      provider: "blindpay",
      secret: TEST_SECRET,
      verifySignature: testVerifySignature,
      normalize: testNormalize,
      webhookEventService: harness.webhookEventService,
      transactionRecordService: harness.transactionRecordService,
      redis: harness.redis,
      logger: {
        info: (line) => harness.infos.push(line),
        error: (line) => harness.errors.push(line),
      },
    });

    const req = buildRequest({
      body: {
        type: "payout.failed",
        data: { id: "po_terminal", status: "failed", transactionId: tx.id },
      },
    });

    const res = await handler(req);
    // Provider sees ack — illegal transition is our problem, not theirs.
    expect(res.status).toBe(200);

    const events = await harness.webhookEventService.list();
    expect(events).toHaveLength(1);
    expect(events[0]!.processingStatus).toBe("failed");
    expect(events[0]!.processingError).toMatch(/Illegal transition/);

    // Transaction state must NOT have moved — terminal stays terminal.
    const after = await harness.transactionRecordService.get(tx.id);
    expect(after!.state).toBe(TransactionState.confirmed);
  });

  it("structured info log on success contains provider + eventId + dedup + status", async () => {
    const harness = createHarness();
    const tx = await harness.transactionRecordService.create({
      kind: "payout",
      state: TransactionState.submitted,
    });

    const handler = createWebhookHandler({
      provider: "blindpay",
      secret: TEST_SECRET,
      verifySignature: testVerifySignature,
      normalize: testNormalize,
      webhookEventService: harness.webhookEventService,
      transactionRecordService: harness.transactionRecordService,
      redis: harness.redis,
      logger: {
        info: (line) => harness.infos.push(line),
        error: (line) => harness.errors.push(line),
      },
    });

    const req = buildRequest({
      body: {
        type: "payout.complete",
        data: { id: "po_1", status: "pending", transactionId: tx.id },
      },
      messageId: "evt_log_1",
    });
    const res = await handler(req);
    expect(res.status).toBe(200);

    const matched = harness.infos.find(
      (line) =>
        typeof line === "string" &&
        line.includes("[webhook:blindpay]") &&
        line.includes("eventId=evt_log_1") &&
        line.includes("type=payout.complete") &&
        line.includes("dedup=false") &&
        line.includes("signatureValid=true") &&
        line.includes("status=processed"),
    );
    expect(matched).toBeDefined();
  });
});
