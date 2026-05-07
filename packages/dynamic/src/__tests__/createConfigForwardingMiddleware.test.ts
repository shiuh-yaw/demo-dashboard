import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { createConfigForwardingMiddleware } from "../createConfigForwardingMiddleware";

function makeRequest(
  url: string,
  cookies: Record<string, string> = {},
): NextRequest {
  const req = new NextRequest(url);
  for (const [name, value] of Object.entries(cookies)) {
    req.cookies.set(name, value);
  }
  return req;
}

const middleware = createConfigForwardingMiddleware({ demoType: "wallet" });

describe("createConfigForwardingMiddleware", () => {
  it("forwards ?id= as x-wallet-config-id header", () => {
    const res = middleware(makeRequest("https://app/?id=brandX"));
    const forwarded = res.headers.get("x-middleware-request-x-wallet-config-id");
    expect(forwarded).toBe("brandX");
  });

  it("sets sticky cookie when ?id= is present", () => {
    const res = middleware(makeRequest("https://app/?id=brandX"));
    const cookie = res.cookies.get("wallet_config_id");
    expect(cookie?.value).toBe("brandX");
    expect(cookie?.maxAge).toBe(30 * 24 * 60 * 60);
  });

  it("forwards header from cookie when ?id= absent", () => {
    const res = middleware(
      makeRequest("https://app/", { wallet_config_id: "brandY" }),
    );
    const forwarded = res.headers.get("x-middleware-request-x-wallet-config-id");
    expect(forwarded).toBe("brandY");
  });

  it("query overrides cookie", () => {
    const res = middleware(
      makeRequest("https://app/?id=brandQ", { wallet_config_id: "brandC" }),
    );
    const forwarded = res.headers.get("x-middleware-request-x-wallet-config-id");
    expect(forwarded).toBe("brandQ");
  });

  it("empty ?id= clears the cookie", () => {
    const res = middleware(
      makeRequest("https://app/?id=", { wallet_config_id: "brandY" }),
    );
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(/wallet_config_id=;/);
  });

  it("no ?id= and no cookie → no header set", () => {
    const res = middleware(makeRequest("https://app/"));
    const forwarded = res.headers.get("x-middleware-request-x-wallet-config-id");
    expect(forwarded).toBeNull();
  });

  it("custom demoType normalizes hyphens to underscores in cookie name", () => {
    const mw = createConfigForwardingMiddleware({ demoType: "cross-border-ap-ar" });
    const res = mw(makeRequest("https://app/?id=brandX"));
    expect(res.cookies.get("cross_border_ap_ar_config_id")?.value).toBe("brandX");
  });

  it("custom demoType uses hyphens in header name", () => {
    const mw = createConfigForwardingMiddleware({ demoType: "cross-border-ap-ar" });
    const res = mw(makeRequest("https://app/?id=brandX"));
    expect(
      res.headers.get("x-middleware-request-x-cross-border-ap-ar-config-id"),
    ).toBe("brandX");
  });
});
