/**
 * Smoke test — public surface compiles and exports as expected.
 *
 * If `@dynamic-demos/lifi` ever stops shipping these symbols, the
 * downstream dashboard handler / checkouts hook will break at build
 * time, but this catches it earlier in the package's own CI lane.
 */

import { describe, expect, it } from "vitest";
import * as lifi from "./index";

describe("public surface", () => {
  it("exports the REST client factory and verbs", () => {
    expect(typeof lifi.createLifiClient).toBe("function");
    expect(typeof lifi.getQuote).toBe("function");
    expect(typeof lifi.getStatus).toBe("function");
    expect(typeof lifi.LifiError).toBe("function");
  });

  it("exports environment helpers", () => {
    expect(typeof lifi.resolveLifiApiUrl).toBe("function");
    expect(lifi.LIFI_DEFAULT_API_URL).toBe("https://li.quest/v1");
    expect(lifi.resolveLifiApiUrl("sandbox")).toBe(lifi.LIFI_DEFAULT_API_URL);
    expect(lifi.resolveLifiApiUrl("production")).toBe(
      lifi.LIFI_DEFAULT_API_URL,
    );
  });

  it("exports the SDK-config helper", () => {
    expect(typeof lifi.configureLifi).toBe("function");
  });

  it("exports the state-mapping helpers", () => {
    expect(typeof lifi.mapLifiStatus).toBe("function");
    expect(typeof lifi.mapLifiStatusResult).toBe("function");
  });

  it("exports a webhooks namespace with the placeholder helpers", () => {
    expect(typeof lifi.webhooks.verifySignature).toBe("function");
    expect(typeof lifi.webhooks.normalize).toBe("function");
  });
});

describe("createLifiClient", () => {
  it("applies sensible defaults and is sandbox-by-default capable", () => {
    const client = lifi.createLifiClient({
      env: "sandbox",
      apiKey: "test-key",
      integrator: "test-integrator",
    });

    expect(client.env).toBe("sandbox");
    expect(client.apiUrl).toBe("https://li.quest/v1");
    expect(client.apiKey).toBe("test-key");
    expect(client.integrator).toBe("test-integrator");
    expect(client.defaultFee).toBe(0.05);
  });

  it("respects explicit overrides", () => {
    const client = lifi.createLifiClient({
      env: "production",
      apiKey: "key",
      integrator: "demo",
      defaultFee: 0.01,
      apiUrl: "https://example.test/v1",
    });

    expect(client.defaultFee).toBe(0.01);
    expect(client.apiUrl).toBe("https://example.test/v1");
  });
});
