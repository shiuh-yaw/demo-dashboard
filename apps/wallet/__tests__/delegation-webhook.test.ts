import { describe, expect, it, vi, beforeEach } from "vitest";
import crypto from "crypto";

// vi.mock factories are hoisted, so the fns must be too.
const { putDelegation, deleteDelegationsForWallet } = vi.hoisted(() => ({
  putDelegation: vi.fn(async () => {}),
  deleteDelegationsForWallet: vi.fn(async () => 1),
}));

vi.mock("../lib/delegation/store", () => ({
  putDelegation,
  deleteDelegationsForWallet,
}));

vi.mock("@dynamic-labs-wallet/node", () => ({
  decryptDelegatedWebhookData: vi.fn(() => ({
    decryptedDelegatedShare: { kind: "ecdsa", material: "share-bytes" },
    decryptedWalletApiKey: "wallet-api-key",
  })),
}));

import { openMaterial } from "../lib/delegation/crypto";
import {
  isDelegationEvent,
  processDelegationWebhook,
  type DelegationEvent,
} from "../lib/delegation/webhook";

const ENC_KEY = crypto.randomBytes(32).toString("base64");
const RSA_KEY = "-----BEGIN PRIVATE KEY-----fake-----END PRIVATE KEY-----";

const deps = { rsaPrivateKey: RSA_KEY, encryptionKey: ENC_KEY };

const created: DelegationEvent = {
  eventName: "wallet.delegation.created",
  data: {
    chain: "EVM",
    walletId: "wallet-1",
    userId: "user-1",
    publicKey: "0xabc",
    encryptedDelegatedShare: { alg: "x", iv: "x", ct: "x", tag: "x", ek: "x", kid: "k1" },
    encryptedWalletApiKey: { alg: "x", iv: "x", ct: "x", tag: "x", ek: "x", kid: "k1" },
  },
};

beforeEach(() => vi.clearAllMocks());

describe("isDelegationEvent", () => {
  it("matches only the two delegation events", () => {
    expect(isDelegationEvent("wallet.delegation.created")).toBe(true);
    expect(isDelegationEvent("wallet.delegation.revoked")).toBe(true);
    expect(isDelegationEvent("wallet.activity")).toBe(false);
  });
});

describe("processDelegationWebhook - created", () => {
  it("stores materials sealed, never in plaintext", async () => {
    const outcome = await processDelegationWebhook(created, deps);
    expect(outcome).toEqual({ kind: "stored", walletId: "wallet-1" });

    const [userId, record] = putDelegation.mock.calls[0] as unknown as [
      string,
      Record<string, string>,
    ];
    expect(userId).toBe("user-1");

    // What lands in Redis must not contain the plaintext...
    expect(record.encShare).not.toContain("share-bytes");
    expect(record.encApiKey).not.toContain("wallet-api-key");
    // ...but must decrypt back to it.
    expect(JSON.parse(openMaterial(record.encShare!, ENC_KEY))).toEqual({
      kind: "ecdsa",
      material: "share-bytes",
    });
    expect(openMaterial(record.encApiKey!, ENC_KEY)).toBe("wallet-api-key");
    expect(record.kid).toBe("k1");
  });

  it("skips when the RSA key is unset rather than storing junk", async () => {
    const outcome = await processDelegationWebhook(created, {
      ...deps,
      rsaPrivateKey: undefined,
    });
    expect(outcome).toEqual({
      kind: "skipped",
      reason: "missing-DELEGATION_RSA_PRIVATE_KEY",
    });
    expect(putDelegation).not.toHaveBeenCalled();
  });

  it("skips when the at-rest key is unset", async () => {
    const outcome = await processDelegationWebhook(created, {
      ...deps,
      encryptionKey: undefined,
    });
    expect(outcome).toEqual({
      kind: "skipped",
      reason: "missing-DELEGATION_ENC_KEY",
    });
    expect(putDelegation).not.toHaveBeenCalled();
  });

  it("skips a payload with no walletId", async () => {
    const outcome = await processDelegationWebhook(
      { ...created, data: { ...created.data, walletId: "" } } as DelegationEvent,
      deps,
    );
    expect(outcome).toEqual({
      kind: "skipped",
      reason: "missing-userId-or-walletId",
    });
    expect(putDelegation).not.toHaveBeenCalled();
  });
});

describe("processDelegationWebhook - revoked", () => {
  it("purges the stored record", async () => {
    const outcome = await processDelegationWebhook(
      {
        eventName: "wallet.delegation.revoked",
        userId: "user-1",
        data: { walletId: "wallet-1", chain: "EVM" },
      },
      deps,
    );
    expect(deleteDelegationsForWallet).toHaveBeenCalledWith("wallet-1", "user-1");
    expect(outcome).toEqual({ kind: "revoked", walletId: "wallet-1", removed: 1 });
  });
});
