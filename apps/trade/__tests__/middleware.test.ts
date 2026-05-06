/**
 * Characterization tests for apps/trade/middleware.ts.
 *
 * Locks down current pre-Phase-1D behavior. Trade has the most complex
 * middleware: config-route /t/<id>/* rewrites to plain paths but preserves
 * URL, sets the trade_config_id cookie ONLY from path (not query), forwards
 * x-trade-config-id from path > query > cookie (in that priority order).
 */

import { describe, expect, test } from "vitest";
import { middleware, config as middlewareConfig } from "../middleware";
import { appConfig } from "../app.config";
import {
  getForwardedRequestHeader,
  getRewriteTarget,
  isRedirect,
  makeRequest,
} from "./_helpers";

const COOKIE = "trade_config_id";
const HEADER = "x-trade-config-id";
const AUTH = { dynamic_jwt: "fake.jwt.token" };

describe("trade middleware — defaultReturnPath sanity (slot)", () => {
  test("appConfig.defaultReturnPath is /portfolio (locks current slot)", () => {
    // If the slot value moves, redirect/rewrite assertions below need updating.
    expect(appConfig.defaultReturnPath).toBe("/portfolio");
  });
});

describe("trade middleware — public route /login", () => {
  test("A. unauthenticated GET /login -> NextResponse.next() (no redirect)", () => {
    const res = middleware(makeRequest({ url: "/login" }));
    expect(isRedirect(res)).toBe(false);
  });

  test("E. authenticated /login -> redirect to /portfolio (defaultReturnPath)", () => {
    const res = middleware(makeRequest({ url: "/login", cookies: AUTH }));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") as string).pathname).toBe(
      "/portfolio",
    );
  });

  test("E. authenticated /login?returnTo=/foo -> redirect to /foo", () => {
    const res = middleware(
      makeRequest({ url: "/login?returnTo=/foo", cookies: AUTH }),
    );
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") as string).pathname).toBe(
      "/foo",
    );
  });

  test("E. authenticated /login with sessionExpired -> rewrite to /login; clear dynamic_jwt", () => {
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

  test("E. OAuth callback (?dynamicOauthCode=...&dynamicOauthState=...) on /login is NOT redirected", () => {
    // Per docs/projects/demo-meta-system/research/dynamic-auth-patterns.md,
    // Dynamic SDK uses `dynamicOauthCode`/`dynamicOauthState` (not `code`/`state`).
    const res = middleware(
      makeRequest({
        url: "/login?dynamicOauthCode=abc&dynamicOauthState=xyz",
        cookies: AUTH,
      }),
    );
    expect(isRedirect(res)).toBe(false);
  });
});

describe("trade middleware — config-route public login /t/<id>/login", () => {
  test("A. unauthenticated /t/abc/login -> rewrite to /login; header forwarded", () => {
    const res = middleware(makeRequest({ url: "/t/abc/login" }));
    expect(isRedirect(res)).toBe(false);
    // Rewrite preserves the URL but routes the request to /login.
    expect(getRewriteTarget(res)).not.toBeNull();
    expect(new URL(getRewriteTarget(res) as string).pathname).toBe("/login");
    expect(getForwardedRequestHeader(res, HEADER)).toBe("abc");
  });

  test("D. unauthenticated /t/abc/login -> sets trade_config_id=abc cookie (path drives cookie)", () => {
    const res = middleware(makeRequest({ url: "/t/abc/login" }));
    const setCookie = res.cookies.get(COOKIE);
    expect(setCookie?.value).toBe("abc");
    expect(setCookie?.path).toBe("/");
    expect(setCookie?.sameSite).toBe("lax");
    expect(setCookie?.httpOnly).toBe(false);
    expect(setCookie?.maxAge).toBe(60 * 60 * 24 * 30);
  });

  test("E. authenticated /t/abc/login -> redirect to /t/abc/portfolio fallback", () => {
    const res = middleware(
      makeRequest({ url: "/t/abc/login", cookies: AUTH }),
    );
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") as string).pathname).toBe(
      "/t/abc/portfolio",
    );
  });
});

