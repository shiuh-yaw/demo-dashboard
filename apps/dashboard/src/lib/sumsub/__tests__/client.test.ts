/**
 * Tests for the SumSub client factory.
 *
 * Verifies that the factory correctly validates env vars and returns
 * a memoized client instance.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the env module
vi.mock("@/env", () => ({
  env: {
    SUMSUB_APP_TOKEN: "sbx:test-app-token",
    SUMSUB_SECRET_KEY: "test-secret-key",
    SUMSUB_ENVIRONMENT: "sandbox",
  },
}));

// Mock the sumsub package
vi.mock("@dynamic-demos/sumsub", () => ({
  createSumsubClient: vi.fn(() => ({
    createApplicant: vi.fn(),
    generateAccessToken: vi.fn(),
  })),
}));

describe("getSumsubClient", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("creates a client with configured credentials", async () => {
    const { getSumsubClient } = await import("../client");
    const { createSumsubClient } = await import("@dynamic-demos/sumsub");

    getSumsubClient();

    expect(createSumsubClient).toHaveBeenCalledWith({
      appToken: "sbx:test-app-token",
      secretKey: "test-secret-key",
      env: "sandbox",
    });
  });

  it("memoizes the client instance", async () => {
    const { getSumsubClient } = await import("../client");

    const first = getSumsubClient();
    const second = getSumsubClient();

    expect(first).toBe(second);
  });

  it("throws when credentials are missing", async () => {
    vi.doMock("@/env", () => ({
      env: {
        SUMSUB_APP_TOKEN: undefined,
        SUMSUB_SECRET_KEY: undefined,
        SUMSUB_ENVIRONMENT: "sandbox",
      },
    }));

    const { getSumsubClient } = await import("../client");

    expect(() => getSumsubClient()).toThrow(
      "SumSub credentials are not configured",
    );
  });
});
