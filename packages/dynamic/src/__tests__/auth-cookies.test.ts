/**
 * Tests for setDynamicJwtCookie / clearDynamicJwtCookie / getJwtMaxAgeSeconds.
 *
 * The cookie store interface mirrors next/headers `cookies()`:
 *   - .set(name, value, options)
 *   - .delete(name)
 *
 * Tests use a minimal in-memory store rather than spinning up Next.js.
 */

import { describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import {
  clearDynamicJwtCookie,
  getJwtMaxAgeSeconds,
  setDynamicJwtCookie,
} from "../auth-cookies";

interface InMemoryCookie {
  value: string;
  options?: Record<string, unknown>;
}

class InMemoryCookieStore {
  private store = new Map<string, InMemoryCookie>();
  set(name: string, value: string, options?: Record<string, unknown>): void {
    this.store.set(name, { value, options });
  }
  get(name: string): InMemoryCookie | undefined {
    return this.store.get(name);
  }
  delete(name: string): void {
    this.store.delete(name);
  }
}

describe("getJwtMaxAgeSeconds", () => {
  it("returns the JWT's remaining lifetime when exp is set", () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = jwt.sign({ exp: futureExp }, "secret");
    const seconds = getJwtMaxAgeSeconds(token);
    expect(seconds).toBeGreaterThan(3500);
    expect(seconds).toBeLessThanOrEqual(3600);
  });

  it("clamps to a minimum of 60 seconds for nearly-expired tokens", () => {
    const exp = Math.floor(Date.now() / 1000) + 5;
    const token = jwt.sign({ exp }, "secret");
    expect(getJwtMaxAgeSeconds(token)).toBe(60);
  });

  it("clamps to a maximum of 7 days for very long-lived tokens", () => {
    const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365;
    const token = jwt.sign({ exp }, "secret");
    expect(getJwtMaxAgeSeconds(token)).toBe(60 * 60 * 24 * 7);
  });

  it("falls back to 7 days when no exp claim is present", () => {
    const token = jwt.sign({}, "secret", { noTimestamp: true });
    expect(getJwtMaxAgeSeconds(token)).toBe(60 * 60 * 24 * 7);
  });
});

describe("setDynamicJwtCookie", () => {
  it("sets the cookie with httpOnly and sameSite=lax", async () => {
    const store = new InMemoryCookieStore();
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = jwt.sign({ exp }, "secret");

    await setDynamicJwtCookie(store, token);

    const cookie = store.get("dynamic_jwt");
    expect(cookie?.value).toBe(token);
    expect(cookie?.options?.httpOnly).toBe(true);
    expect(cookie?.options?.sameSite).toBe("lax");
    expect(cookie?.options?.path).toBe("/");
  });

  it("respects a custom cookie name", async () => {
    const store = new InMemoryCookieStore();
    const token = jwt.sign({}, "secret");
    await setDynamicJwtCookie(store, token, { cookieName: "custom_jwt" });
    expect(store.get("custom_jwt")?.value).toBe(token);
  });
});

describe("clearDynamicJwtCookie", () => {
  it("removes the cookie", async () => {
    const store = new InMemoryCookieStore();
    store.set("dynamic_jwt", "tok");
    await clearDynamicJwtCookie(store);
    expect(store.get("dynamic_jwt")).toBeUndefined();
  });
});
