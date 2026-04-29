import { describe, expect, it, beforeEach, afterEach } from "vitest";

describe("env", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: "env-id",
      DYNAMIC_API_KEY: "dyn_key",
      CVENT_CLIENT_ID: "cvent-id",
      CVENT_CLIENT_SECRET: "cvent-secret",
      CVENT_EVENT_ID: "event-id",
      SPARK26_DESTINATION_ADDRESS: "0x5C260969b90152a46D52BC476C94524C8E796b3d",
      UPSTASH_REDIS_REST_URL: "https://x.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "token",
      QSTASH_TOKEN: "qs-token",
      QSTASH_CURRENT_SIGNING_KEY: "cur-key",
      QSTASH_NEXT_SIGNING_KEY: "next-key",
      CRON_SECRET: "cron-secret-123456",
      SPARK26_ADMIN_SECRET: "admin-secret-1234",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("loads with all required vars present", async () => {
    const { env } = await import("./env.js");
    expect(env.CVENT_EVENT_ID).toBe("event-id");
    expect(env.SPARK26_DESTINATION_ADDRESS).toBe(
      "0x5C260969b90152a46D52BC476C94524C8E796b3d",
    );
    expect(env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID).toBe("env-id");
  });

  it("defaults CVENT_BASE_URL when unset", async () => {
    delete process.env.CVENT_BASE_URL;
    const { env } = await import("./env.js");
    expect(env.CVENT_BASE_URL).toBe("https://api-platform.cvent.com");
  });
});
