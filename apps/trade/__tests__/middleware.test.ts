/**
 * Tests for apps/trade/middleware.ts (Phase 4 simplified contract).
 *
 * Trade now uses the canonical D-008 cookie + query-param flow — no
 * path-based config routing. Legacy `/t/[id]/<rest>` deep links are
 * handled by a `next.config.ts` redirect (not the middleware), so the
 * middleware itself sees only flat paths and the `?theme=` query.
 */

import { describe, expect, test } from "vitest";
import { middleware, config as middlewareConfig } from "../middleware";
import { appConfig } from "../app.config";
import {
  getForwardedRequestHeader,
  isRedirect,
  makeRequest,
} from "./_helpers";

const COOKIE = "trade_config_id";
const HEADER = "x-trade-config-id";
const AUTH = { dynamic_jwt: "fake.jwt.token" };

describe("trade middleware — defaultReturnPath sanity (slot)", () => {
  test("appConfig.defaultReturnPath is /portfolio (locks current slot)", () => {
    expect(appConfig.defaultReturnPath).toBe("/portfolio");
  });
});

describe("trade middleware — public route /login", () => {
  test("unauthenticated GET /login -> NextResponse.next() (no redirect)", () => {
    const res = middleware(makeRequest({ url: "/login" }));
    expect(isRedirect(res)).toBe(false);
  });

  test("authenticated /login -> redirect to /portfolio (defaultReturnPath)", () => {
    const res = middleware(makeRequest({ url: "/login", cookies: AUTH }));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") as string).pathname).toBe(
      "/portfolio",
    );
  });

  test("authenticated /login?returnTo=/foo -> redirect to /foo", () => {
    const res = middleware(
      makeRequest({ url: "/login?returnTo=/foo", cookies: AUTH }),
    );
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") as string).pathname).toBe(
      "/foo",
    );
  });

  test("authenticated /login with sessionExpired -> pass-through; clear dynamic_jwt", () => {
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

  test("OAuth callback (?dynamicOauthCode=...&dynamicOauthState=...) on /login is NOT redirected", () => {
    const res = middleware(
      makeRequest({
        url: "/login?dynamicOauthCode=abc&dynamicOauthState=xyz",
        cookies: AUTH,
      }),
    );
    expect(isRedirect(res)).toBe(false);
  });
});

describe("trade middleware — auth gate on protected routes", () => {
  test("unauthenticated GET /portfolio -> redirect to / (front door is the login) with returnTo", () => {
    const res = middleware(makeRequest({ url: "/portfolio" }));
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get("location") as string);
    expect(loc.pathname).toBe("/");
    expect(loc.searchParams.get("returnTo")).toBe("/portfolio");
  });

  test("unauthenticated GET / -> passthrough (scenario page)", () => {
    const res = middleware(makeRequest({ url: "/" }));
    expect(isRedirect(res)).toBe(false);
  });
});

describe("trade middleware — authenticated request pass-through", () => {
  test("authenticated GET /portfolio -> NextResponse.next() (no redirect)", () => {
    const res = middleware(makeRequest({ url: "/portfolio", cookies: AUTH }));
    expect(isRedirect(res)).toBe(false);
  });

  test("authenticated GET / -> redirect to /portfolio (signed-in users skip the front door)", () => {
    const res = middleware(makeRequest({ url: "/", cookies: AUTH }));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") as string).pathname).toBe(
      "/portfolio",
    );
  });

  test("OAuth callback on / passes through even when authed", () => {
    const res = middleware(
      makeRequest({ url: "/?dynamicOauthCode=abc", cookies: AUTH }),
    );
    expect(isRedirect(res)).toBe(false);
  });

  test("authenticated request forwards x-pathname header", () => {
    const res = middleware(
      makeRequest({ url: "/portfolio", cookies: AUTH }),
    );
    expect(getForwardedRequestHeader(res, "x-pathname")).toBe("/portfolio");
  });
});

describe("trade middleware — config-id resolution (query > cookie)", () => {
  test("?theme=brand on protected route -> forwards header from query AND sets cookie", () => {
    const res = middleware(
      makeRequest({ url: "/portfolio?theme=brand", cookies: AUTH }),
    );
    expect(getForwardedRequestHeader(res, HEADER)).toBe("brand");
    const setCookie = res.cookies.get(COOKIE);
    expect(setCookie?.value).toBe("brand");
    expect(setCookie?.path).toBe("/");
    expect(setCookie?.sameSite).toBe("lax");
    expect(setCookie?.httpOnly).toBe(false);
    expect(setCookie?.maxAge).toBe(60 * 60 * 24 * 30);
  });

  test("cookie value used when no query id", () => {
    const res = middleware(
      makeRequest({
        url: "/portfolio",
        cookies: { ...AUTH, [COOKIE]: "stickyId" },
      }),
    );
    expect(getForwardedRequestHeader(res, HEADER)).toBe("stickyId");
    expect(res.cookies.get(COOKIE)).toBeUndefined();
  });

  test("?theme=newId overrides existing cookie", () => {
    const res = middleware(
      makeRequest({
        url: "/portfolio?theme=newId",
        cookies: { ...AUTH, [COOKIE]: "oldId" },
      }),
    );
    expect(res.cookies.get(COOKIE)?.value).toBe("newId");
    expect(getForwardedRequestHeader(res, HEADER)).toBe("newId");
  });

  test("?theme= (empty) clears the cookie", () => {
    const res = middleware(
      makeRequest({
        url: "/portfolio?theme=",
        cookies: { ...AUTH, [COOKIE]: "oldId" },
      }),
    );
    const setCookie = res.cookies.get(COOKIE);
    // Cookie deletion is signaled by an empty value.
    expect(setCookie?.value).toBe("");
  });
});

describe("trade middleware — matcher", () => {
  test("matcher excludes /api, _next, image extensions", () => {
    expect(middlewareConfig.matcher).toEqual([
      "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ]);
  });
});
