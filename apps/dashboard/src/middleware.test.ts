import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { middleware } from "./middleware";

function req(path: string, method = "GET"): NextRequest {
  return new NextRequest(`http://localhost:4001${path}`, { method });
}

describe("api CORS middleware", () => {
  it("wildcards non-tracker API routes", () => {
    const res = middleware(req("/api/orchestrate/quote"));
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("answers OPTIONS preflight for non-tracker routes with the wildcard", () => {
    const res = middleware(req("/api/orchestrate/quote", "OPTIONS"));
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("never wildcards the tracker ingest endpoint (handler owns CORS)", () => {
    const res = middleware(req("/api/events", "OPTIONS"));
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("never wildcards the share-context endpoint (handler owns CORS)", () => {
    const res = middleware(req("/api/share/context"));
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});
