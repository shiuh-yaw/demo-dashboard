import { describe, expect, it } from "vitest";
import { updateRequestToInput } from "../prospect-mapper";

describe("updateRequestToInput - companyUrl", () => {
  it("omits the field entirely when not submitted", () => {
    expect("companyUrl" in updateRequestToInput({ name: "Acme" })).toBe(false);
  });

  it("writes null when the field was cleared", () => {
    // The bug this pins: the settings form sent `undefined` for an emptied
    // input, so the field was treated as not-submitted, the stored value
    // survived, and the UI still reported "Changes saved".
    expect(updateRequestToInput({ companyUrl: null }).companyUrl).toBeNull();
  });

  it("writes the value when set", () => {
    expect(
      updateRequestToInput({ companyUrl: "https://acme.com" }).companyUrl,
    ).toBe("https://acme.com");
  });
});
