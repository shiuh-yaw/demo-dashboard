/**
 * Parity tests: TransactionRecordService + WebhookEventService contracts.
 *
 * The TransactionRecordService matrix runs the same behavioural checks
 * against:
 *   - PostgresTransactionRecordService backed by an in-memory fake of
 *     `prisma.transaction`.
 *   - RedisTransactionRecordService backed by an in-memory RedisClient.
 *
 * State validation comes from `@dynamic-demos/transactions`; both
 * implementations must call `assertValidTransition` at the boundary, so a
 * single "rejects illegal transition" test asserts identical behaviour.
 *
 * WebhookEventService is Postgres-only by design (D-011) — Redis never had
 * this store and the audit trail must be durable from day one. The webhook
 * tests therefore only run against the Postgres fake.
 */

import { beforeEach, describe, expect, it } from "vitest";

import {
  IllegalTransitionError,
  TransactionState,
} from "@dynamic-demos/transactions";

import { PostgresTransactionRecordService } from "@/lib/services/postgres/transactions";
import { PostgresWebhookEventService } from "@/lib/services/postgres/webhook-events";
import { RedisTransactionRecordService } from "@/lib/services/redis/transactions-record";
import {
  DuplicateWebhookEventError,
  type CreateTransactionRecordInput,
  type CreateWebhookEventInput,
  type TransactionRecordService,
  type WebhookEventService,
} from "@/lib/services/types";

import { createFakeRedis } from "./fake-redis";
import { createFakeTransactionPrisma } from "./fake-prisma-transactions";

// ---------------------------------------------------------------------------
// TransactionRecordService parity
// ---------------------------------------------------------------------------

interface TxBackend {
  name: string;
  build: () => TransactionRecordService;
}

const txBackends: TxBackend[] = [
  {
    name: "postgres",
    build: () =>
      new PostgresTransactionRecordService(createFakeTransactionPrisma()),
  },
  {
    name: "redis",
    build: () => new RedisTransactionRecordService(createFakeRedis()),
  },
];

function makeTxInput(
  overrides: Partial<CreateTransactionRecordInput> = {},
): CreateTransactionRecordInput {
  return {
    kind: "checkout",
    demoInstanceId: "demo-1",
    brandId: "brand-1",
    payload: { foo: "bar" },
    refs: { idemKey: "abc" },
    ...overrides,
  };
}

