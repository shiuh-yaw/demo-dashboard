/**
 * Tests for apps/earn/src/middleware.ts (post-Phase-4 simplification).
 *
 * Earn now uses createDemoMiddleware with the simplified contract:
 *   - `?theme=<configId>` resolves the config and persists the
 *     `earn_config_id` cookie (sticky by default).
 *   - The cookie carries the id across subsequent navigations.
 *   - Header `x-earn-config-id` is forwarded when a config id resolves.
 *   - Path-based `/e/[id]/...` routes were removed; back-compat redirect
 *     lives in next.config.ts.
 */

import { describe, expect, test } from "vitest";
import { middleware, config as middlewareConfig } from "../middleware";
import {
  isRedirect,
  makeRequest,
  getForwardedRequestHeader,
} from "./_helpers";

const AUTH = { dynamic_jwt: "fake.jwt.token" };

describe("earn middleware — public route /login", () => {
  test("unauthenticated GET /login -> passthrough", () => {
    const res = middleware(makeRequest({ url: "/login" }));
    expect(isRedirect(res)).toBe(false);
  });

  test("/login/sub allowed (startsWith match)", () => {
    const res = middleware(makeRequest({ url: "/login/foo" }));
    expect(isRedirect(res)).toBe(false);
  });
});

describe("earn middleware — auth gate on protected routes", () => {
  test("unauthenticated GET /earn -> redirect to / (front door is the login)", () => {
    const res = middleware(makeRequest({ url: "/earn" }));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") as string).pathname).toBe("/");
  });

  test("authenticated GET /earn -> passthrough", () => {
    const res = middleware(makeRequest({ url: "/earn", cookies: AUTH }));
    expect(isRedirect(res)).toBe(false);
  });

  test("authenticated GET / -> redirect to /earn (signed-in users skip the front door)", () => {
    const res = middleware(makeRequest({ url: "/", cookies: AUTH }));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") as string).pathname).toBe(
      "/earn",
    );
  });

  test("unauthenticated GET / -> passthrough (scenario page)", () => {
    const res = middleware(makeRequest({ url: "/" }));
    expect(isRedirect(res)).toBe(false);
  });

  test("OAuth callback on / passes through even when authed", () => {
    const res = middleware(
      makeRequest({ url: "/?dynamicOauthCode=abc", cookies: AUTH }),
    );
    expect(isRedirect(res)).toBe(false);
  });
});

describe("earn middleware — header forwarding via ?theme=", () => {
  test("?theme=brand on /earn forwards x-earn-config-id header", () => {
    const res = middleware(
      makeRequest({ url: "/earn?theme=brandX", cookies: AUTH }),
    );
    expect(isRedirect(res)).toBe(false);
    expect(getForwardedRequestHeader(res, "x-earn-config-id")).toBe("brandX");
  });

  test("?theme=brand persists earn_config_id cookie (sticky)", () => {
    const res = middleware(
      makeRequest({ url: "/earn?theme=brandX", cookies: AUTH }),
    );
    expect(res.cookies.get("earn_config_id")?.value).toBe("brandX");
  });

  test("earn_config_id cookie alone forwards x-earn-config-id header", () => {
    const res = middleware(
      makeRequest({
        url: "/earn",
        cookies: { ...AUTH, earn_config_id: "brandY" },
      }),
    );
    expect(isRedirect(res)).toBe(false);
    expect(getForwardedRequestHeader(res, "x-earn-config-id")).toBe("brandY");
  });
});

describe("earn middleware — matcher", () => {
  test("matcher excludes api, _next, favicon", () => {
    expect(middlewareConfig.matcher).toEqual([
      "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ]);
  });
});
