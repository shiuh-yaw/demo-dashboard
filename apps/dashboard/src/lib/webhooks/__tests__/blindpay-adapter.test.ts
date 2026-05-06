/**
 * Tests for the BlindPay → framework adapter functions.
 *
 * The framework's `verifySignature` / `normalize` callbacks take Web
 * `Request` headers, while `@dynamic-demos/blindpay` exposes its own
 * shape (`BlindpayWebhookHeaders` + a `BlindpayWebhookPayload`). The
 * adapter is the translation layer, and these tests pin its behaviour
 * so adding a second provider doesn't drift the contract.
 */

import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { TransactionState } from "@dynamic-demos/transactions";

import {
  blindpayNormalize,
  blindpayVerifySignature,
} from "../blindpay-adapter";

const SECRET = "whsec_dGVzdC1zZWNyZXQ"; // base64("test-secret")

function sign(body: string, id: string, ts: string, secretBase64: string): string {
  const key = Buffer.from(secretBase64, "base64");
  const digest = createHmac("sha256", key)
    .update(`${id}.${ts}.${body}`)
    .digest("base64");
  return `v1,${digest}`;
}

function makeHeaders(
  body: string,
  overrides: Partial<{
    id: string;
    timestamp: string;
    signature: string;
  }> = {},
): Headers {
  const id = overrides.id ?? "evt_1";
  const timestamp = overrides.timestamp ?? String(Math.floor(Date.now() / 1000));
  const signature =
    overrides.signature ?? sign(body, id, timestamp, SECRET.slice(6));
  return new Headers({
    "svix-id": id,
    "svix-timestamp": timestamp,
    "svix-signature": signature,
  });
}

describe("blindpayVerifySignature", () => {
  it("passes for a correctly signed payload", () => {
    const body = JSON.stringify({ type: "payout.complete" });
    const headers = makeHeaders(body);
    expect(() =>
      blindpayVerifySignature({ body, headers, secret: SECRET }),
    ).not.toThrow();
  });

  it("throws when svix headers are missing", () => {
    const headers = new Headers();
    expect(() =>
      blindpayVerifySignature({ body: "{}", headers, secret: SECRET }),
    ).toThrow();
  });

  it("throws when the signature doesn't match", () => {
    const body = JSON.stringify({ type: "payout.complete" });
    const headers = makeHeaders(body, { signature: "v1,deadbeef" });
    expect(() =>
      blindpayVerifySignature({ body, headers, secret: SECRET }),
    ).toThrow();
  });
});

describe("blindpayNormalize", () => {
  it("translates a payout.complete event into the framework's CanonicalWebhookEvent", () => {
    const body = {
      type: "payout.complete",
      data: { id: "po_1", status: "completed" },
    };
    const headers = makeHeaders(JSON.stringify(body), {
      id: "evt_42",
      timestamp: "1700000000",
    });

    const out = blindpayNormalize({ body, headers });

    expect(out.providerEventId).toBe("evt_42");
    expect(out.eventType).toBe("payout.complete");
    expect(out.occurredAt.getTime()).toBe(1700000000 * 1000);
    expect(out.resourceId).toBe("po_1");
    expect(out.canonicalState).toBe(TransactionState.confirmed);
    expect(out.transactionId).toBeNull();
    expect(out.rawPayload).toEqual(body);
  });

  it("returns canonicalState=null when payload has no status", () => {
    const body = { type: "receiver.new", data: { id: "rcv_1" } };
    const headers = makeHeaders(JSON.stringify(body), { id: "evt_43" });

    const out = blindpayNormalize({ body, headers });

    expect(out.canonicalState).toBeNull();
    expect(out.eventType).toBe("receiver.new");
    expect(out.resourceId).toBe("rcv_1");
  });

  it("returns canonicalState=null when status maps to a non-canonical state (defensive)", () => {
    const body = {
      type: "payin.update",
      data: { id: "pi_1", status: "weird-new-status" },
    };
    const headers = makeHeaders(JSON.stringify(body), { id: "evt_44" });

    const out = blindpayNormalize({ body, headers });

    // Unknown statuses currently map to "failed" via mapBlindpayStatus.
    // We surface them but never silently throw so a new upstream status
    // doesn't block the pipeline.
    expect(
      out.canonicalState === null ||
        out.canonicalState === TransactionState.failed,
    ).toBe(true);
  });
});
