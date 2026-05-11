/**
 * Characterization tests for apps/earn/src/middleware.ts.
 *
 * Locks down current pre-Phase-1D behavior. Earn's middleware is unique:
 *   - Public routes are anything starting with /login (no /e/<id>/login pattern
 *     in this matcher; instead /e/<id>/login is allowed via the /e/ branch).
 *   - /e/<id>/* is a constrained allowlist: only /login and /earn (and root)
 *     pass through; any other config-route subpath is forced to /e/<id>/earn.
 *   - On non-public, non-config routes: missing cookie -> /login (no returnTo);
 *     present cookie + path !== /earn -> redirect to /earn.
 *   - Earn forwards no x-pathname header from middleware (uses NextResponse.next() w/o headers).
 *   - Earn does NOT set or read a config cookie at the middleware layer.
 */

import { describe, expect, test } from "vitest";
import { middleware, config as middlewareConfig } from "../middleware";
import { isRedirect, makeRequest } from "./_helpers";

const AUTH = { dynamic_jwt: "fake.jwt.token" };

describe("earn middleware — public route /login", () => {
  test("A. unauthenticated GET /login -> NextResponse.next()", () => {
    const res = middleware(makeRequest({ url: "/login" }));
    expect(isRedirect(res)).toBe(false);
  });

  test("E. authenticated GET /login -> NextResponse.next() (no redirect from middleware)", () => {
    // earn's middleware does NOT redirect away from /login when authed.
    // Server components / client logic handle that flow.
    const res = middleware(makeRequest({ url: "/login", cookies: AUTH }));
    expect(isRedirect(res)).toBe(false);
  });

  test("/login/sub also allowed (startsWith match)", () => {
    const res = middleware(makeRequest({ url: "/login/foo" }));
    expect(isRedirect(res)).toBe(false);
  });
});

describe("earn middleware — config route /e/<id>/* allowlist", () => {
  test("/e/abc/login -> passthrough (auth route allowed)", () => {
    const res = middleware(makeRequest({ url: "/e/abc/login" }));
    expect(isRedirect(res)).toBe(false);
  });

  test("/e/abc/login/sub -> passthrough (subpath of /login allowed)", () => {
    const res = middleware(makeRequest({ url: "/e/abc/login/foo" }));
    expect(isRedirect(res)).toBe(false);
  });

  test("/e/abc/earn -> passthrough", () => {
    const res = middleware(makeRequest({ url: "/e/abc/earn" }));
    expect(isRedirect(res)).toBe(false);
  });

  test("/e/abc/ -> passthrough (root sub-path allowed)", () => {
    const res = middleware(makeRequest({ url: "/e/abc/" }));
    expect(isRedirect(res)).toBe(false);
  });

  test("/e/abc -> passthrough (no sub-path also allowed)", () => {
    const res = middleware(makeRequest({ url: "/e/abc" }));
    expect(isRedirect(res)).toBe(false);
  });

  test("/e/abc/dashboard (other sub-path) -> redirect to /e/abc/earn", () => {
    const res = middleware(makeRequest({ url: "/e/abc/dashboard" }));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") as string).pathname).toBe(
      "/e/abc/earn",
    );
  });

  test("config-route allowlist applies regardless of auth cookie", () => {
    const res = middleware(
      makeRequest({ url: "/e/abc/dashboard", cookies: AUTH }),
    );
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") as string).pathname).toBe(
      "/e/abc/earn",
    );
  });
});

describe("earn middleware — auth gate on protected routes (non-config)", () => {
  test("B. unauthenticated GET /earn -> redirect to /login (no returnTo)", () => {
    const res = middleware(makeRequest({ url: "/earn" }));
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get("location") as string);
    expect(loc.pathname).toBe("/login");
    // Earn's middleware does NOT carry returnTo.
    expect(loc.searchParams.get("returnTo")).toBeNull();
  });

  test("B. unauthenticated GET / -> redirect to /login (no returnTo)", () => {
    const res = middleware(makeRequest({ url: "/" }));
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get("location") as string);
    expect(loc.pathname).toBe("/login");
    expect(loc.searchParams.get("returnTo")).toBeNull();
  });

  test("B. unauthenticated /dashboard -> redirect to /login", () => {
    const res = middleware(makeRequest({ url: "/dashboard" }));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") as string).pathname).toBe(
      "/login",
    );
  });
});

describe("earn middleware — authenticated request flows (non-config)", () => {
  test("C. authenticated GET /earn -> NextResponse.next() (passthrough)", () => {
    const res = middleware(makeRequest({ url: "/earn", cookies: AUTH }));
    expect(isRedirect(res)).toBe(false);
  });

  test("authenticated GET / -> redirect to /earn (only valid auth landing)", () => {
    const res = middleware(makeRequest({ url: "/", cookies: AUTH }));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") as string).pathname).toBe(
      "/earn",
    );
  });

  test("authenticated /dashboard -> redirect to /earn", () => {
    const res = middleware(makeRequest({ url: "/dashboard", cookies: AUTH }));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") as string).pathname).toBe(
      "/earn",
    );
  });
});

describe("earn middleware — D. no config-id pattern at middleware layer", () => {
  test("?theme=brand on /earn -> no cookie set, no header forwarded", () => {
    const res = middleware(
      makeRequest({ url: "/earn?theme=brand", cookies: AUTH }),
    );
    expect(isRedirect(res)).toBe(false);
    expect(res.cookies.get("earn_config_id")).toBeUndefined();
  });
});

describe("earn middleware — F. matcher", () => {
  test("matcher excludes /api, _next, favicon (no image-extension exclusion)", () => {
    expect(middlewareConfig.matcher).toEqual([
      "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ]);
  });
});
