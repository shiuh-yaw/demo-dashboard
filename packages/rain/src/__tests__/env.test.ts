import { describe, expect, it } from "vitest";

import { RAIN_SANDBOX_BASE_URL, resolveRainBaseUrl } from "../env";

describe("resolveRainBaseUrl", () => {
  it("defaults to the sandbox host when no override is given", () => {
    expect(resolveRainBaseUrl()).toBe(RAIN_SANDBOX_BASE_URL);
    expect(RAIN_SANDBOX_BASE_URL).toBe("https://api-dev.raincards.xyz");
  });

  it("returns a non-empty override unchanged", () => {
    expect(resolveRainBaseUrl("https://api.rain.example")).toBe(
      "https://api.rain.example",
    );
  });

  it("falls back to sandbox for a blank override", () => {
    expect(resolveRainBaseUrl("   ")).toBe(RAIN_SANDBOX_BASE_URL);
  });
});
