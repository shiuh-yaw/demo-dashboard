/**
 * Characterization tests for apps/remittance/middleware.ts.
 *
 * Locks down current pre-Phase-1D behavior. After Phase 1D rebases on top, these
 * tests gate whether the refactor preserved the contract.
 *
 * Notable: remittance does NOT set a config cookie — it only forwards
 * `x-remittance-config-id` (resolved from the /r/<id>/* path or ?id= query).
 */

import { describe, expect, test } from "vitest";
import { middleware, config as middlewareConfig } from "../middleware";
import { getForwardedRequestHeader, isRedirect, makeRequest } from "./_helpers";

const HEADER = "x-remittance-config-id";
const AUTH = { dynamic_jwt: "fake.jwt.token" };

describe("remittance middleware — public route /login", () => {
  test("A. unauthenticated GET /login -> NextResponse.next() (no redirect)", () => {
    const res = middleware(makeRequest({ url: "/login" }));
    expect(isRedirect(res)).toBe(false);
  });

  test("E. authenticated GET /login -> redirect to / (no returnTo, no config)", () => {
    const res = middleware(makeRequest({ url: "/login", cookies: AUTH }));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") as string).pathname).toBe("/");
  });

  test("E. authenticated GET /login?returnTo=/dashboard -> redirect to /dashboard", () => {
    const res = middleware(
      makeRequest({ url: "/login?returnTo=/dashboard", cookies: AUTH }),
    );
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") as string).pathname).toBe(
      "/dashboard",
    );
  });

  test("E. authenticated GET /login?returnTo=foo (relative w/o leading slash) -> /foo", () => {
    const res = middleware(
      makeRequest({ url: "/login?returnTo=foo", cookies: AUTH }),
    );
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") as string).pathname).toBe(
      "/foo",
    );
  });

  test("E. authenticated GET /login with sessionExpired -> passthrough and clear dynamic_jwt", () => {
    const res = middleware(
      makeRequest({ url: "/login?sessionExpired=1", cookies: AUTH }),
    );
    expect(isRedirect(res)).toBe(false);
    expect(res.cookies.get("dynamic_jwt")?.value).toBe("");
  });

  test("E. OAuth callback (?dynamicOauthCode=...) on /login is NOT redirected", () => {
    const res = middleware(
      makeRequest({ url: "/login?dynamicOauthCode=abc", cookies: AUTH }),
    );
    expect(isRedirect(res)).toBe(false);
  });

  test("E. OAuth callback (?code=...&state=...) on /login is NOT redirected", () => {
    const res = middleware(
      makeRequest({ url: "/login?code=abc&state=xyz", cookies: AUTH }),
    );
    expect(isRedirect(res)).toBe(false);
  });
});

describe("remittance middleware — public config-route login /r/[id]/login", () => {
  test("A. unauthenticated GET /r/abc/login -> passthrough; header forwarded", () => {
    const res = middleware(makeRequest({ url: "/r/abc/login" }));
    expect(isRedirect(res)).toBe(false);
    expect(getForwardedRequestHeader(res, HEADER)).toBe("abc");
  });

  test("E. authenticated GET /r/abc/login -> redirect to /r/abc/dashboard", () => {
    const res = middleware(
      makeRequest({ url: "/r/abc/login", cookies: AUTH }),
    );
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") as string).pathname).toBe(
      "/r/abc/dashboard",
    );
  });

  test("E. authenticated /r/abc/login?returnTo=/foo -> redirect to /foo", () => {
    const res = middleware(
      makeRequest({
        url: "/r/abc/login?returnTo=/foo",
        cookies: AUTH,
      }),
    );
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") as string).pathname).toBe(
      "/foo",
    );
  });

  test("E. authenticated /r/abc/login?sessionExpired -> passthrough; clear dynamic_jwt", () => {
    const res = middleware(
      makeRequest({
        url: "/r/abc/login?sessionExpired=1",
        cookies: AUTH,
      }),
    );
    expect(isRedirect(res)).toBe(false);
    expect(res.cookies.get("dynamic_jwt")?.value).toBe("");
  });
});

describe("remittance middleware — auth gate on protected routes", () => {
  test("B. unauthenticated GET /dashboard -> redirect to /login with returnTo=/dashboard", () => {
    const res = middleware(makeRequest({ url: "/dashboard" }));
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get("location") as string);
    expect(loc.pathname).toBe("/login");
    expect(loc.searchParams.get("returnTo")).toBe("/dashboard");
  });

  test("B. unauthenticated GET /dashboard/ (trailing slash) -> returnTo strips trailing slash", () => {
    const res = middleware(makeRequest({ url: "/dashboard/" }));
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get("location") as string);
    expect(loc.searchParams.get("returnTo")).toBe("/dashboard");
  });

  test("B. unauthenticated GET / -> redirect to /login with returnTo=/", () => {
    const res = middleware(makeRequest({ url: "/" }));
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get("location") as string);
    expect(loc.pathname).toBe("/login");
    expect(loc.searchParams.get("returnTo")).toBe("/");
  });

  test("B. unauthenticated GET /dashboard?id=brandX -> returnTo carries the id query", () => {
    const res = middleware(makeRequest({ url: "/dashboard?id=brandX" }));
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get("location") as string);
    expect(loc.pathname).toBe("/login");
    expect(loc.searchParams.get("returnTo")).toBe("/dashboard?id=brandX");
  });

  test("B. unauthenticated GET /r/abc/dashboard -> redirect to /r/abc/login with returnTo", () => {
    const res = middleware(makeRequest({ url: "/r/abc/dashboard" }));
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get("location") as string);
    expect(loc.pathname).toBe("/r/abc/login");
    expect(loc.searchParams.get("returnTo")).toBe("/r/abc/dashboard");
  });
});

describe("remittance middleware — authenticated request pass-through", () => {
  test("C. authenticated GET /dashboard -> passthrough (no redirect)", () => {
    const res = middleware(makeRequest({ url: "/dashboard", cookies: AUTH }));
    expect(isRedirect(res)).toBe(false);
  });

  test("authenticated request forwards x-pathname header", () => {
    const res = middleware(makeRequest({ url: "/dashboard", cookies: AUTH }));
    expect(getForwardedRequestHeader(res, "x-pathname")).toBe("/dashboard");
  });
});

describe("remittance middleware — D. config-id header forwarding (path + query)", () => {
  test("?id=brandX on protected route -> forwards x-remittance-config-id", () => {
    const res = middleware(
      makeRequest({ url: "/dashboard?id=brandX", cookies: AUTH }),
    );
    expect(isRedirect(res)).toBe(false);
    expect(getForwardedRequestHeader(res, HEADER)).toBe("brandX");
  });

  test("/r/abc/* path -> forwards x-remittance-config-id=abc (path takes precedence)", () => {
    const res = middleware(
      makeRequest({ url: "/r/abc/dashboard?id=other", cookies: AUTH }),
    );
    expect(isRedirect(res)).toBe(false);
    expect(getForwardedRequestHeader(res, HEADER)).toBe("abc");
  });

  test("remittance does NOT set a config cookie (header-only forwarding)", () => {
    const res = middleware(
      makeRequest({ url: "/dashboard?id=brandX", cookies: AUTH }),
    );
    // No remittance_config_id (or any other config) cookie is set by middleware.
    expect(res.cookies.get("remittance_config_id")).toBeUndefined();
  });
});

describe("remittance middleware — F. matcher", () => {
  test("matcher excludes /api, _next, image extensions", () => {
    expect(middlewareConfig.matcher).toEqual([
      "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ]);
  });
});
