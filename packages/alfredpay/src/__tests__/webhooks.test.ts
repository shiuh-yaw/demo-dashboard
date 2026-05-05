import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import { normalize, verifySignature } from "../webhooks";

const __dirname = dirname(fileURLToPath(import.meta.url));

const FIXTURE_PATH = join(__dirname, "fixtures", "offramp.completed.json");
const FIXTURE_BODY = readFileSync(FIXTURE_PATH, "utf8").trim();
const FIXTURE = JSON.parse(FIXTURE_BODY);

const SECRET = "whsec_test_alfredpay_secret_for_unit_tests";

/**
 * Reproduces alfredPay's documented signature header format.
 *
 * Header: `alfredpay-signature: t=<unix-seconds>,v1=<hex(hmac-sha256)>`
 * Signed payload: `${unixSeconds}.${rawBody}`
 *
 * Mirrors the readme.io-standard scheme (Stripe-style) until the partner's
 * webhook docs settle on a different format — the public surface is stable
 * regardless of the inner hashing.
 */
function signFixture(
  body: string,
  secret: string,
  timestampSeconds: number,
): string {
  const toSign = `${timestampSeconds}.${body}`;
  const hex = createHmac("sha256", secret).update(toSign).digest("hex");
  return `t=${timestampSeconds},v1=${hex}`;
}

describe("webhooks.verifySignature", () => {
  it("returns true for a correctly-signed fixture within tolerance", async () => {
    const now = Math.floor(Date.parse("2026-04-29T12:35:00.000Z") / 1000);
    const signature = signFixture(FIXTURE_BODY, SECRET, now);

    const headers = new Headers({ "alfredpay-signature": signature });
    const ok = await verifySignature(
      { body: FIXTURE_BODY, headers },
      { secret: SECRET, now: () => now * 1000 },
    );
    expect(ok).toBe(true);
  });

  it("rejects a request whose signature was computed against a different body", async () => {
    const now = Math.floor(Date.parse("2026-04-29T12:35:00.000Z") / 1000);
    const signature = signFixture(FIXTURE_BODY, SECRET, now);

    const headers = new Headers({ "alfredpay-signature": signature });
    const tampered = FIXTURE_BODY.replace("completed", "received");
    const ok = await verifySignature(
      { body: tampered, headers },
      { secret: SECRET, now: () => now * 1000 },
    );
    expect(ok).toBe(false);
  });

  it("rejects a request signed with the wrong secret", async () => {
    const now = Math.floor(Date.parse("2026-04-29T12:35:00.000Z") / 1000);
    const signature = signFixture(FIXTURE_BODY, "whsec_wrong", now);

    const headers = new Headers({ "alfredpay-signature": signature });
    const ok = await verifySignature(
      { body: FIXTURE_BODY, headers },
      { secret: SECRET, now: () => now * 1000 },
    );
    expect(ok).toBe(false);
  });

  it("rejects a request whose timestamp falls outside the tolerance window", async () => {
    const oldTs = Math.floor(Date.parse("2026-04-29T12:35:00.000Z") / 1000);
    const signature = signFixture(FIXTURE_BODY, SECRET, oldTs);

    // Now is 10 minutes later; default tolerance is 5 minutes.
    const nowMs = (oldTs + 10 * 60) * 1000;
    const headers = new Headers({ "alfredpay-signature": signature });
    const ok = await verifySignature(
      { body: FIXTURE_BODY, headers },
      { secret: SECRET, now: () => nowMs },
    );
    expect(ok).toBe(false);
  });

  it("rejects a request missing the alfredpay-signature header", async () => {
    const ok = await verifySignature(
      { body: FIXTURE_BODY, headers: new Headers() },
      { secret: SECRET, now: () => Date.now() },
    );
    expect(ok).toBe(false);
  });

  it("rejects a malformed signature header", async () => {
    const headers = new Headers({ "alfredpay-signature": "not-a-real-sig" });
    const ok = await verifySignature(
      { body: FIXTURE_BODY, headers },
      { secret: SECRET, now: () => Date.now() },
    );
    expect(ok).toBe(false);
  });

  it("requires a non-empty secret", async () => {
    const headers = new Headers({ "alfredpay-signature": "t=0,v1=deadbeef" });
    await expect(
      verifySignature(
        { body: FIXTURE_BODY, headers },
        { secret: "", now: () => Date.now() },
      ),
    ).rejects.toThrow(/secret is required/i);
  });
});

describe("webhooks.normalize", () => {
  it("translates the fixture into a canonical event shape", () => {
    const canonical = normalize(FIXTURE);

    expect(canonical.provider).toBe("alfredpay");
    expect(canonical.providerEventId).toBe(FIXTURE.id);
    expect(canonical.providerEventType).toBe("offramp.completed");
    expect(canonical.resourceId).toBe(FIXTURE.data.id);
    expect(canonical.upstreamStatus).toBe("completed");
    expect(canonical.dedupeKey).toBe(`alfredpay:${FIXTURE.id}`);
    expect(canonical.raw).toEqual(FIXTURE);
  });

  it("preserves status when the inner status is missing", () => {
    const event = { ...FIXTURE, data: { ...FIXTURE.data, status: undefined } };
    const canonical = normalize(event);
    expect(canonical.upstreamStatus).toBeUndefined();
    expect(canonical.resourceId).toBe(FIXTURE.data.id);
  });
});
