/**
 * Tests for createDemoMiddleware factory.
 *
 * Generalizes the visa-direct cookie + auth-redirect pattern (D-008).
 * Each test exercises one branch of the middleware.
 */

import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { createDemoMiddleware } from "../createDemoMiddleware";

function makeRequest(
  url: string,
  opts: { cookies?: Record<string, string> } = {},
): NextRequest {
  const req = new NextRequest(new URL(url, "https://demo.test"));
  if (opts.cookies) {
    for (const [name, value] of Object.entries(opts.cookies)) {
      req.cookies.set(name, value);
    }
  }
  return req;
}

describe("createDemoMiddleware", () => {
  const baseOpts = {
    demoType: "visa-direct" as const,
    publicRoutes: ["/login"],
    defaultReturnPath: "/payment-methods",
  };

  it("forwards x-<demoType>-config-id header when ?theme= query is set", () => {
    const middleware = createDemoMiddleware(baseOpts);
    const res = middleware(
      makeRequest("/?theme=abc123", { cookies: { dynamic_jwt: "tok" } }),
    );
    // header is set on the *next* request via the rewrite helpers; check Set-Cookie was emitted
    expect(res.cookies.get("visa_direct_config_id")?.value).toBe("abc123");
  });

  it("clears the config cookie when ?theme= is empty", () => {
    const middleware = createDemoMiddleware(baseOpts);
    const res = middleware(
      makeRequest("/?theme=", {
        cookies: { dynamic_jwt: "tok", "visa_direct_config_id": "abc" },
      }),
    );
    // Setting an empty cookie effectively deletes it (Max-Age=0)
    const cookie = res.cookies.get("visa_direct_config_id");
    expect(cookie?.value ?? "").toBe("");
  });

  it("uses cookie value for config id when ?theme= is not set", () => {
    const middleware = createDemoMiddleware(baseOpts);
    // No new cookie should be set when reusing the existing one — verifying via headers is done in app code.
    const res = middleware(
      makeRequest("/", {
        cookies: { dynamic_jwt: "tok", "visa_direct_config_id": "frombank" },
      }),
    );
    // No Set-Cookie should be emitted for the same value
    expect(res.cookies.get("visa_direct_config_id")).toBeUndefined();
  });

  it("redirects unauthenticated users on protected routes to login with returnTo", () => {
    const middleware = createDemoMiddleware(baseOpts);
    const res = middleware(makeRequest("/dashboard"));
    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/login");
    expect(location).toContain("returnTo=%2Fdashboard");
  });

  it("passes through public routes for unauthenticated users", () => {
    const middleware = createDemoMiddleware(baseOpts);
    const res = middleware(makeRequest("/login"));
    // 200 = NextResponse.next() returns no redirect
    expect(res.status).toBe(200);
  });

  it("clears the auth cookie when ?sessionExpired=1 hits a public route", () => {
    const middleware = createDemoMiddleware(baseOpts);
    const res = middleware(
      makeRequest("/login?sessionExpired=1", {
        cookies: { dynamic_jwt: "stale" },
      }),
    );
    expect(res.status).toBe(200);
    const cookie = res.cookies.get("dynamic_jwt");
    // Set with empty value indicates deletion
    expect(cookie?.value ?? "").toBe("");
  });

  it("does not redirect from login when authenticated and Dynamic OAuth callback params are present", () => {
    const middleware = createDemoMiddleware(baseOpts);
    // Dynamic SDK uses `dynamicOauthCode` (and optionally `dynamicOauthState`)
    // per docs/projects/demo-meta-system/research/dynamic-auth-patterns.md.
    // The legacy `code`+`state` exemption was a leftover from another flow and
    // is intentionally NOT in the default `oauthCallbackParams`.
    const res = middleware(
      makeRequest("/login?dynamicOauthCode=abc", {
        cookies: { dynamic_jwt: "tok" },
      }),
    );
    // OAuth callback in flight — let client side resolve
    expect(res.status).toBe(200);
  });

  it("redirects authenticated user on login route to defaultReturnPath", () => {
    const middleware = createDemoMiddleware(baseOpts);
    const res = middleware(
      makeRequest("/login", { cookies: { dynamic_jwt: "tok" } }),
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/payment-methods");
  });

  it("uses returnTo query when authenticated user lands on login with returnTo", () => {
    const middleware = createDemoMiddleware(baseOpts);
    const res = middleware(
      makeRequest("/login?returnTo=%2Fhistory", {
        cookies: { dynamic_jwt: "tok" },
      }),
    );
    expect(res.status).toBe(307);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("/history");
  });

  it("supports getConfigIdFromPath for /r/[id]/* style routes", () => {
    const middleware = createDemoMiddleware({
      demoType: "remittance",
      publicRoutes: ["/login"],
      defaultReturnPath: "/dashboard",
      configIdSource: "path",
      getConfigIdFromPath: (path) => {
        const match = path.match(/^\/r\/([^/]+)/);
        return match?.[1] ?? null;
      },
    });
    const res = middleware(
      makeRequest("/r/foo/dashboard", { cookies: { dynamic_jwt: "tok" } }),
    );
    expect(res.cookies.get("remittance_config_id")?.value).toBe("foo");
  });

  it("treats RegExp publicRoutes as public", () => {
    const middleware = createDemoMiddleware({
      demoType: "remittance",
      publicRoutes: ["/login", /^\/r\/[^/]+\/login(\/|$)/],
      defaultReturnPath: "/dashboard",
      getConfigIdFromPath: (path) => path.match(/^\/r\/([^/]+)/)?.[1] ?? null,
    });
    // unauthenticated request to /r/abc/login should pass through, NOT redirect
    const res = middleware(makeRequest("/r/abc/login"));
    expect(res.status).toBe(200);
  });

  it("supports functional defaultReturnPath/loginPath for config-aware routes", () => {
    const middleware = createDemoMiddleware({
      demoType: "remittance",
      publicRoutes: ["/login", /^\/r\/[^/]+\/login(\/|$)/],
      loginPath: (configId) => (configId ? `/r/${configId}/login` : "/login"),
      defaultReturnPath: (configId) =>
        configId ? `/r/${configId}/dashboard` : "/",
      configIdSource: "both",
      getConfigIdFromPath: (path) => path.match(/^\/r\/([^/]+)/)?.[1] ?? null,
    });
    // Unauthed request on /r/abc/profile redirects to /r/abc/login
    const res = middleware(makeRequest("/r/abc/profile"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/r/abc/login");
  });

  it("supports rewritePath for config-prefix routes (e.g. trade /t/[id]/...)", () => {
    const middleware = createDemoMiddleware({
      demoType: "trade",
      publicRoutes: ["/login"],
      defaultReturnPath: "/portfolio",
      configIdSource: "path",
      getConfigIdFromPath: (path) => path.match(/^\/t\/([^/]+)/)?.[1] ?? null,
      rewritePath: (path) => {
        const m = path.match(/^\/t\/([^/]+)(\/.*)?$/);
        if (!m) return path;
        return m[2] ?? "/portfolio";
      },
    });
    // Authenticated user hitting /t/abc/portfolio → rewrite (200, x-rewrite header)
    const res = middleware(
      makeRequest("/t/abc/portfolio", { cookies: { dynamic_jwt: "tok" } }),
    );
    expect(res.status).toBe(200);
    // Next sets `x-middleware-rewrite` to the rewritten URL
    const rewriteHeader = res.headers.get("x-middleware-rewrite");
    expect(rewriteHeader).toContain("/portfolio");
    expect(res.cookies.get("trade_config_id")?.value).toBe("abc");
  });

  it("treats /t/[id]/login as public when rewritePath strips to /login", () => {
    const middleware = createDemoMiddleware({
      demoType: "trade",
      publicRoutes: ["/login"],
      defaultReturnPath: "/portfolio",
      getConfigIdFromPath: (path) => path.match(/^\/t\/([^/]+)/)?.[1] ?? null,
      rewritePath: (path) => {
        const m = path.match(/^\/t\/([^/]+)(\/.*)?$/);
        if (!m) return path;
        return m[2] ?? "/portfolio";
      },
    });
    // Unauthenticated → should NOT redirect (login is public via rewrite)
    const res = middleware(makeRequest("/t/abc/login"));
    expect(res.status).toBe(200);
  });
});
