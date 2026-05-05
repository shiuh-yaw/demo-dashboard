import { describe, it, expect } from "vitest";

import { mapCoinbaseOnrampStatus } from "../state-mapping";

describe("mapCoinbaseOnrampStatus", () => {
  it.each([
    ["pending", "submitted"],
    ["in_progress", "pending"],
    ["completed", "confirmed"],
    ["failed", "failed"],
    ["cancelled", "cancelled"],
    ["expired", "expired"],
  ])("maps %s -> %s", (input, expected) => {
    expect(mapCoinbaseOnrampStatus(input)).toBe(expected);
  });

  it("returns null for unknown statuses", () => {
    expect(mapCoinbaseOnrampStatus("totally-made-up")).toBeNull();
  });
});
