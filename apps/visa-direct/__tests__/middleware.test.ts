/**
 * Characterization tests for apps/visa-direct/middleware.ts.
 *
 * Locks down current pre-Phase-1D behavior. After Phase 1D rebases on top, these
 * tests gate whether the refactor preserved the contract.
 *
 * Asserts the visa-direct cookie pattern (D-008): query `?id=` -> cookie
 * `visa_direct_config_id` + forwarded header `x-visa-direct-config-id`. Plus
 * standard auth gate, login passthrough, and OAuth-callback handling.
 */

import { describe, expect, test } from "vitest";
import { middleware, config as middlewareConfig } from "../middleware";
import { getForwardedRequestHeader, isRedirect, makeRequest } from "./_helpers";

const COOKIE = "visa_direct_config_id";
const HEADER = "x-visa-direct-config-id";
const AUTH = { dynamic_jwt: "fake.jwt.token" };

describe("visa-direct middleware — public route (/login)", () => {
  test("A. unauthenticated -> NextResponse.next() (no redirect)", () => {
    const res = middleware(makeRequest({ url: "/login" }));
    expect(isRedirect(res)).toBe(false);
    expect(res.headers.get("location")).toBeNull();
  });

  test("E. authenticated user on /login -> redirect to /payment-methods", () => {
    const res = middleware(makeRequest({ url: "/login", cookies: AUTH }));
    expect(res.status).toBe(307);
    const loc = res.headers.get("location");
    expect(loc).not.toBeNull();
    expect(new URL(loc as string).pathname).toBe("/payment-methods");
  });

  test("E. authenticated user on /login with returnTo -> redirect to returnTo", () => {
    const res = middleware(
      makeRequest({ url: "/login?returnTo=/transactions", cookies: AUTH }),
    );
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") as string).pathname).toBe(
      "/transactions",
    );
  });

  test("E. authenticated user on /login with non-/ returnTo -> falls back to /payment-methods", () => {
    const res = middleware(
      makeRequest({ url: "/login?returnTo=evil.com", cookies: AUTH }),
    );
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") as string).pathname).toBe(
      "/payment-methods",
    );
  });

  test("E. OAuth callback (?dynamicOauthCode=...) on /login is NOT redirected even with auth cookie", () => {
    const res = middleware(
      makeRequest({
        url: "/login?dynamicOauthCode=abc",
        cookies: AUTH,
      }),
    );
    expect(isRedirect(res)).toBe(false);
  });

  test("E. OAuth callback (?code=...&state=...) on /login is NOT redirected", () => {
    const res = middleware(
      makeRequest({
        url: "/login?code=abc&state=xyz",
        cookies: AUTH,
      }),
    );
    expect(isRedirect(res)).toBe(false);
  });

  test("E. /login?sessionExpired with auth cookie -> passthrough and clear dynamic_jwt", () => {
    const res = middleware(
      makeRequest({ url: "/login?sessionExpired=1", cookies: AUTH }),
    );
    expect(isRedirect(res)).toBe(false);
    const cleared = res.cookies.get("dynamic_jwt");
    // delete() emits an empty-value Set-Cookie with epoch expiry.
    expect(cleared?.value).toBe("");
  });

  test("/login/sub is also treated as public (startsWith match)", () => {
    const res = middleware(makeRequest({ url: "/login/help" }));
    expect(isRedirect(res)).toBe(false);
  });
});

describe("visa-direct middleware — auth gate on protected route", () => {
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

describe("visa-direct middleware — authenticated request pass-through", () => {
  test("C. authenticated GET /transactions -> NextResponse.next() (no redirect)", () => {
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

describe("visa-direct middleware — D. config-id cookie + header sync", () => {
  test("?id=abc on protected route (authed) -> sets cookie + forwards header", () => {
    const res = middleware(
      makeRequest({ url: "/payment-methods?id=abc", cookies: AUTH }),
    );
    expect(isRedirect(res)).toBe(false);
    const setCookie = res.cookies.get(COOKIE);
    expect(setCookie?.value).toBe("abc");
    expect(setCookie?.path).toBe("/");
    expect(setCookie?.sameSite).toBe("lax");
    expect(setCookie?.httpOnly).toBe(false);
    expect(setCookie?.maxAge).toBe(60 * 60 * 24 * 30);
    expect(getForwardedRequestHeader(res, HEADER)).toBe("abc");
  });

  test("?id=  (empty/blank) on /login -> clears the config cookie", () => {
    const res = middleware(
      makeRequest({
        url: "/login?id=",
        cookies: { [COOKIE]: "old" },
      }),
    );
    // Cookie should be deleted (empty value with epoch expiry).
    const cleared = res.cookies.get(COOKIE);
    expect(cleared?.value).toBe("");
  });

  test("cookie already set, no ?id= -> cookie persists; header is forwarded", () => {
    const res = middleware(
      makeRequest({
        url: "/payment-methods",
        cookies: { ...AUTH, [COOKIE]: "stickyId" },
      }),
    );
    expect(isRedirect(res)).toBe(false);
    // No new Set-Cookie for the config cookie when value is unchanged.
    expect(res.cookies.get(COOKIE)).toBeUndefined();
    // Header is forwarded from cookie value.
    expect(getForwardedRequestHeader(res, HEADER)).toBe("stickyId");
  });

  test("?id=newId differs from cookie value -> updates cookie to newId", () => {
    const res = middleware(
      makeRequest({
        url: "/payment-methods?id=newId",
        cookies: { ...AUTH, [COOKIE]: "oldId" },
      }),
    );
    expect(res.cookies.get(COOKIE)?.value).toBe("newId");
    expect(getForwardedRequestHeader(res, HEADER)).toBe("newId");
  });

  test("?id=  (blank) explicitly clears even when query carries other params", () => {
    const res = middleware(
      makeRequest({
        url: "/payment-methods?id=&foo=bar",
        cookies: { ...AUTH, [COOKIE]: "old" },
      }),
    );
    // Header is NOT forwarded when explicitly clearing.
    expect(getForwardedRequestHeader(res, HEADER)).toBeNull();
    // Cookie is cleared.
    const cleared = res.cookies.get(COOKIE);
    expect(cleared?.value).toBe("");
  });
});

describe("visa-direct middleware — F. edge cases", () => {
  test("non-id query params do not affect cookie/header behavior", () => {
    const res = middleware(
      makeRequest({ url: "/payment-methods?foo=bar", cookies: AUTH }),
    );
    expect(isRedirect(res)).toBe(false);
    expect(res.cookies.get(COOKIE)).toBeUndefined();
    expect(getForwardedRequestHeader(res, HEADER)).toBeNull();
  });

  test("matcher excludes /api/* — not asserted via runtime call, but config exposes it", () => {
    // We cannot directly test the matcher here (Next handles it), but lock the
    // current shape so refactors that change the matcher trip a test.
    expect(middlewareConfig.matcher).toEqual([
      "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ]);
  });
});
