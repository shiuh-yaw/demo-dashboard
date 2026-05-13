/**
 * Magic-send webhook processor + Dynamic signature verification tests.
 */

import * as crypto from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import {
  MagicSendIntentService,
  pendingIntentKey,
} from "../intents";
import {
  normalizeDynamicWalletActivity,
  processDynamicWalletActivityWebhook,
  verifyDynamicWebhookSignature,
  type DynamicWalletActivityEvent,
} from "../webhooks";
import type { HexAddress } from "../types";

import {
  FakeRedis,
  FakeTransactionRecordService,
  FakeUserOpExecutor,
  FakeVault,
} from "./fakes";

const RECIPIENT: HexAddress = "0x1111111111111111111111111111111111111111";
const TOKEN: HexAddress = "0x2222222222222222222222222222222222222222";

describe("verifyDynamicWebhookSignature", () => {
  const secret = "whsec_test";
  const body = JSON.stringify({ messageId: "m1", eventName: "wallet.activity" });

  function signed(): string {
    const mac = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");
    return `sha256=${mac}`;
  }

  it("returns true for a correctly-signed body", () => {
    expect(
      verifyDynamicWebhookSignature({
        secret,
        signature: signed(),
        rawBody: body,
      }),
    ).toBe(true);
  });

  it("returns false when the signature does not match", () => {
    expect(
      verifyDynamicWebhookSignature({
        secret,
        signature: "sha256=" + "0".repeat(64),
        rawBody: body,
      }),
    ).toBe(false);
  });

  it("returns false when the body is tampered with", () => {
    const tampered = body + " ";
    expect(
      verifyDynamicWebhookSignature({
        secret,
        signature: signed(),
        rawBody: tampered,
      }),
    ).toBe(false);
  });

  it("returns false when the secret is empty", () => {
    expect(
      verifyDynamicWebhookSignature({
        secret: "",
        signature: signed(),
        rawBody: body,
      }),
    ).toBe(false);
  });

  it("returns false when the signature header is empty", () => {
    expect(
      verifyDynamicWebhookSignature({
        secret,
        signature: "",
        rawBody: body,
      }),
    ).toBe(false);
  });
});

describe("normalizeDynamicWalletActivity", () => {
  it("produces a CanonicalWebhookEvent from a wallet.activity payload", () => {
    const payload = {
      messageId: "m-42",
      eventName: "wallet.activity",
      timestamp: 1715000000,
      data: { direction: "incoming", to: RECIPIENT, amount: "1" },
    };
    const result = normalizeDynamicWalletActivity({
      body: payload,
      headers: new Headers(),
    });
    expect(result.providerEventId).toBe("m-42");
    expect(result.eventType).toBe("wallet.activity");
    expect(result.canonicalState).toBeNull();
    expect(result.transactionId).toBeNull();
    expect(result.occurredAt.getTime()).toBe(1715000000_000);
  });

  it("throws when messageId is missing", () => {
    expect(() =>
      normalizeDynamicWalletActivity({
        body: { eventName: "wallet.activity" },
        headers: new Headers(),
      }),
    ).toThrow(/messageId/);
  });
});

