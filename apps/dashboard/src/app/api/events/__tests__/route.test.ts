/**
 * Smoke test for the real route module - confirms `route.ts` wires real
 * services + env without crashing at import time, and that the default
 * (empty) `TRACK_CORS_ORIGINS` fails closed. Full pipeline behavior
 * (validation, rate limit, attribution, geo/UA, idempotency, raw-IP
 * hygiene) is covered against fakes in `src/lib/track/handler.test.ts`.
 */

import { describe, expect, it } from "vitest";

import { OPTIONS, POST } from "../route";

describe("/api/events route wiring", () => {
  it("fails closed on POST when TRACK_CORS_ORIGINS is unset (default)", async () => {
    const res = await POST(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: { origin: "https://wallet.example.com" },
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("fails closed on OPTIONS preflight when TRACK_CORS_ORIGINS is unset (default)", async () => {
    const res = await OPTIONS(
      new Request("http://localhost/api/events", {
        method: "OPTIONS",
        headers: { origin: "https://wallet.example.com" },
      }),
    );
    expect(res.status).toBe(403);
  });
});
