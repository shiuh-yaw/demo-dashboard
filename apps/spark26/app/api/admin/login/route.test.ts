import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/env", () => ({
  env: { SPARK26_ADMIN_SECRET: "correct-password-is-at-least-6-chars" },
}));

const ipLimiterLimit = vi.fn();
vi.mock("@/lib/upstash/ratelimit", () => ({
  ipLimiter: () => ({ limit: ipLimiterLimit }),
}));

beforeEach(() => {
  ipLimiterLimit.mockReset();
  ipLimiterLimit.mockResolvedValue({ success: true });
});

describe("POST /api/admin/login", () => {
  it("400 on missing body", async () => {
    const { POST } = await import("./route.js");
    const res = await POST(new Request("http://x/login", { method: "POST", body: "not-json" }));
    expect(res.status).toBe(400);
  });

  it("401 on wrong password", async () => {
    const { POST } = await import("./route.js");
    const res = await POST(
      new Request("http://x/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: "wrong" }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("200 + Set-Cookie on correct password", async () => {
    const { POST } = await import("./route.js");
    const res = await POST(
      new Request("http://x/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: "correct-password-is-at-least-6-chars" }),
      }),
    );
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/spark26_admin=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
  });

  it("429 when rate-limited", async () => {
    ipLimiterLimit.mockResolvedValueOnce({ success: false });
    const { POST } = await import("./route.js");
    const res = await POST(
      new Request("http://x/login", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
        body: JSON.stringify({ password: "anything" }),
      }),
    );
    expect(res.status).toBe(429);
  });
});
