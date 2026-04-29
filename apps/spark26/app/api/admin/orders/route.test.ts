import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: { SPARK26_ADMIN_SECRET: "super-secret-admin-password" },
}));

const listAllOrders = vi.fn();
vi.mock("@/lib/store/all-orders", () => ({ listAllOrders }));

import { signAdminSession, ADMIN_COOKIE_NAME } from "@/lib/auth/admin-session";

function withAdminCookie(url: string): Request {
  const cookie = signAdminSession();
  return new Request(url, { headers: { cookie: `${ADMIN_COOKIE_NAME}=${cookie}` } });
}

describe("GET /api/admin/orders", () => {
  it("401 without cookie", async () => {
    const { GET } = await import("./route.js");
    const res = await GET(new Request("http://x/orders"));
    expect(res.status).toBe(401);
  });

  it("401 with invalid cookie", async () => {
    const { GET } = await import("./route.js");
    const req = new Request("http://x/orders", {
      headers: { cookie: `${ADMIN_COOKIE_NAME}=not-a-valid-cookie` },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns orders JSON with valid cookie", async () => {
    listAllOrders.mockResolvedValue([
      { confirmationNumber: "A", status: "paid" },
      { confirmationNumber: "B", status: "tx_confirmed" },
    ]);
    const { GET } = await import("./route.js");
    const res = await GET(withAdminCookie("http://x/orders"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.orders).toHaveLength(2);
  });
});
