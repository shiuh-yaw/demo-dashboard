/**
 * Webhook signature verification + normalization tests.
 *
 * The fixture below is a synthetic `payout.complete` event modelled on the
 * structure documented at https://www.blindpay.com/docs/essentials/webhooks.
 * Field values (ids, amounts) are scrubbed/synthetic — no real PII.
 *
 * Signature is generated locally with HMAC-SHA256 over
 * `${svix-id}.${svix-timestamp}.${body}` using a fixed `whsec_` secret.
 */

import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  CanonicalTransactionStatePlaceholder,
} from "../state-mapping";
import {
  normalize,
  verifySignature,
  type BlindpayWebhookHeaders,
} from "../webhooks";

const FIXTURE_SECRET_RAW = "supersecret-bytes-do-not-use-in-prod";
const FIXTURE_SECRET = `whsec_${Buffer.from(FIXTURE_SECRET_RAW).toString("base64")}`;

const FIXTURE_PAYLOAD = {
  type: "payout.complete",
  data: {
    id: "po_test_0000000000000001",
    status: "completed",
    receiver_amount: 9950,
    network: "base_sepolia",
    token: "USDC",
  },
};

const FIXTURE_BODY = JSON.stringify(FIXTURE_PAYLOAD);
const FIXTURE_TS = "1893456000"; // 2030-01-01T00:00:00Z
const FIXTURE_ID = "msg_2fixture000000000000000";

function sign(secretWhsec: string, id: string, ts: string, body: string) {
  const key = Buffer.from(secretWhsec.replace(/^whsec_/, ""), "base64");
  const sig = createHmac("sha256", key)
    .update(`${id}.${ts}.${body}`)
    .digest("base64");
  return `v1,${sig}`;
}

const FIXTURE_HEADERS: BlindpayWebhookHeaders = {
  id: FIXTURE_ID,
  timestamp: FIXTURE_TS,
  signature: sign(FIXTURE_SECRET, FIXTURE_ID, FIXTURE_TS, FIXTURE_BODY),
};

describe("webhooks.verifySignature", () => {
  const baseInput = {
    body: FIXTURE_BODY,
    headers: FIXTURE_HEADERS,
    secret: FIXTURE_SECRET,
    nowSeconds: Number(FIXTURE_TS),
  };

  it("accepts a correctly signed Svix-style payload", () => {
    expect(() => verifySignature(baseInput)).not.toThrow();
  });

  it("accepts when the secret is provided as raw bytes", () => {
    expect(() =>
      verifySignature({
        ...baseInput,
        secret: Buffer.from(FIXTURE_SECRET_RAW),
      }),
    ).not.toThrow();
  });

  it("accepts when one of multiple v1 signatures is valid", () => {
    const tampered = "v1,AAAA";
    const headers = {
      ...FIXTURE_HEADERS,
      signature: `${tampered} ${FIXTURE_HEADERS.signature}`,
    };
    expect(() => verifySignature({ ...baseInput, headers })).not.toThrow();
  });

  it("rejects when the body is tampered with", () => {
    expect(() =>
      verifySignature({ ...baseInput, body: FIXTURE_BODY + " " }),
    ).toThrow(/did not match/);
  });

  it("rejects when the secret is wrong", () => {
    expect(() =>
      verifySignature({ ...baseInput, secret: "whsec_aGVsbG8=" }),
    ).toThrow(/did not match/);
  });

  it("rejects when the timestamp is outside tolerance", () => {
    expect(() =>
      verifySignature({
        ...baseInput,
        nowSeconds: Number(FIXTURE_TS) + 600,
        toleranceSeconds: 300,
      }),
    ).toThrow(/outside tolerance/);
  });

  it("rejects when required headers are missing", () => {
    expect(() =>
      verifySignature({
        ...baseInput,
        headers: { ...FIXTURE_HEADERS, signature: "" },
      }),
    ).toThrow(/missing required headers/);
  });

  it("rejects when no v1 signatures are present", () => {
    expect(() =>
      verifySignature({
        ...baseInput,
        headers: { ...FIXTURE_HEADERS, signature: "v0,abc" },
      }),
    ).toThrow(/no v1 signatures/);
  });
});

describe("webhooks.normalize", () => {
  it("classifies a payout.complete event and maps status to confirmed", () => {
    const event = normalize(FIXTURE_PAYLOAD, FIXTURE_HEADERS);
    expect(event.type).toBe("payout.complete");
    expect(event.kind).toBe("payout");
    expect(event.messageId).toBe(FIXTURE_ID);
    expect(event.timestamp).toBe(Number(FIXTURE_TS));
    expect(event.canonicalState).toBe(
      CanonicalTransactionStatePlaceholder.confirmed,
    );
    expect(event.resourceId).toBe("po_test_0000000000000001");
  });

  it("classifies receiver and bankAccount events without canonical state", () => {
    expect(
      normalize({ type: "receiver.new", data: {} }, FIXTURE_HEADERS).kind,
    ).toBe("receiver");
    expect(
      normalize({ type: "bankAccount.new", data: {} }, FIXTURE_HEADERS).kind,
    ).toBe("bankAccount");
    expect(
      normalize({ type: "wallet.inbound", data: {} }, FIXTURE_HEADERS)
        .canonicalState,
    ).toBeNull();
  });

  it("falls back to `unknown` for unrecognized event types", () => {
    const event = normalize(
      { type: "totally.new.event", data: { id: "x", status: "in_progress" } },
      FIXTURE_HEADERS,
    );
    expect(event.kind).toBe("unknown");
    expect(event.canonicalState).toBe(
      CanonicalTransactionStatePlaceholder.submitted,
    );
    expect(event.resourceId).toBe("x");
  });
});
