/**
 * Webhook signature verification + event normalization.
 *
 * Tests follow the Standard Webhooks spec that Iron uses:
 *   - Secret prefixed with `whsec_`, base64-encoded key.
 *   - HMAC-SHA256(key=decoded_secret, msg=timestamp+rawBody).
 *   - Signature in `webhook-signature` header as `v1=<hex>`.
 *   - Timestamp in `webhook-timestamp` header (epoch seconds).
 *   - Replay protection: 5-minute tolerance.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import {
  normalizeIronEvent,
  verifyIronSignature,
  IRON_SIGNATURE_HEADER,
  IRON_TIMESTAMP_HEADER,
  type IronWebhookHeaders,
} from "../webhooks";

// Base64-encoded secret key (the real part after "whsec_" prefix).
const SECRET_KEY_BASE64 = Buffer.from("test-secret-key-32-bytes-long!!").toString("base64");
const SECRET = `whsec_${SECRET_KEY_BASE64}`;
const SECRET_KEY_DECODED = Buffer.from(SECRET_KEY_BASE64, "base64");

const FIXTURE: import("../webhooks").IronWebhookPayload = {
  type: "register_autoramp_status",
  timestamp: "2026-04-29T12:00:00.000Z",
  data: {
    customer_id: "cus_test_redacted",
    message: {
      RegisterAutorampStatus: {
        id: "ar_01HEYB7N0M88ZK3X4YH3ABCDEF",
        status: "Approved",
      },
    },
  },
};

const RAW_BODY = JSON.stringify(FIXTURE);

function makeHeaders(
  overrides: Partial<{
    timestamp: string;
    signature: string;
  }> = {},
): IronWebhookHeaders {
  const ts =
    overrides.timestamp ?? String(Math.floor(Date.now() / 1000));
  const sig =
    overrides.signature ??
    `v1=${createHmac("sha256", SECRET_KEY_DECODED)
      .update(`${ts}${RAW_BODY}`)
      .digest("hex")}`;
  return {
    "webhook-signature": sig,
    "webhook-timestamp": ts,
    "webhook-id": "evt_test_123",
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("verifyIronSignature", () => {
  it("accepts a valid Standard Webhooks signature", () => {
    const headers = makeHeaders();
    expect(verifyIronSignature(RAW_BODY, headers, SECRET)).toBe(true);
  });

  it("accepts a valid signature without whsec_ prefix", () => {
    const headers = makeHeaders();
    expect(verifyIronSignature(RAW_BODY, headers, SECRET_KEY_BASE64)).toBe(
      true,
    );
  });

  it("rejects a tampered body", () => {
    const headers = makeHeaders();
    expect(verifyIronSignature(RAW_BODY + " ", headers, SECRET)).toBe(false);
  });

  it("rejects a wrong secret", () => {
    const headers = makeHeaders();
    const wrongSecret = `whsec_${Buffer.from("wrong-key").toString("base64")}`;
    expect(verifyIronSignature(RAW_BODY, headers, wrongSecret)).toBe(false);
  });

  it("rejects missing signature or secret", () => {
    const headers = makeHeaders();
    expect(
      verifyIronSignature(
        RAW_BODY,
        { ...headers, "webhook-signature": undefined },
        SECRET,
      ),
    ).toBe(false);
    expect(verifyIronSignature(RAW_BODY, headers, "")).toBe(false);
  });

  it("rejects missing timestamp", () => {
    const headers = makeHeaders();
    expect(
      verifyIronSignature(
        RAW_BODY,
        { ...headers, "webhook-timestamp": undefined },
        SECRET,
      ),
    ).toBe(false);
  });

  it("rejects malformed (non-hex) signatures", () => {
    const headers = makeHeaders({ signature: "v1=not-hex-string!" });
    expect(verifyIronSignature(RAW_BODY, headers, SECRET)).toBe(false);
  });

  it("rejects signatures of the wrong length", () => {
    const headers = makeHeaders({ signature: "v1=deadbeef" });
    expect(verifyIronSignature(RAW_BODY, headers, SECRET)).toBe(false);
  });

  it("rejects signatures without v1= prefix", () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const rawSig = createHmac("sha256", SECRET_KEY_DECODED)
      .update(`${ts}${RAW_BODY}`)
      .digest("hex");
    const headers: IronWebhookHeaders = {
      "webhook-signature": rawSig,
      "webhook-timestamp": ts,
    };
    expect(verifyIronSignature(RAW_BODY, headers, SECRET)).toBe(false);
  });

  it("rejects stale timestamps (replay protection)", () => {
    const staleTs = String(Math.floor(Date.now() / 1000) - 6 * 60);
    const headers = makeHeaders({ timestamp: staleTs });
    expect(verifyIronSignature(RAW_BODY, headers, SECRET)).toBe(false);
  });

  it("rejects future timestamps beyond tolerance", () => {
    const futureTs = String(Math.floor(Date.now() / 1000) + 6 * 60);
    const headers = makeHeaders({ timestamp: futureTs });
    expect(verifyIronSignature(RAW_BODY, headers, SECRET)).toBe(false);
  });

  it("verifies Buffer bodies identically to strings", () => {
    const headers = makeHeaders();
    expect(
      verifyIronSignature(Buffer.from(RAW_BODY), headers, SECRET),
    ).toBe(true);
  });

  it("handles multi-value webhook-signature header (comma-separated)", () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const validSig = createHmac("sha256", SECRET_KEY_DECODED)
      .update(`${ts}${RAW_BODY}`)
      .digest("hex");
    const headers: IronWebhookHeaders = {
      "webhook-signature": `v0=deadbeef,v1=${validSig}`,
      "webhook-timestamp": ts,
    };
    expect(verifyIronSignature(RAW_BODY, headers, SECRET)).toBe(true);
  });

  it("exports correct header constants", () => {
    expect(IRON_SIGNATURE_HEADER).toBe("webhook-signature");
    expect(IRON_TIMESTAMP_HEADER).toBe("webhook-timestamp");
  });
});

describe("normalizeIronEvent", () => {
  it("extracts canonical event fields from a register_autoramp_status event", () => {
    const event = normalizeIronEvent(FIXTURE);
    expect(event.type).toBe("iron.register_autoramp_status");
    expect(event.resource).toBe("autoramp");
    expect(event.resource_id).toBe("ar_01HEYB7N0M88ZK3X4YH3ABCDEF");
    expect(event.provider).toBe("iron");
    expect(event.provider_status).toBe("Approved");
    expect(event.state).toBe("submitted");
    expect(event.occurred_at).toBe(FIXTURE.timestamp);
    expect(event.raw).toEqual(FIXTURE);
  });

  it("extracts fields from a transaction_status event", () => {
    const txPayload: import("../webhooks").IronWebhookPayload = {
      type: "transaction_status",
      timestamp: "2026-04-29T13:00:00.000Z",
      data: {
        customer_id: "cus_1",
        message: {
          TransactionStatus: {
            id: "txn_abc",
            status: "Completed",
            transaction_status: "Completed",
          },
        },
      },
    };
    const event = normalizeIronEvent(txPayload);
    expect(event.type).toBe("iron.transaction_status");
    expect(event.resource).toBe("transaction");
    expect(event.resource_id).toBe("txn_abc");
    expect(event.provider_status).toBe("Completed");
    expect(event.state).toBe("confirmed");
    expect(event.id).toBe("txn_abc");
  });

  it("extracts fields from an identification_status event", () => {
    const identPayload: import("../webhooks").IronWebhookPayload = {
      type: "identification_status",
      timestamp: "2026-04-29T14:00:00.000Z",
      data: {
        customer_id: "cus_2",
        message: {
          IdentificationStatus: {
            id: "ident_xyz",
            status: "Approved",
          },
        },
      },
    };
    const event = normalizeIronEvent(identPayload);
    expect(event.type).toBe("iron.identification_status");
    expect(event.resource).toBe("identification");
    expect(event.resource_id).toBe("ident_xyz");
  });

  it("falls back to defaults when fields are missing", () => {
    const event = normalizeIronEvent({ type: "unknown" });
    expect(event.id).toBe("");
    expect(event.type).toBe("iron.unknown");
    expect(event.resource).toBe("unknown");
    expect(event.resource_id).toBe("");
    expect(event.state).toBeUndefined();
    expect(event.provider).toBe("iron");
    expect(typeof event.occurred_at).toBe("string");
  });
});
