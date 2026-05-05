/**
 * Smoke test — public surface compiles and exports expected symbols.
 */

import { describe, it, expect } from "vitest";

import * as coinbaseOnramp from "../index";

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
});
