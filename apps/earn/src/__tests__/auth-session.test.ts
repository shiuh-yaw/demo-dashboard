/**
 * Characterization tests for apps/earn/src/lib/auth/session.ts.
 *
 * The session module is server-side ("use server") and depends on
 * `next/headers`, which can't be exercised in a vanilla node test runner
 * without significant mocking. Instead, this lock-test asserts the file's
 * shape: the cookie name, default max-age fallback, exported function names,
 * and the cookie attributes (httpOnly, secure conditional, sameSite).
 *
 * Phase 1D will consolidate this module into @dynamic-demos/dynamic. Any
 * rename of the cookie or attribute change must update this test, which
 * forces a conscious decision.
 */

import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SESSION_PATH = resolve(__dirname, "../lib/auth/session.ts");
const source = readFileSync(SESSION_PATH, "utf8");

describe("earn auth/session — module shape", () => {
  test('file declares "use server" directive', () => {
    expect(source).toMatch(/^"use server";/);
  });

  test('cookie name is "dynamic_jwt"', () => {
    expect(source).toContain('"dynamic_jwt"');
    expect(source).toContain(
      'const DYNAMIC_JWT_COOKIE_NAME = "dynamic_jwt"',
    );
  });

  test("default max-age fallback is 7 days (60 * 60 * 24 * 7)", () => {
    expect(source).toContain("const DEFAULT_COOKIE_MAX_AGE = 60 * 60 * 24 * 7");
  });

  test("cookie set with httpOnly, sameSite=lax, path=/", () => {
    expect(source).toMatch(/httpOnly:\s*true/);
    expect(source).toMatch(/sameSite:\s*"lax"/);
    expect(source).toMatch(/path:\s*"\/"/);
  });

  test('cookie secure flag is conditional on env.NODE_ENV === "production"', () => {
    expect(source).toMatch(
      /secure:\s*env\.NODE_ENV\s*===\s*"production"/,
    );
  });

  test("exports the documented surface", () => {
    expect(source).toMatch(/export async function isAuthenticated\(/);
    expect(source).toMatch(/export async function setDynamicJWT\(/);
    expect(source).toMatch(/export async function clearDashboardAuth\(/);
    expect(source).toMatch(/export async function getCurrentUser\(/);
    expect(source).toMatch(/export async function clearExpiredToken\(/);
  });

  test("uses verifyDynamicJWT + getJWTFromCookies from @dynamic-demos/dynamic", () => {
    expect(source).toMatch(
      /from\s+"@dynamic-demos\/dynamic"/,
    );
    expect(source).toContain("verifyDynamicJWT");
    expect(source).toContain("getJWTFromCookies");
  });
});
