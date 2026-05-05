import { describe, expect, it } from "vitest";

import { resolveAlfredpayBaseUrl } from "../env";

describe("resolveAlfredpayBaseUrl", () => {
  it("returns the alfredPay sandbox host for env='sandbox'", () => {
    expect(resolveAlfredpayBaseUrl("sandbox")).toBe(
      "https://api.sandbox.alfredpay.io",
    );
  });

  it("returns the alfredPay production host for env='production'", () => {
    expect(resolveAlfredpayBaseUrl("production")).toBe(
      "https://api.alfredpay.io",
    );
  });

  it("honors a baseUrl override regardless of env", () => {
    expect(
      resolveAlfredpayBaseUrl("sandbox", "https://custom.example/v1"),
    ).toBe("https://custom.example/v1");
    expect(
      resolveAlfredpayBaseUrl("production", "https://custom.example/v1"),
    ).toBe("https://custom.example/v1");
  });
});
