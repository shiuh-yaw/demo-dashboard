import { describe, it, expect } from "vitest";

import { resolveCoinbaseOnrampEndpoint } from "../env";

describe("resolveCoinbaseOnrampEndpoint", () => {
  it("flags sandbox by default for the 'sandbox' environment", () => {
    const endpoint = resolveCoinbaseOnrampEndpoint("sandbox");
    expect(endpoint.host).toBe("api.cdp.coinbase.com");
    expect(endpoint.basePath).toBe("/platform/v2/onramp");
    expect(endpoint.isSandbox).toBe(true);
  });

  it("flags production routing for the 'production' environment", () => {
    const endpoint = resolveCoinbaseOnrampEndpoint("production");
    expect(endpoint.host).toBe("api.cdp.coinbase.com");
    expect(endpoint.isSandbox).toBe(false);
  });
});
