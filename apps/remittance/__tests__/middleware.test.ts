/**
 * Tests for apps/remittance/middleware.ts (post-Phase-4-app simplification).
 *
 * The middleware is now a thin createDemoMiddleware factory call with no
 * path-based config extraction. Config id is sourced exclusively from
 * `?theme=<configId>` (factory default `configIdSource: "query"`) and
 * persisted in the `remittance_config_id` cookie (factory default
 * `stickyConfigCookie: true`). Subsequent visits without `?theme=` reuse the
 * cookie and forward the resolved id as `x-remittance-config-id`.
 */

import { describe, expect, test } from "vitest";
import { middleware, config as middlewareConfig } from "../middleware";
import { getForwardedRequestHeader, isRedirect, makeRequest } from "./_helpers";

const HEADER = "x-remittance-config-id";
const COOKIE = "remittance_config_id";
const AUTH = { dynamic_jwt: "fake.jwt.token" };

describe("remittance middleware — public route /login", () => {
  test("unauthenticated GET /login -> passthrough", () => {
    const res = middleware(makeRequest({ url: "/login" }));
    expect(isRedirect(res)).toBe(false);
  });

  test("authenticated GET /login -> redirect to /", () => {
    const res = middleware(makeRequest({ url: "/login", cookies: AUTH }));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") as string).pathname).toBe("/");
  });

  test("authenticated GET /login?returnTo=/dashboard -> redirect to /dashboard", () => {
    const res = middleware(
      makeRequest({ url: "/login?returnTo=/dashboard", cookies: AUTH }),
    );
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") as string).pathname).toBe(
      "/dashboard",
    );
  });

  test("authenticated GET /login with sessionExpired -> passthrough and clear dynamic_jwt", () => {
    const res = middleware(
      makeRequest({ url: "/login?sessionExpired=1", cookies: AUTH }),
    );
    expect(isRedirect(res)).toBe(false);
    expect(res.cookies.get("dynamic_jwt")?.value).toBe("");
  });

  test("OAuth callback (?dynamicOauthCode=...) on /login is NOT redirected", () => {
    const res = middleware(
      makeRequest({ url: "/login?dynamicOauthCode=abc", cookies: AUTH }),
    );
    expect(isRedirect(res)).toBe(false);
  });
});

describe("remittance middleware — auth gate on protected routes", () => {
  test("unauthenticated GET /dashboard -> redirect to /login with returnTo=/dashboard", () => {
    const res = middleware(makeRequest({ url: "/dashboard" }));
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get("location") as string);
    expect(loc.pathname).toBe("/login");
    expect(loc.searchParams.get("returnTo")).toBe("/dashboard");
  });

  test("unauthenticated GET / -> redirect to /login with returnTo=/", () => {
    const res = middleware(makeRequest({ url: "/" }));
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get("location") as string);
    expect(loc.pathname).toBe("/login");
    expect(loc.searchParams.get("returnTo")).toBe("/");
  });

  test("unauthenticated GET /dashboard?theme=brandX -> returnTo carries the id query", () => {
    const res = middleware(makeRequest({ url: "/dashboard?theme=brandX" }));
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get("location") as string);
    expect(loc.pathname).toBe("/login");
    expect(loc.searchParams.get("returnTo")).toBe("/dashboard?theme=brandX");
  });
});

describe("remittance middleware — authenticated request pass-through", () => {
  test("authenticated GET /dashboard -> passthrough", () => {
    const res = middleware(makeRequest({ url: "/dashboard", cookies: AUTH }));
    expect(isRedirect(res)).toBe(false);
  });

  test("authenticated request forwards x-pathname header", () => {
    const res = middleware(makeRequest({ url: "/dashboard", cookies: AUTH }));
    expect(getForwardedRequestHeader(res, "x-pathname")).toBe("/dashboard");
  });
});

describe("remittance middleware — config-id resolution (cookie + query only)", () => {
  test("?theme=brandX on protected route -> sets cookie + forwards header", () => {
    const res = middleware(
      makeRequest({ url: "/dashboard?theme=brandX", cookies: AUTH }),
    );
    expect(isRedirect(res)).toBe(false);
    expect(getForwardedRequestHeader(res, HEADER)).toBe("brandX");
    expect(res.cookies.get(COOKIE)?.value).toBe("brandX");
  });

  test("cookie-only request (no ?theme=) -> forwards header from cookie", () => {
    const res = middleware(
      makeRequest({
        url: "/dashboard",
        cookies: { ...AUTH, [COOKIE]: "brandX" },
      }),
    );
    expect(isRedirect(res)).toBe(false);
    expect(getForwardedRequestHeader(res, HEADER)).toBe("brandX");
  });

  test("?theme= (empty) clears the cookie", () => {
    const res = middleware(
      makeRequest({
        url: "/dashboard?theme=",
        cookies: { ...AUTH, [COOKIE]: "brandX" },
      }),
    );
    // `delete` writes a Set-Cookie with empty value.
    expect(res.cookies.get(COOKIE)?.value).toBe("");
  });

  test("?theme=other overrides existing cookie", () => {
    const res = middleware(
      makeRequest({
        url: "/dashboard?theme=other",
        cookies: { ...AUTH, [COOKIE]: "brandX" },
      }),
    );
    expect(getForwardedRequestHeader(res, HEADER)).toBe("other");
    expect(res.cookies.get(COOKIE)?.value).toBe("other");
  });

  test("path-based /r/[id]/* is NOT extracted as a config id (path routing dropped)", () => {
    // The middleware now lets next.config.ts handle the legacy /r/[id]/* shape
    // via redirects. Even if a request reaches middleware, no header should be
    // forwarded from the path.
    const res = middleware(
      makeRequest({ url: "/r/abc/dashboard", cookies: AUTH }),
    );
    expect(getForwardedRequestHeader(res, HEADER)).toBeNull();
  });
});

describe("remittance middleware — matcher", () => {
  test("matcher excludes /api, _next, image extensions", () => {
    expect(middlewareConfig.matcher).toEqual([
      "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ]);
  });
});
