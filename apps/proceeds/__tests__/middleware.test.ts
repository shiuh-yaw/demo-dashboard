/**
 * Characterization tests for apps/proceeds/middleware.ts.
 *
 * Locks down current pre-Phase-1D behavior. Proceeds is the simplest auth-gate
 * pattern: no config-id query, no config cookie, /payment-methods is the
 * authenticated default landing.
 */

import { describe, expect, test } from "vitest";
import { middleware, config as middlewareConfig } from "../middleware";
import { getForwardedRequestHeader, isRedirect, makeRequest } from "./_helpers";

const AUTH = { dynamic_jwt: "fake.jwt.token" };

describe("proceeds middleware — public route /login", () => {
  test("A. unauthenticated GET /login -> NextResponse.next()", () => {
    const res = middleware(makeRequest({ url: "/login" }));
    expect(isRedirect(res)).toBe(false);
  });

  test("E. authenticated GET /login -> redirect to /payment-methods", () => {
    const res = middleware(makeRequest({ url: "/login", cookies: AUTH }));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") as string).pathname).toBe(
      "/payment-methods",
    );
  });

  test("E. authenticated GET /login?returnTo=/foo -> redirect to /foo", () => {
    const res = middleware(
      makeRequest({ url: "/login?returnTo=/foo", cookies: AUTH }),
    );
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") as string).pathname).toBe(
      "/foo",
    );
  });

  test("E. authenticated GET /login?returnTo=evil.com (no leading slash) -> /payment-methods", () => {
    const res = middleware(
      makeRequest({ url: "/login?returnTo=evil.com", cookies: AUTH }),
    );
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") as string).pathname).toBe(
      "/payment-methods",
    );
  });

  test("E. authenticated /login?sessionExpired -> passthrough; clear dynamic_jwt", () => {
    const res = middleware(
      makeRequest({ url: "/login?sessionExpired=1", cookies: AUTH }),
    );
    expect(isRedirect(res)).toBe(false);
    expect(res.cookies.get("dynamic_jwt")?.value).toBe("");
  });

  test("/login/sub is also public (startsWith match)", () => {
    const res = middleware(makeRequest({ url: "/login/help" }));
    expect(isRedirect(res)).toBe(false);
  });
});

describe("proceeds middleware — auth gate on protected routes", () => {
  test("B. unauthenticated GET /payment-methods -> redirect to /login with returnTo", () => {
    const res = middleware(makeRequest({ url: "/payment-methods" }));
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get("location") as string);
    expect(loc.pathname).toBe("/login");
    expect(loc.searchParams.get("returnTo")).toBe("/payment-methods");
  });

  test("B. unauthenticated GET / -> redirect to /login with returnTo=/payment-methods", () => {
    const res = middleware(makeRequest({ url: "/" }));
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get("location") as string);
    expect(loc.pathname).toBe("/login");
    expect(loc.searchParams.get("returnTo")).toBe("/payment-methods");
  });

  test("B. unauthenticated GET /transactions/ (trailing slash) -> returnTo strips trailing slash", () => {
    const res = middleware(makeRequest({ url: "/transactions/" }));
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get("location") as string);
    expect(loc.searchParams.get("returnTo")).toBe("/transactions");
  });
});

describe("proceeds middleware — authenticated request pass-through", () => {
  test("C. authenticated GET /transactions -> passthrough", () => {
    const res = middleware(
      makeRequest({ url: "/transactions", cookies: AUTH }),
    );
    expect(isRedirect(res)).toBe(false);
  });

  test("authenticated GET / -> redirect to /payment-methods", () => {
    const res = middleware(makeRequest({ url: "/", cookies: AUTH }));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") as string).pathname).toBe(
      "/payment-methods",
    );
  });

  test("authenticated request forwards x-pathname header", () => {
    const res = middleware(
      makeRequest({ url: "/transactions", cookies: AUTH }),
    );
    expect(getForwardedRequestHeader(res, "x-pathname")).toBe("/transactions");
  });
});

describe("proceeds middleware — D. no config-id pattern", () => {
  test("?id= is ignored: cookie not set, no header forwarded", () => {
    const res = middleware(
      makeRequest({ url: "/payment-methods?id=anything", cookies: AUTH }),
    );
    expect(isRedirect(res)).toBe(false);
    // Proceeds does not set a config cookie nor forward x-proceeds-config-id.
    expect(res.cookies.get("proceeds_config_id")).toBeUndefined();
    expect(getForwardedRequestHeader(res, "x-proceeds-config-id")).toBeNull();
  });
});

describe("proceeds middleware — F. matcher", () => {
  test("matcher excludes /api, _next, image extensions", () => {
    expect(middlewareConfig.matcher).toEqual([
      "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ]);
  });
});
