/**
 * Smoke test — public surface compiles and exports expected symbols.
 */

import { describe, it, expect, vi } from "vitest";

import * as coinbaseOnramp from "../index";

vi.mock("@coinbase/cdp-sdk/auth", () => ({
  generateJwt: vi.fn(async () => "test-jwt-token"),
}));

describe("@dynamic-demos/coinbase-onramp public surface", () => {
  it("exports the documented runtime symbols", () => {
    expect(typeof coinbaseOnramp.createCoinbaseOnrampClient).toBe("function");
    expect(typeof coinbaseOnramp.createOnrampOrder).toBe("function");
    expect(typeof coinbaseOnramp.resolveCoinbaseOnrampEndpoint).toBe("function");
    expect(typeof coinbaseOnramp.mapCoinbaseOnrampStatus).toBe("function");
    expect(typeof coinbaseOnramp.normalizeCoinbaseOnrampEvent).toBe("function");
    expect(typeof coinbaseOnramp.verifyCoinbaseOnrampWebhookSignature).toBe(
      "function",
    );
    expect(coinbaseOnramp.COINBASE_ONRAMP_SIGNATURE_HEADER).toBe(
      "X-Webhook-Signature",
    );
    expect(coinbaseOnramp.CoinbaseError.prototype).toBeInstanceOf(Error);
  });

  it("exposes the Zod schemas", () => {
    expect(coinbaseOnramp.createOnrampOrderApiSchema).toBeDefined();
    expect(coinbaseOnramp.createOnrampOrderValidationSchema).toBeDefined();
  });

  it("CoinbaseOnrampClient exposes request + generateToken escape hatches", () => {
    const client = coinbaseOnramp.createCoinbaseOnrampClient({
      env: "sandbox",
      apiKey: "test-key",
      apiSecret: "test-secret",
    });
    expect(typeof client.request).toBe("function");
    expect(typeof client.generateToken).toBe("function");
    expect(client.env).toBe("sandbox");
    expect(client.endpoint).toBeDefined();
  });

  it("MockCoinbaseOnrampClient mirrors the CoinbaseOnrampClient surface", () => {
    const mock = new coinbaseOnramp.MockCoinbaseOnrampClient();
    expect(typeof mock.request).toBe("function");
    expect(typeof mock.generateToken).toBe("function");
    expect(mock.env).toBe("sandbox");
    expect(mock.endpoint).toBeDefined();
  });
});
