/**
 * Magic-send intent service — full lifecycle coverage.
 *
 * The tests drive the service through every state transition:
 * create → submitted-transfer → transfer-confirmed → submitted-userop
 * → confirmed. Each step asserts both the state column and the
 * payload/refs fields that downstream APIs depend on.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { ConflictError, ValidationError } from "@/lib/errors";

import {
  MagicSendIntentService,
  pendingIntentKey,
  idempotencyKey,
  MAGIC_SEND_KIND,
} from "../intents";
import type { CreateMagicSendIntentInput, HexAddress } from "../types";

import {
  FakeRedis,
  FakeTransactionRecordService,
  FakeUserOpExecutor,
  FakeVault,
} from "./fakes";

const RECIPIENT: HexAddress = "0x1111111111111111111111111111111111111111";
const TOKEN: HexAddress = "0x2222222222222222222222222222222222222222";

function baseInput(): CreateMagicSendIntentInput {
  return {
    userId: "user-1",
    demoInstanceId: "demo-1",
    vaultId: "vault-1",
    recipient: RECIPIENT,
    token: TOKEN,
    amount: "1000000",
    chainId: 84532,
    calls: [
      {
        to: "0x3333333333333333333333333333333333333333",
        value: "0",
        data: "0xdeadbeef",
      },
    ],
    idempotencyKey: "test-key-aaaaaaaaaa",
  };
}

interface TestEnv {
  service: MagicSendIntentService;
  redis: FakeRedis;
  txs: FakeTransactionRecordService;
  vault: FakeVault;
  userop: FakeUserOpExecutor;
}

function setup(): TestEnv {
  const redis = new FakeRedis();
  const txs = new FakeTransactionRecordService();
  const vault = new FakeVault();
  const userop = new FakeUserOpExecutor();
  const service = new MagicSendIntentService({
    transactionRecords: txs,
    redis,
    vault,
    userOpExecutor: userop,
  });
  return { service, redis, txs, vault, userop };
}

describe("MagicSendIntentService.createIntent", () => {
  let env: TestEnv;
  beforeEach(() => {
    env = setup();
  });

  it("creates a magic-send Transaction row in submitted-transfer state", async () => {
    const intent = await env.service.createIntent(baseInput());

    expect(intent.state).toBe("submitted-transfer");
    expect(intent.recipient).toBe(RECIPIENT);
    expect(intent.token).toBe(TOKEN);
    expect(intent.amount).toBe("1000000");
    expect(intent.transferTxHash).toMatch(/^0x/);

    // Postgres row exists with the right kind + state.
    const row = await env.txs.get(intent.id);
    expect(row?.kind).toBe(MAGIC_SEND_KIND);
    expect(row?.state).toBe("submitted-transfer");
  });

  it("dispatches the vault transfer with normalized addresses + amount", async () => {
    await env.service.createIntent(baseInput());
    expect(env.vault.calls).toHaveLength(1);
    expect(env.vault.calls[0]).toEqual({
      vaultId: "vault-1",
      token: TOKEN,
      recipient: RECIPIENT,
      amount: "1000000",
      chainId: 84532,
    });
  });

  it("lowercases recipient + token addresses before persisting", async () => {
    const input = baseInput();
    input.recipient = "0xABCDEF0000000000000000000000000000000000";
    input.token = "0xFEDCBA0000000000000000000000000000000000";
    const intent = await env.service.createIntent(input);
    expect(intent.recipient).toBe(intent.recipient.toLowerCase());
    expect(intent.token).toBe(intent.token.toLowerCase());
  });

  it("writes a Redis pending entry keyed by the (lowercased) recipient", async () => {
    const intent = await env.service.createIntent(baseInput());
    const raw = await env.redis.get(pendingIntentKey(RECIPIENT));
    expect(raw).not.toBeNull();
    const pending = JSON.parse(raw!);
    expect(pending.intentId).toBe(intent.id);
    expect(pending.expectedAmount).toBe("1000000");
    expect(pending.expectedToken).toBe(TOKEN);
    expect(pending.idempotencyKey).toBe("test-key-aaaaaaaaaa");
  });

  it("reserves the idempotency key — duplicate POSTs throw ConflictError", async () => {
    await env.service.createIntent(baseInput());
    await expect(env.service.createIntent(baseInput())).rejects.toThrow(
      ConflictError,
    );
  });

  it("verifies the idempotency reservation lives in Redis under the canonical key", async () => {
    await env.service.createIntent(baseInput());
    const reserved = await env.redis.get(idempotencyKey("test-key-aaaaaaaaaa"));
    expect(reserved).toBe("1");
  });

  it("rejects malformed addresses with ValidationError", async () => {
    const input = baseInput();
    input.recipient = "0xnothex";
    await expect(env.service.createIntent(input)).rejects.toThrow(
      ValidationError,
    );
  });

  it("rejects zero amount with ValidationError", async () => {
    const input = baseInput();
    input.amount = "0";
    await expect(env.service.createIntent(input)).rejects.toThrow(
      ValidationError,
    );
  });

  it("rejects empty calls array with ValidationError", async () => {
    const input = baseInput();
    input.calls = [];
    await expect(env.service.createIntent(input)).rejects.toThrow(
      ValidationError,
    );
  });

  it("transitions the row to `failed` when the vault transfer throws", async () => {
    env.vault.willThrow("rpc-unreachable");
    const input = baseInput();
    await expect(env.service.createIntent(input)).rejects.toThrow(
      "rpc-unreachable",
    );
    // The row exists in `failed` state — the create-then-fail dance
    // produces a single Postgres row in `failed`.
    const rows = await env.txs.list({ kind: MAGIC_SEND_KIND });
    expect(rows).toHaveLength(1);
    expect(rows[0].state).toBe("failed");
    expect((rows[0].refs as { failureReason?: string }).failureReason).toMatch(
      /vault-transfer-failed/,
    );
  });
});

describe("MagicSendIntentService.executeIntent", () => {
  let env: TestEnv;
  beforeEach(() => {
    env = setup();
  });

  it("advances submitted-transfer → transfer-confirmed → submitted-userop → confirmed", async () => {
    const created = await env.service.createIntent(baseInput());
    expect(created.state).toBe("submitted-transfer");

    const confirmed = await env.service.executeIntent(created.id, {
      webhookEventId: "wh-1",
    });

    expect(confirmed.state).toBe("confirmed");
    expect(confirmed.useropBundleHash).toMatch(/^0x/);
    expect(confirmed.webhookEventId).toBe("wh-1");
  });

  it("dispatches userop exactly once per intent", async () => {
    const created = await env.service.createIntent(baseInput());
    await env.service.executeIntent(created.id);
    expect(env.userop.calls).toHaveLength(1);
    expect(env.userop.calls[0].intent.id).toBe(created.id);
  });

  it("is idempotent — calling executeIntent twice does not re-fire the userop", async () => {
    const created = await env.service.createIntent(baseInput());
    await env.service.executeIntent(created.id);
    await env.service.executeIntent(created.id);
    expect(env.userop.calls).toHaveLength(1);
  });

  it("drops the Redis pending entry after confirmation", async () => {
    const created = await env.service.createIntent(baseInput());
    expect(await env.redis.get(pendingIntentKey(RECIPIENT))).not.toBeNull();
    await env.service.executeIntent(created.id);
    expect(await env.redis.get(pendingIntentKey(RECIPIENT))).toBeNull();
  });

  it("transitions to `failed` if the userop dispatch throws", async () => {
    const created = await env.service.createIntent(baseInput());
    env.userop.willThrow("bundler-rejected");
    await expect(env.service.executeIntent(created.id)).rejects.toThrow(
      "bundler-rejected",
    );
    const row = await env.txs.get(created.id);
    expect(row?.state).toBe("failed");
    expect((row?.refs as { failureReason?: string }).failureReason).toMatch(
      /userop-failed/,
    );
  });

  it("throws NotFoundError for unknown intent ids", async () => {
    await expect(env.service.executeIntent("tx_does_not_exist")).rejects.toThrow(
      /not found/i,
    );
  });
});

describe("MagicSendIntentService.getIntent / listIntentsForUser", () => {
  let env: TestEnv;
  beforeEach(() => {
    env = setup();
  });

  it("returns null for non-magic-send rows even if the id matches", async () => {
    const row = await env.txs.create({
      kind: "checkout",
      payload: { foo: "bar" },
      refs: {},
    });
    const looked = await env.service.getIntent(row.id);
    expect(looked).toBeNull();
  });

  it("lists only the requested user's intents", async () => {
    const a = await env.service.createIntent(baseInput());
    const otherInput = baseInput();
    otherInput.userId = "user-2";
    otherInput.idempotencyKey = "different-key-bbbbbbbb";
    const b = await env.service.createIntent(otherInput);

    const user1 = await env.service.listIntentsForUser("user-1");
    expect(user1.map((i) => i.id)).toEqual([a.id]);

    const user2 = await env.service.listIntentsForUser("user-2");
    expect(user2.map((i) => i.id)).toEqual([b.id]);
  });
});
