import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: { SPARK26_ADMIN_SECRET: "super-secret-admin-password-32chars+" },
}));

import {
  signAdminSession,
  verifyAdminSession,
  ADMIN_COOKIE_TTL_MS,
} from "./admin-session.js";

describe("admin-session", () => {
  it("round-trips a signed cookie", () => {
    const now = Date.now();
    const cookie = signAdminSession(now);
    const result = verifyAdminSession(cookie, now + 1000);
    expect(result.ok).toBe(true);
  });

  it("rejects tampered payload", () => {
    const now = Date.now();
    const cookie = signAdminSession(now);
    const tampered = cookie.slice(0, -1) + (cookie.slice(-1) === "a" ? "b" : "a");
    const result = verifyAdminSession(tampered, now + 1000);
    expect(result.ok).toBe(false);
  });

  it("rejects expired cookies", () => {
    const issuedAt = Date.now() - ADMIN_COOKIE_TTL_MS - 1000;
    const cookie = signAdminSession(issuedAt);
    const result = verifyAdminSession(cookie, Date.now());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("expired");
  });

  it("rejects malformed cookie strings", () => {
    expect(verifyAdminSession("not-a-cookie", Date.now()).ok).toBe(false);
    expect(verifyAdminSession("", Date.now()).ok).toBe(false);
    expect(verifyAdminSession("only.one.dot", Date.now()).ok).toBe(false);
  });
});
