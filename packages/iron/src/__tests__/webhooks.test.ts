/**
 * Webhook signature verification + event normalization.
 *
 * Fixture is a synthetic Iron `autoramp.status_changed` event signed with a
 * known secret — no real PII. Iron sends HMAC-SHA256(rawBody, secret) hex in
 * `X-Iron-Signature` (with optional `sha256=` prefix).
 */
import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { normalizeIronEvent, verifyIronSignature } from "../webhooks";

const SECRET = "whsec_test_iron_secret";
const FIXTURE: import("../webhooks").IronWebhookPayload = {
  event_id: "evt_01HEYB7N0M88ZK3X4YH3ABCDEF",
  type: "autoramp.status_changed",
  created_at: "2026-04-29T12:00:00.000Z",
  data: {
    id: "ar_01HEYB7N0M88ZK3X4YH3ABCDEF",
    kind: "Offramp" as const,
    status: "Approved",
    customer_id: "cus_test_redacted",
  },
};

const RAW_BODY = JSON.stringify(FIXTURE);
const VALID_SIGNATURE = createHmac("sha256", SECRET)
  .update(RAW_BODY)
  .digest("hex");

describe("verifyIronSignature", () => {
  it("accepts a valid HMAC signature", () => {
    expect(verifyIronSignature(RAW_BODY, VALID_SIGNATURE, SECRET)).toBe(true);
  });

  it("accepts a valid signature with sha256= prefix", () => {
    expect(
      verifyIronSignature(RAW_BODY, `sha256=${VALID_SIGNATURE}`, SECRET),
    ).toBe(true);
  });

  it("rejects a tampered body", () => {
    expect(
      verifyIronSignature(RAW_BODY + " ", VALID_SIGNATURE, SECRET),
    ).toBe(false);
  });

  it("rejects a wrong secret", () => {
    expect(verifyIronSignature(RAW_BODY, VALID_SIGNATURE, "nope")).toBe(false);
  });

  it("rejects missing signature or secret", () => {
    expect(verifyIronSignature(RAW_BODY, undefined, SECRET)).toBe(false);
    expect(verifyIronSignature(RAW_BODY, VALID_SIGNATURE, "")).toBe(false);
  });

  it("rejects malformed (non-hex) signatures", () => {
    expect(verifyIronSignature(RAW_BODY, "not-hex-string!", SECRET)).toBe(
      false,
    );
  });

  it("rejects signatures of the wrong length", () => {
    expect(verifyIronSignature(RAW_BODY, "deadbeef", SECRET)).toBe(false);
  });

  it("verifies Buffer bodies identically to strings", () => {
    expect(
      verifyIronSignature(Buffer.from(RAW_BODY), VALID_SIGNATURE, SECRET),
    ).toBe(true);
  });
});

describe("normalizeIronEvent", () => {
  it("extracts canonical event fields from an autoramp status change", () => {
    const event = normalizeIronEvent(FIXTURE);
    expect(event.id).toBe(FIXTURE.event_id);
    expect(event.type).toBe("iron.autoramp.status_changed");
    expect(event.resource).toBe("autoramp");
    expect(event.resource_id).toBe(FIXTURE.data!.id);
    expect(event.provider).toBe("iron");
    expect(event.provider_status).toBe("Approved");
    expect(event.state).toBe("confirmed");
    expect(event.occurred_at).toBe(FIXTURE.created_at);
    expect(event.raw).toEqual(FIXTURE);
  });

  it("falls back to defaults when fields are missing", () => {
    const event = normalizeIronEvent({});
    expect(event.id).toBe("");
    expect(event.type).toBe("iron.unknown");
    expect(event.resource).toBe("unknown");
    expect(event.resource_id).toBe("");
    expect(event.state).toBeUndefined();
    expect(event.provider).toBe("iron");
    expect(typeof event.occurred_at).toBe("string");
  });
});
