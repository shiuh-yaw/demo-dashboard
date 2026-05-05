/**
 * Tests for the LI.FI webhook placeholders.
 *
 * LI.FI does not deliver webhooks today (see `webhooks.ts`). This test
 * pins the placeholder behaviour so a future agent who adds real
 * verification has to update both the package and this test in the same
 * commit, instead of accidentally regressing the contract.
 */

import { describe, expect, it } from "vitest";
import * as webhooks from "./webhooks";

describe("webhooks placeholders", () => {
  it("verifySignature always returns valid: false with a stable reason", () => {
    const result = webhooks.verifySignature({
      headers: {},
      body: "{}",
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("lifi-does-not-deliver-webhooks");
  });

  it("normalize returns null for any payload", () => {
    expect(webhooks.normalize({ id: "evt_123" })).toBeNull();
    expect(webhooks.normalize(null)).toBeNull();
  });
});