describe.each(txBackends)(
  "TransactionRecordService parity ($name)",
  ({ build }) => {
    let svc: TransactionRecordService;

    beforeEach(() => {
      svc = build();
    });

    it("creates a record with default state=initialized and timestamps", async () => {
      const created = await svc.create(makeTxInput());
      expect(created.id).toEqual(expect.any(String));
      expect(created.id.length).toBeGreaterThan(0);
      expect(created.kind).toBe("checkout");
      expect(created.state).toBe(TransactionState.initialized);
      expect(created.demoInstanceId).toBe("demo-1");
      expect(created.brandId).toBe("brand-1");
      expect(created.parentTransactionId).toBeNull();
      expect(created.payload).toEqual({ foo: "bar" });
      expect(created.refs).toEqual({ idemKey: "abc" });
      expect(created.createdAt).toBeInstanceOf(Date);
      expect(created.updatedAt).toBeInstanceOf(Date);
    });

    it("honors an explicit initial state", async () => {
      const created = await svc.create(
        makeTxInput({ state: TransactionState.draft }),
      );
      expect(created.state).toBe(TransactionState.draft);
    });

    it("treats missing optional fields as null", async () => {
      const created = await svc.create({
        kind: "swap",
      });
      expect(created.demoInstanceId).toBeNull();
      expect(created.brandId).toBeNull();
      expect(created.parentTransactionId).toBeNull();
      expect(created.payload).toEqual({});
      expect(created.refs).toEqual({});
    });

    it("get returns null when the record does not exist", async () => {
      const found = await svc.get("does-not-exist");
      expect(found).toBeNull();
    });

    it("get returns the record by id", async () => {
      const created = await svc.create(makeTxInput());
      const found = await svc.get(created.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.kind).toBe("checkout");
    });

    it("list returns all records when no filter is provided", async () => {
      await svc.create(makeTxInput({ kind: "checkout" }));
      await svc.create(makeTxInput({ kind: "disbursement" }));
      const all = await svc.list();
      expect(all).toHaveLength(2);
    });

    it("list filters by demoInstanceId", async () => {
      await svc.create(makeTxInput({ demoInstanceId: "demo-1" }));
      await svc.create(makeTxInput({ demoInstanceId: "demo-2" }));
      const owned = await svc.list({ demoInstanceId: "demo-1" });
      expect(owned).toHaveLength(1);
      expect(owned[0]!.demoInstanceId).toBe("demo-1");
    });

    it("list filters by brandId", async () => {
      await svc.create(makeTxInput({ brandId: "brand-a" }));
      await svc.create(makeTxInput({ brandId: "brand-b" }));
      await svc.create(makeTxInput({ brandId: "brand-a" }));
      const owned = await svc.list({ brandId: "brand-a" });
      expect(owned).toHaveLength(2);
    });

    it("list filters by single state", async () => {
      const a = await svc.create(makeTxInput());
      await svc.updateState(a.id, { state: TransactionState.draft });
      await svc.create(makeTxInput());
      const drafts = await svc.list({ state: TransactionState.draft });
      expect(drafts).toHaveLength(1);
      expect(drafts[0]!.state).toBe(TransactionState.draft);
    });

    it("list filters by multiple states (OR)", async () => {
      const a = await svc.create(makeTxInput());
      await svc.updateState(a.id, { state: TransactionState.draft });
      const b = await svc.create(makeTxInput());
      await svc.updateState(b.id, { state: TransactionState.cancelled });
      await svc.create(makeTxInput()); // stays initialized
      const matching = await svc.list({
        state: [TransactionState.draft, TransactionState.cancelled],
      });
      expect(matching).toHaveLength(2);
    });

    it("list filters by kind", async () => {
      await svc.create(makeTxInput({ kind: "checkout" }));
      await svc.create(makeTxInput({ kind: "disbursement" }));
      const checkouts = await svc.list({ kind: "checkout" });
      expect(checkouts).toHaveLength(1);
      expect(checkouts[0]!.kind).toBe("checkout");
    });

    it("list filters by parentTransactionId", async () => {
      const parent = await svc.create(makeTxInput());
      await svc.create(makeTxInput({ parentTransactionId: parent.id }));
      await svc.create(makeTxInput({ parentTransactionId: parent.id }));
      await svc.create(makeTxInput()); // unrelated
      const children = await svc.list({ parentTransactionId: parent.id });
      expect(children).toHaveLength(2);
    });

    it("updateState honors a valid transition (initialized → draft)", async () => {
      const created = await svc.create(makeTxInput());
      // Force a measurable gap so updatedAt strictly increases.
      await new Promise((r) => setTimeout(r, 5));
      const updated = await svc.updateState(created.id, {
        state: TransactionState.draft,
      });
      expect(updated.state).toBe(TransactionState.draft);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        created.updatedAt.getTime(),
      );
    });

    it("updateState chains through the full happy path", async () => {
      const created = await svc.create(makeTxInput());
      const draft = await svc.updateState(created.id, {
        state: TransactionState.draft,
      });
      const submitted = await svc.updateState(draft.id, {
        state: TransactionState.submitted,
      });
      const pending = await svc.updateState(submitted.id, {
        state: TransactionState.pending,
      });
      const confirmed = await svc.updateState(pending.id, {
        state: TransactionState.confirmed,
      });
      expect(confirmed.state).toBe(TransactionState.confirmed);
    });

    it("updateState rejects an illegal transition (initialized → confirmed)", async () => {
      const created = await svc.create(makeTxInput());
      await expect(
        svc.updateState(created.id, { state: TransactionState.confirmed }),
      ).rejects.toBeInstanceOf(IllegalTransitionError);
      // Persisted state must NOT have advanced.
      const fresh = await svc.get(created.id);
      expect(fresh!.state).toBe(TransactionState.initialized);
    });

    it("updateState rejects transitioning out of a terminal state", async () => {
      const created = await svc.create(makeTxInput());
      await svc.updateState(created.id, { state: TransactionState.cancelled });
      await expect(
        svc.updateState(created.id, { state: TransactionState.draft }),
      ).rejects.toBeInstanceOf(IllegalTransitionError);
    });

    it("updateState throws when the record does not exist", async () => {
      await expect(
        svc.updateState("does-not-exist", {
          state: TransactionState.draft,
        }),
      ).rejects.toThrow();
    });

    it("updatePayload changes only provided fields", async () => {
      const created = await svc.create(makeTxInput());
      const updated = await svc.updatePayload(created.id, {
        payload: { updated: true },
      });
      expect(updated.payload).toEqual({ updated: true });
      // unchanged fields preserved
      expect(updated.refs).toEqual({ idemKey: "abc" });
      expect(updated.state).toBe(TransactionState.initialized);
    });

    it("updatePayload allows clearing brandId/demoInstanceId", async () => {
      const created = await svc.create(makeTxInput());
      const updated = await svc.updatePayload(created.id, {
        brandId: null,
        demoInstanceId: null,
      });
      expect(updated.brandId).toBeNull();
      expect(updated.demoInstanceId).toBeNull();
    });

    it("delete removes the record", async () => {
      const created = await svc.create(makeTxInput());
      await svc.delete(created.id);
      const found = await svc.get(created.id);
      expect(found).toBeNull();
    });

    it("delete on one record leaves others intact", async () => {
      const a = await svc.create(makeTxInput({ kind: "a" }));
      const b = await svc.create(makeTxInput({ kind: "b" }));
      await svc.delete(a.id);
      const remaining = await svc.list();
      expect(remaining).toHaveLength(1);
      expect(remaining[0]!.id).toBe(b.id);
    });
  },
);

