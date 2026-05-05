import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  COINBASE_ONRAMP_SIGNATURE_HEADER,
  normalizeCoinbaseOnrampEvent,
  verifyCoinbaseOnrampWebhookSignature,
} from "../webhooks";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, "fixtures", "order-completed.json");
const fixtureRaw = readFileSync(fixturePath, "utf-8");
const fixtureEvent = JSON.parse(fixtureRaw);

const SECRET = "shh-this-is-a-test-secret";

function sign(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

describe("verifyCoinbaseOnrampWebhookSignature", () => {
  it("verifies a valid hex signature against the raw body", () => {
    const signature = sign(fixtureRaw, SECRET);
    expect(
      verifyCoinbaseOnrampWebhookSignature({
        rawBody: fixtureRaw,
        signatureHeader: signature,
        secret: SECRET,
      }),
    ).toBe(true);
  });

  it("accepts a `sha256=` prefix", () => {
    const signature = sign(fixtureRaw, SECRET);
    expect(
      verifyCoinbaseOnrampWebhookSignature({
        rawBody: fixtureRaw,
        signatureHeader: `sha256=${signature}`,
        secret: SECRET,
      }),
    ).toBe(true);
  });

  it("rejects when the signature was generated with a different secret", () => {
    const signature = sign(fixtureRaw, "different-secret");
    expect(
      verifyCoinbaseOnrampWebhookSignature({
        rawBody: fixtureRaw,
        signatureHeader: signature,
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("rejects when the body has been tampered with", () => {
    const signature = sign(fixtureRaw, SECRET);
    const tampered = fixtureRaw.replace("100.00", "0.01");
    expect(
      verifyCoinbaseOnrampWebhookSignature({
        rawBody: tampered,
        signatureHeader: signature,
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it.each<{ header: string | null; description: string }>([
    { header: null, description: "missing header" },
    { header: "", description: "empty header" },
    { header: "not-hex!!", description: "non-hex characters" },
  ])("rejects $description", ({ header }) => {
    expect(
      verifyCoinbaseOnrampWebhookSignature({
        rawBody: fixtureRaw,
        signatureHeader: header,
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("exposes the canonical signature header constant", () => {
    expect(COINBASE_ONRAMP_SIGNATURE_HEADER).toBe("X-Webhook-Signature");
  });
});

describe("normalizeCoinbaseOnrampEvent", () => {
  it("translates a completed-order fixture into a canonical event", () => {
    const normalized = normalizeCoinbaseOnrampEvent(fixtureEvent);
    expect(normalized.eventId).toBe("evt_01J0FAKEEVENTID000000000000");
    expect(normalized.orderId).toBe("ord_01J0FAKEORDERID00000000000");
    expect(normalized.providerStatus).toBe("completed");
    expect(normalized.canonicalState).toBe("confirmed");
    expect(normalized.raw).toBe(fixtureEvent);
  });

  it("returns null fields when the event is missing data", () => {
    const normalized = normalizeCoinbaseOnrampEvent({});
    expect(normalized.eventId).toBeNull();
    expect(normalized.orderId).toBeNull();
    expect(normalized.providerStatus).toBeNull();
    expect(normalized.canonicalState).toBeNull();
  });

  it("flags unknown provider statuses with a null canonical state", () => {
    const normalized = normalizeCoinbaseOnrampEvent({
      data: { status: "midnight-blue" },
    });
    expect(normalized.providerStatus).toBe("midnight-blue");
    expect(normalized.canonicalState).toBeNull();
  });
});
