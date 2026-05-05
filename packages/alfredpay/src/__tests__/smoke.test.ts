import { describe, expect, it } from "vitest";

import * as alfredpay from "../index";

/**
 * Smoke test — exercises the package's public surface as advertised in
 * `docs/projects/demo-meta-system/phases/01b-providers.md` (sub-prompt
 * 1B-alfredpay). If any of these exports go missing the dashboard's
 * orchestration API will break at build time; this test catches it sooner.
 */
describe("@dynamic-demos/alfredpay public surface", () => {
  it("exports the documented client factory + offramp helpers", () => {
    expect(typeof alfredpay.createAlfredpayClient).toBe("function");
    expect(typeof alfredpay.createOfframp).toBe("function");
    expect(typeof alfredpay.getOfframpStatus).toBe("function");
  });

  it("exports the webhook namespace with verify + normalize", () => {
    expect(alfredpay.webhooks).toBeDefined();
    expect(typeof alfredpay.webhooks.verifySignature).toBe("function");
    expect(typeof alfredpay.webhooks.normalize).toBe("function");
  });

  it("exports the canonical state mapping helper", () => {
    expect(typeof alfredpay.mapAlfredpayStatusToCanonical).toBe("function");
  });

  it("exports the alfredpay environment helpers", () => {
    expect(typeof alfredpay.resolveAlfredpayBaseUrl).toBe("function");
    expect(alfredpay.resolveAlfredpayBaseUrl("sandbox")).toMatch(/^https?:\/\//);
    expect(alfredpay.resolveAlfredpayBaseUrl("production")).toMatch(/^https?:\/\//);
  });
});
