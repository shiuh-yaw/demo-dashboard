/**
 * createRequestToInput must stamp createdById alongside ownerId - null when
 * the caller's sub doesn't resolve to an internal User.
 */

import { describe, expect, it } from "vitest";

import { createRequestToInput } from "../prospect-mapper";

describe("createRequestToInput", () => {
  it("stamps createdById when the caller resolved a sub", () => {
    const input = createRequestToInput("owner-1", "user-1", {
      name: "Acme",
    });
    expect(input.ownerId).toBe("owner-1");
    expect(input.createdById).toBe("user-1");
  });

  it("stamps null createdById when the sub doesn't resolve", () => {
    const input = createRequestToInput("owner-1", null, {
      name: "Acme",
    });
    expect(input.createdById).toBeNull();
  });
});
