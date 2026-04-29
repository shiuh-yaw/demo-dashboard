import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: {
    CVENT_CLIENT_ID: "id",
    CVENT_CLIENT_SECRET: "secret",
    CVENT_EVENT_ID: "ev",
    CVENT_BASE_URL: "https://api-platform.cvent.com",
  },
}));

describe("cventSdk", () => {
  it("returns the same instance on repeat calls", async () => {
    const { cventSdk } = await import("./client.js");
    const a = cventSdk();
    const b = cventSdk();
    expect(a).toBe(b);
  });
});
