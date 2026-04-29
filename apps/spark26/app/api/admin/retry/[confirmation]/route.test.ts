import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/env", () => ({
  env: { SPARK26_ADMIN_SECRET: "super-secret-admin-password" },
}));

const runCventPostback = vi.fn();
vi.mock("@/lib/cvent/postback", () => ({ runCventPostback }));

import { signAdminSession, ADMIN_COOKIE_NAME } from "@/lib/auth/admin-session";

function reqWithCookie(url: string): Request {
  const cookie = signAdminSession();
  return new Request(url, {
    method: "POST",
    headers: { cookie: `${ADMIN_COOKIE_NAME}=${cookie}` },
  });
}

beforeEach(() => runCventPostback.mockReset());

describe("POST /api/admin/retry/[confirmation]", () => {
  it("401 without cookie", async () => {
    const { POST } = await import("./route.js");
    const res = await POST(
      new Request("http://x/retry/ABC", { method: "POST" }),
      { params: Promise.resolve({ confirmation: "ABC" }) },
    );
    expect(res.status).toBe(401);
    expect(runCventPostback).not.toHaveBeenCalled();
  });

  it("400 on malformed confirmation", async () => {
    const { POST } = await import("./route.js");
    const res = await POST(reqWithCookie("http://x/retry/bad!"), {
      params: Promise.resolve({ confirmation: "bad!" }),
    });
    expect(res.status).toBe(400);
    expect(runCventPostback).not.toHaveBeenCalled();
  });

  it("calls runCventPostback and returns the result", async () => {
    runCventPostback.mockResolvedValue({ ok: true });
    const { POST } = await import("./route.js");
    const res = await POST(reqWithCookie("http://x/retry/ABC123"), {
      params: Promise.resolve({ confirmation: "ABC123" }),
    });
    expect(res.status).toBe(200);
    expect(runCventPostback).toHaveBeenCalledWith("ABC123");
    expect(await res.json()).toEqual({ ok: true });
  });

  it("returns 502 when runCventPostback reports failure", async () => {
    runCventPostback.mockResolvedValue({
      ok: false,
      retry: true,
      error: "500 Cvent",
    });
    const { POST } = await import("./route.js");
    const res = await POST(reqWithCookie("http://x/retry/ABC123"), {
      params: Promise.resolve({ confirmation: "ABC123" }),
    });
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/Cvent/);
  });
});
