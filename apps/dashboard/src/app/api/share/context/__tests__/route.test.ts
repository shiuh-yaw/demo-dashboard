import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const context = vi.hoisted(() => ({ resolveShareContext: vi.fn() }));
vi.mock("@/lib/share-links/context", () => context);

import { GET, OPTIONS } from "../route";

// setup.ts sets TRACK_CORS_ORIGINS=https://wallet.dynamic.dev globally.
const ALLOWED_ORIGIN = "https://wallet.dynamic.dev";

describe("GET /api/share/context", () => {
  it("returns {} with no CORS headers when there's no token and no allowlisted origin", async () => {
    const request = new NextRequest(
      "https://dashboard.dynamic.dev/api/share/context",
    );
    const response = await GET(request);
    expect(await response.json()).toEqual({});
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("returns the resolved context and reflects an allowlisted origin", async () => {
    context.resolveShareContext.mockResolvedValue({
      prospectName: "Acme",
      cta: { label: "Book a call", url: "https://cal.com/jane" },
    });
    const request = new NextRequest(
      "https://dashboard.dynamic.dev/api/share/context?token=tok_123",
      { headers: { origin: ALLOWED_ORIGIN } },
    );
    const response = await GET(request);
    expect(await response.json()).toEqual({
      prospectName: "Acme",
      cta: { label: "Book a call", url: "https://cal.com/jane" },
    });
    expect(response.headers.get("access-control-allow-origin")).toBe(
      ALLOWED_ORIGIN,
    );
  });

  it("omits CORS headers for a non-allowlisted origin", async () => {
    context.resolveShareContext.mockResolvedValue({});
    const request = new NextRequest(
      "https://dashboard.dynamic.dev/api/share/context?token=tok_123",
      { headers: { origin: "https://evil.example" } },
    );
    const response = await GET(request);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("never returns a non-2xx status, even without a token", async () => {
    const request = new NextRequest(
      "https://dashboard.dynamic.dev/api/share/context",
    );
    const response = await GET(request);
    expect(response.status).toBe(200);
  });
});

describe("OPTIONS /api/share/context", () => {
  it("reflects the allowlisted origin on preflight", () => {
    const request = new NextRequest(
      "https://dashboard.dynamic.dev/api/share/context",
      { headers: { origin: ALLOWED_ORIGIN } },
    );
    const response = OPTIONS(request);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      ALLOWED_ORIGIN,
    );
  });

  it("omits CORS headers for a non-allowlisted origin", () => {
    const request = new NextRequest(
      "https://dashboard.dynamic.dev/api/share/context",
      { headers: { origin: "https://evil.example" } },
    );
    const response = OPTIONS(request);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });
});