describe("processDynamicWalletActivityWebhook", () => {
  let redis: FakeRedis;
  let txs: FakeTransactionRecordService;
  let vault: FakeVault;
  let userop: FakeUserOpExecutor;
  let intents: MagicSendIntentService;

  beforeEach(() => {
    redis = new FakeRedis();
    txs = new FakeTransactionRecordService();
    vault = new FakeVault();
    userop = new FakeUserOpExecutor();
    intents = new MagicSendIntentService({
      transactionRecords: txs,
      redis,
      vault,
      userOpExecutor: userop,
    });
  });

  async function createIntent(): Promise<string> {
    const intent = await intents.createIntent({
      userId: "user-1",
      demoInstanceId: "demo-1",
      vaultId: "vault-1",
      recipient: RECIPIENT,
      token: TOKEN,
      amount: "1000000",
      chainId: 84532,
      calls: [
        { to: "0x3333333333333333333333333333333333333333", value: "0" },
      ],
      idempotencyKey: "test-key-aaaaaaaaaa",
    });
    return intent.id;
  }

  function event(
    overrides: Partial<DynamicWalletActivityEvent["data"]> = {},
  ): DynamicWalletActivityEvent {
    return {
      messageId: "msg-1",
      eventName: "wallet.activity",
      timestamp: 1715000000,
      data: {
        direction: "incoming",
        to: RECIPIENT,
        tokenAddress: TOKEN,
        amount: "1000000",
        chainId: 84532,
        txHash: "0xabcd",
        ...overrides,
      },
    };
  }

  it("executes the intent for a matching incoming transfer", async () => {
    const intentId = await createIntent();
    const result = await processDynamicWalletActivityWebhook(event(), {
      redis,
      intents,
    });
    expect(result).toEqual({ kind: "executed", intentId });
    const row = await txs.get(intentId);
    expect(row?.state).toBe("confirmed");
  });

  it("is idempotent across redeliveries — second call short-circuits", async () => {
    const intentId = await createIntent();
    const first = await processDynamicWalletActivityWebhook(event(), {
      redis,
      intents,
    });
    // After the first run the row is `confirmed` and pending is gone.
    // Re-running the webhook lookup for the same recipient finds no
    // pending entry, so the outcome is `no-match`.
    const second = await processDynamicWalletActivityWebhook(event(), {
      redis,
      intents,
    });
    expect(first.kind).toBe("executed");
    expect(second.kind).toBe("no-match");
    expect(userop.calls).toHaveLength(1);
    expect(intentId).toBeTruthy();
  });

  it("ignores outgoing transfers", async () => {
    await createIntent();
    const r = await processDynamicWalletActivityWebhook(
      event({ direction: "outgoing" }),
      { redis, intents },
    );
    expect(r).toMatchObject({ kind: "ignored", reason: /direction/ });
  });

  it("ignores events with no matching pending intent (recipient mismatch)", async () => {
    await createIntent();
    const r = await processDynamicWalletActivityWebhook(
      event({ to: "0x9999999999999999999999999999999999999999" }),
      { redis, intents },
    );
    expect(r.kind).toBe("no-match");
  });

  it("ignores events with mismatched token (anti-spoof)", async () => {
    await createIntent();
    const r = await processDynamicWalletActivityWebhook(
      event({ tokenAddress: "0x9999999999999999999999999999999999999999" }),
      { redis, intents },
    );
    expect(r).toMatchObject({ kind: "ignored", reason: "token-mismatch" });
  });

  it("ignores events with mismatched amount (anti-spoof)", async () => {
    await createIntent();
    const r = await processDynamicWalletActivityWebhook(
      event({ amount: "1" }),
      { redis, intents },
    );
    expect(r).toMatchObject({ kind: "ignored", reason: "amount-mismatch" });
  });

  it("ignores native-asset transfers (no token address)", async () => {
    await createIntent();
    const r = await processDynamicWalletActivityWebhook(
      event({ tokenAddress: null }),
      { redis, intents },
    );
    expect(r).toMatchObject({ kind: "ignored", reason: "no-token" });
  });

  it("ignores non wallet.activity event types", async () => {
    await createIntent();
    const r = await processDynamicWalletActivityWebhook(
      { ...event(), eventName: "kyc.approved" } as DynamicWalletActivityEvent,
      { redis, intents },
    );
    expect(r).toMatchObject({ kind: "ignored", reason: /event-type/ });
  });

  it("uses the case-insensitive recipient for Redis lookup", async () => {
    await createIntent();
    const r = await processDynamicWalletActivityWebhook(
      event({ to: RECIPIENT.toUpperCase() }),
      { redis, intents },
    );
    expect(r.kind).toBe("executed");
  });

  it("threads the webhook messageId through to refs on confirmation", async () => {
    const intentId = await createIntent();
    await processDynamicWalletActivityWebhook(event(), { redis, intents });
    const row = await txs.get(intentId);
    const refs = row?.refs as { dynamicWebhookEventId?: string };
    expect(refs.dynamicWebhookEventId).toBe("msg-1");
  });

  it("pending entry exists under the lowercased recipient key", async () => {
    await createIntent();
    expect(await redis.get(pendingIntentKey(RECIPIENT))).not.toBeNull();
  });
});
