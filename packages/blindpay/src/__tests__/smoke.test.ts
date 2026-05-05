/**
 * Smoke test: the public surface compiles and re-exports the expected
 * symbols. Catches accidental drift from the documented API.
 */

import { describe, expect, it } from "vitest";

import * as pkg from "../index";

describe("@dynamic-demos/blindpay public surface", () => {
  it("exports the documented top-level symbols", () => {
    expect(typeof pkg.createBlindpayClient).toBe("function");
    expect(typeof pkg.resolveBlindpayApiUrl).toBe("function");
    expect(typeof pkg.mapBlindpayStatus).toBe("function");
    expect(pkg.DEFAULT_BLINDPAY_API_URL).toBe("https://api.blindpay.com/v1");
    expect(pkg.CanonicalTransactionStatePlaceholder.confirmed).toBe(
      "confirmed",
    );
  });

  it("namespaces webhook helpers under `webhooks`", () => {
    expect(typeof pkg.webhooks.verifySignature).toBe("function");
    expect(typeof pkg.webhooks.normalize).toBe("function");
  });

  it("requires credentials when constructing a client", () => {
    expect(() =>
      pkg.createBlindpayClient({
        env: "sandbox",
        // @ts-expect-error — missing instanceId by design.
        instanceId: undefined,
        apiKey: "key",
      }),
    ).toThrow(/instanceId/);

    expect(() =>
      pkg.createBlindpayClient({
        env: "sandbox",
        instanceId: "in_123",
        // @ts-expect-error — missing apiKey by design.
        apiKey: undefined,
      }),
    ).toThrow(/apiKey/);
  });

  it("defaults env to sandbox per D-005", () => {
    const client = pkg.createBlindpayClient({
      instanceId: "in_123",
      apiKey: "key",
      fetchImpl: () => Promise.reject(new Error("not used")),
    });
    expect(client.env).toBe("sandbox");
    expect(client.apiUrl).toBe("https://api.blindpay.com/v1");
    expect(client.instanceId).toBe("in_123");
  });
});
