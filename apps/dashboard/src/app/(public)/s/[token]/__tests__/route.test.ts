import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const resolveRedirect = vi.hoisted(() => ({
  resolveShareRedirectUrl: vi.fn(),
}));
vi.mock("@/lib/share-links/resolve-redirect", () => resolveRedirect);

import { GET } from "../route";

describe("GET /s/[token]", () => {
  it("redirects to the fully-resolved branded URL for an active token", async () => {
    resolveRedirect.resolveShareRedirectUrl.mockResolvedValue(
      "https://wallet.dynamic.dev/?share=tok_123&theme=prospect_1",
    );
    const request = new NextRequest("https://dashboard.dynamic.dev/s/tok_123");
    const response = await GET(request, {
      params: Promise.resolve({ token: "tok_123" }),
    });
    expect(response.headers.get("location")).toBe(
      "https://wallet.dynamic.dev/?share=tok_123&theme=prospect_1",
    );
  });

  it("redirects to the dashboard's own / when the token can't identify a demo", async () => {
    resolveRedirect.resolveShareRedirectUrl.mockResolvedValue("/");
    const request = new NextRequest("https://dashboard.dynamic.dev/s/unknown");
    const response = await GET(request, {
      params: Promise.resolve({ token: "unknown" }),
    });
    expect(response.headers.get("location")).toBe(
      "https://dashboard.dynamic.dev/",
    );
  });

  it("never 404s - always issues a redirect response", async () => {
    resolveRedirect.resolveShareRedirectUrl.mockResolvedValue("/");
    const request = new NextRequest("https://dashboard.dynamic.dev/s/x");
    const response = await GET(request, {
      params: Promise.resolve({ token: "x" }),
    });
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
  });
});