describe("trade middleware — auth gate on protected routes", () => {
  test("B. unauthenticated GET /portfolio -> redirect to /login with returnTo", () => {
    const res = middleware(makeRequest({ url: "/portfolio" }));
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get("location") as string);
    expect(loc.pathname).toBe("/login");
    expect(loc.searchParams.get("returnTo")).toBe("/portfolio");
  });

  test("B. unauthenticated GET / -> redirect to /login with returnTo=/portfolio (fallback)", () => {
    const res = middleware(makeRequest({ url: "/" }));
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get("location") as string);
    expect(loc.searchParams.get("returnTo")).toBe("/portfolio");
  });

  test("B. unauthenticated /t/abc/portfolio -> redirect to /t/abc/login with returnTo", () => {
    const res = middleware(makeRequest({ url: "/t/abc/portfolio" }));
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get("location") as string);
    expect(loc.pathname).toBe("/t/abc/login");
    expect(loc.searchParams.get("returnTo")).toBe("/t/abc/portfolio");
  });

  test("B. unauthenticated /t/abc -> redirect to /t/abc/login with returnTo=/t/abc", () => {
    const res = middleware(makeRequest({ url: "/t/abc" }));
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get("location") as string);
    expect(loc.pathname).toBe("/t/abc/login");
    // /t/abc has no trailing slash; normalizeReturnPath keeps it as-is.
    expect(loc.searchParams.get("returnTo")).toBe("/t/abc");
  });
});

describe("trade middleware — authenticated request pass-through", () => {
  test("C. authenticated GET /portfolio -> NextResponse.next() (no redirect)", () => {
    const res = middleware(makeRequest({ url: "/portfolio", cookies: AUTH }));
    expect(isRedirect(res)).toBe(false);
    // No rewrite target — non-config routes use NextResponse.next().
    expect(getRewriteTarget(res)).toBeNull();
  });

  test("authenticated /t/abc/portfolio -> rewrite to /portfolio (URL preserved)", () => {
    const res = middleware(
      makeRequest({ url: "/t/abc/portfolio", cookies: AUTH }),
    );
    expect(isRedirect(res)).toBe(false);
    const target = getRewriteTarget(res);
    expect(target).not.toBeNull();
    expect(new URL(target as string).pathname).toBe("/portfolio");
  });

  test("authenticated /t/abc (no trailing) -> rewrite to /portfolio (defaultReturnPath)", () => {
    const res = middleware(makeRequest({ url: "/t/abc", cookies: AUTH }));
    expect(isRedirect(res)).toBe(false);
    expect(new URL(getRewriteTarget(res) as string).pathname).toBe(
      "/portfolio",
    );
  });

  test("authenticated request forwards x-pathname header (original path)", () => {
    const res = middleware(
      makeRequest({ url: "/t/abc/portfolio", cookies: AUTH }),
    );
    expect(getForwardedRequestHeader(res, "x-pathname")).toBe(
      "/t/abc/portfolio",
    );
  });
});

describe("trade middleware — D. config-id resolution (path > query > cookie)", () => {
  test("path /t/abc/* takes precedence over ?id=other", () => {
    const res = middleware(
      makeRequest({
        url: "/t/abc/portfolio?id=other",
        cookies: AUTH,
      }),
    );
    expect(getForwardedRequestHeader(res, HEADER)).toBe("abc");
  });

  test("?id=brand on plain protected route -> forwards header from query", () => {
    const res = middleware(
      makeRequest({ url: "/portfolio?id=brand", cookies: AUTH }),
    );
    expect(getForwardedRequestHeader(res, HEADER)).toBe("brand");
  });

  test("?id= alone does NOT set the trade_config_id cookie (path drives cookie)", () => {
    const res = middleware(
      makeRequest({ url: "/portfolio?id=brand", cookies: AUTH }),
    );
    expect(res.cookies.get(COOKIE)).toBeUndefined();
  });

  test("cookie value used when no path or query id", () => {
    const res = middleware(
      makeRequest({
        url: "/portfolio",
        cookies: { ...AUTH, [COOKIE]: "stickyId" },
      }),
    );
    expect(getForwardedRequestHeader(res, HEADER)).toBe("stickyId");
    // Cookie not re-set on plain /portfolio (only path-based requests rewrite cookie).
    expect(res.cookies.get(COOKIE)).toBeUndefined();
  });

  test("path-based request always (re-)sets the cookie to path's id", () => {
    const res = middleware(
      makeRequest({
        url: "/t/newId/portfolio",
        cookies: { ...AUTH, [COOKIE]: "oldId" },
      }),
    );
    expect(res.cookies.get(COOKIE)?.value).toBe("newId");
  });
});

describe("trade middleware — F. matcher", () => {
  test("matcher excludes /api, _next, image extensions", () => {
    expect(middlewareConfig.matcher).toEqual([
      "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ]);
  });
});