// ---------------------------------------------------------------------------
// WebhookEventService — Postgres-only (D-011, see file header).
// ---------------------------------------------------------------------------

function makeWebhookInput(
  overrides: Partial<CreateWebhookEventInput> = {},
): CreateWebhookEventInput {
  return {
    provider: "lifi",
    providerEventId: "evt-1",
    eventType: "transaction.confirmed",
    occurredAt: new Date("2026-05-06T12:00:00Z"),
    signatureValid: true,
    rawPayload: { hello: "world" },
    normalizedPayload: { type: "confirmed" },
    ...overrides,
  };
}

describe("WebhookEventService (postgres)", () => {
  let svc: WebhookEventService;

  beforeEach(() => {
    svc = new PostgresWebhookEventService(createFakeTransactionPrisma());
  });

  it("creates an event with defaults", async () => {
    const created = await svc.create(makeWebhookInput());
    expect(created.id).toEqual(expect.any(String));
    expect(created.provider).toBe("lifi");
    expect(created.providerEventId).toBe("evt-1");
    expect(created.eventType).toBe("transaction.confirmed");
    expect(created.signatureValid).toBe(true);
    expect(created.processingStatus).toBe("pending");
    expect(created.processingError).toBeNull();
    expect(created.processedAt).toBeNull();
    expect(created.receivedAt).toBeInstanceOf(Date);
    expect(created.occurredAt).toBeInstanceOf(Date);
  });

  it("preserves rawPayload and normalizedPayload as-is", async () => {
    const raw = { nested: { id: 1, sig: "abc" } };
    const norm = { kind: "confirmed", txId: "tx-1" };
    const created = await svc.create(
      makeWebhookInput({ rawPayload: raw, normalizedPayload: norm }),
    );
    expect(created.rawPayload).toEqual(raw);
    expect(created.normalizedPayload).toEqual(norm);
  });

  it("dedup: a duplicate (provider, providerEventId) throws DuplicateWebhookEventError", async () => {
    await svc.create(makeWebhookInput({ providerEventId: "dup-1" }));
    await expect(
      svc.create(makeWebhookInput({ providerEventId: "dup-1" })),
    ).rejects.toBeInstanceOf(DuplicateWebhookEventError);
  });

  it("allows the same providerEventId across distinct providers", async () => {
    await svc.create(
      makeWebhookInput({ provider: "lifi", providerEventId: "evt-1" }),
    );
    const second = await svc.create(
      makeWebhookInput({ provider: "blindpay", providerEventId: "evt-1" }),
    );
    expect(second.provider).toBe("blindpay");
    expect(second.providerEventId).toBe("evt-1");
  });

  it("get returns null when the event does not exist", async () => {
    const found = await svc.get("does-not-exist");
    expect(found).toBeNull();
  });

  it("findByProviderEvent returns the row by dedup key", async () => {
    const created = await svc.create(makeWebhookInput());
    const found = await svc.findByProviderEvent("lifi", "evt-1");
    expect(found?.id).toBe(created.id);
  });

  it("findByProviderEvent returns null for unknown keys", async () => {
    const found = await svc.findByProviderEvent("lifi", "nope");
    expect(found).toBeNull();
  });

  it("list filters by provider", async () => {
    await svc.create(
      makeWebhookInput({ provider: "lifi", providerEventId: "a" }),
    );
    await svc.create(
      makeWebhookInput({ provider: "blindpay", providerEventId: "b" }),
    );
    const lifiOnly = await svc.list({ provider: "lifi" });
    expect(lifiOnly).toHaveLength(1);
    expect(lifiOnly[0]!.provider).toBe("lifi");
  });

  it("list filters by transactionId", async () => {
    await svc.create(
      makeWebhookInput({ providerEventId: "a", transactionId: "tx-1" }),
    );
    await svc.create(
      makeWebhookInput({ providerEventId: "b", transactionId: "tx-2" }),
    );
    const owned = await svc.list({ transactionId: "tx-1" });
    expect(owned).toHaveLength(1);
    expect(owned[0]!.transactionId).toBe("tx-1");
  });

  it("list filters by processingStatus", async () => {
    const a = await svc.create(
      makeWebhookInput({ providerEventId: "a" }),
    );
    await svc.create(makeWebhookInput({ providerEventId: "b" }));
    await svc.markProcessed(a.id, { processingStatus: "processed" });
    const pending = await svc.list({ processingStatus: "pending" });
    expect(pending).toHaveLength(1);
    expect(pending[0]!.providerEventId).toBe("b");
  });

  it("markProcessed updates status, error, and processedAt", async () => {
    const created = await svc.create(makeWebhookInput());
    const processed = await svc.markProcessed(created.id, {
      processingStatus: "failed",
      processingError: "oops",
    });
    expect(processed.processingStatus).toBe("failed");
    expect(processed.processingError).toBe("oops");
    expect(processed.processedAt).toBeInstanceOf(Date);
  });

  it("markProcessed clears processingError when not provided", async () => {
    const created = await svc.create(makeWebhookInput());
    const processed = await svc.markProcessed(created.id, {
      processingStatus: "processed",
    });
    expect(processed.processingStatus).toBe("processed");
    expect(processed.processingError).toBeNull();
  });

  it("markProcessed honors an explicit processedAt", async () => {
    const created = await svc.create(makeWebhookInput());
    const t = new Date("2025-01-01T00:00:00Z");
    const processed = await svc.markProcessed(created.id, {
      processingStatus: "processed",
      processedAt: t,
    });
    expect(processed.processedAt?.getTime()).toBe(t.getTime());
  });
});
