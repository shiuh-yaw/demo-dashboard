import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: {
    CVENT_CLIENT_ID: "id",
    CVENT_CLIENT_SECRET: "secret",
    CVENT_EVENT_ID: "ev",
    CVENT_BASE_URL: "https://api-platform.cvent.com",
  },
}));

// The real @cvent/sdk is a generated barrel (~4k ESM modules, zod schemas
// evaluated at import time). Its first import happens inside the timed test
// body via `await import("./client.js")` and can exceed the 5s per-test
// timeout on a loaded CI runner. This test only asserts singleton semantics,
// so stub the constructor — no SDK behavior is under test here.
vi.mock("@cvent/sdk", () => ({
  CventSDK: class CventSDK {},
}));

describe("cventSdk", () => {
  it("returns the same instance on repeat calls", async () => {
    const { cventSdk } = await import("./client.js");
    const a = cventSdk();
    const b = cventSdk();
    expect(a).toBe(b);
  });
});
